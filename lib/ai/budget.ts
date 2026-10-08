import 'server-only'

import { createHash } from 'node:crypto'

import { readSupabaseEnv } from '@/lib/supabase/env'

/**
 * How much of the assistant one person, and everybody together, gets per day.
 *
 * The OpenAI project has a hard $5 roof, which is what stops a catastrophe.
 * These are what stop an ordinary expensive Tuesday: one bored visitor cannot
 * drain the month, one runaway loop cannot drain a day.
 *
 * The numbers live here and are passed to the database function, so there is
 * one place to change them and no copy in SQL to forget.
 */
export const LIMITS = {
  chatsPerVisitorPerDay: 3,
  messagesPerChat: 12,
  messagesPerVisitorPerDay: 25,
  /** Everybody, all day. A bad day costs a fraction of the month. */
  messagesGlobalPerDay: 400,
} as const

export type BudgetRefusal = 'global' | 'visitorDay' | 'chat' | 'chatsPerDay' | 'unconfigured'

export type BudgetResult = { ok: true } | { ok: false; reason: BudgetRefusal }

/**
 * Who is asking, without knowing who is asking.
 *
 * A hash of IP and user agent, salted with the job secret and the date, so it
 * rotates at midnight and cannot be reversed into either. It identifies a
 * visitor for as long as a daily limit needs to mean anything, and no longer.
 */
export function visitorHash(request: Request, secret: string, now = new Date()): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  const agent = request.headers.get('user-agent') ?? 'unknown'
  const day = now.toISOString().slice(0, 10)
  return createHash('sha256').update(`${day}:${secret}:${ip}:${agent}`).digest('hex').slice(0, 32)
}

/**
 * Takes one message from the budget. Everything is checked and incremented in
 * one statement in the database, so two requests arriving together cannot both
 * be the last one through.
 */
export async function takeFromBudget(visitor: string, chat: string): Promise<BudgetResult> {
  const env = readSupabaseEnv()
  const secret = process.env.AI_JOB_SECRET
  if (!env || !secret) return { ok: false, reason: 'unconfigured' }

  const response = await fetch(`${env.url}/rest/v1/rpc/ai_budget_take`, {
    method: 'POST',
    headers: {
      apikey: env.publishableKey,
      Authorization: `Bearer ${env.publishableKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      candidate: secret,
      // Named for the column they are compared against, not for the concept:
      // `visitor` collided with private.ai_usage.visitor inside the function.
      visitor_hash: visitor,
      chat_id: chat,
      max_chats_per_day: LIMITS.chatsPerVisitorPerDay,
      max_messages_per_chat: LIMITS.messagesPerChat,
      max_messages_per_day: LIMITS.messagesPerVisitorPerDay,
      max_messages_global: LIMITS.messagesGlobalPerDay,
    }),
  })

  // A counter that cannot be reached is a reason to refuse, not to spend: an
  // unreachable database must not become an unlimited assistant.
  if (!response.ok) return { ok: false, reason: 'unconfigured' }

  const rows = (await response.json()) as { allowed: boolean; reason: string }[]
  const row = rows[0]
  if (!row) return { ok: false, reason: 'unconfigured' }
  return row.allowed ? { ok: true } : { ok: false, reason: row.reason as BudgetRefusal }
}

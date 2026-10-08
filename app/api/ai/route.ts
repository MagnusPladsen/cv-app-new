import { NextResponse } from 'next/server'

import { takeFromBudget, visitorHash } from '@/lib/ai/budget'
import { modelFor } from '@/lib/ai/models'
import { ask } from '@/lib/ai/openai'
import { askSchema, type Target } from '@/lib/ai/request'
import { NATIONAL_ID } from '@/lib/quality/checks'
import { callerKey, rateLimit } from '@/lib/security/rate-limit'

/**
 * The assistant's one door, and the only place the OpenAI key exists.
 *
 * This is the first route handler in the app that reads a request body, and
 * that is a privacy decision rather than a technical one. Read
 * lib/privacy/__tests__/no-server-cv.test.ts and docs/privacy/ropa.md before
 * widening it: CV *content* reaches a server here, deliberately, only for the
 * text a person pressed a button to send, with their name, email, phone and
 * place already replaced in the browser by lib/ai/redact.ts.
 *
 * What this function must never accept is a whole document. There is no field
 * for one in lib/ai/request.ts, the measured facts arrive as three numbers and
 * a list of check ids, and a request carrying anything else is refused rather
 * than trimmed.
 *
 * Order of business, and it matters: rate limit, then budget, then validate,
 * then spend money. The cheap refusals come first.
 */
export const dynamic = 'force-dynamic'

/** The targets, as one line the model can point at. Labels carry no names. */
function describeTargets(targets: Target[]): string {
  if (targets.length === 0) return ''
  const lines = targets.map((target) => {
    const parts = [
      `kind=${target.kind}`,
      target.sectionId ? `sectionId=${target.sectionId}` : '',
      target.entryId ? `entryId=${target.entryId}` : '',
      target.index === undefined ? '' : `index=${target.index}`,
    ].filter(Boolean)
    return `- ${target.label}: ${parts.join(' ')}`
  })
  return `\n\nForslag kan bare peke på ett av disse stedene, med feltene nøyaktig som oppgitt:\n${lines.join('\n')}`
}

export async function POST(request: Request) {
  // First line, in memory, per instance: it does not stop a distributed flood,
  // it stops one tab in a loop before the database is even asked.
  const limited = rateLimit(callerKey(request, 'ai'), { limit: 12, windowMs: 60_000 })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'rateLimited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } },
    )
  }

  const secret = process.env.AI_JOB_SECRET
  if (!process.env.OPENAI_API_KEY || !secret) {
    // No key means no assistant. The UI hides itself rather than offering a
    // button that cannot work.
    return NextResponse.json({ error: 'unconfigured' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'badRequest' }, { status: 400 })
  }

  const parsed = askSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'badRequest' }, { status: 400 })
  const askBody = parsed.data

  // The browser refuses this too, in lib/ai/redact.ts. Checked again here
  // because a fødselsnummer reaching OpenAI is the one mistake in this file
  // that cannot be taken back afterwards.
  const everything = [askBody.message, ...askBody.history.map((turn) => turn.content)].join('\n')
  if (NATIONAL_ID.test(everything)) {
    return NextResponse.json({ error: 'nationalId' }, { status: 400 })
  }

  const budget = await takeFromBudget(visitorHash(request, secret), askBody.chatId)
  if (!budget.ok) {
    const status = budget.reason === 'unconfigured' ? 503 : 429
    return NextResponse.json({ error: 'budget', reason: budget.reason }, { status })
  }

  const turns = [
    ...askBody.history.map((turn) => ({ role: turn.role, content: turn.content })),
    {
      role: 'user' as const,
      content: `${askBody.message}${describeTargets(askBody.targets)}`,
    },
  ]

  const reply = await ask(modelFor(askBody.task), turns, {
    facts: askBody.facts,
    locale: askBody.locale,
  })

  if (!reply.ok) {
    const status = reply.reason === 'unconfigured' ? 503 : 502
    return NextResponse.json({ error: reply.reason }, { status })
  }

  // Usage goes back so the editor can show what a question cost, and so a
  // cache that has quietly stopped working is visible without a dashboard.
  return NextResponse.json({
    answer: reply.answer.answer,
    suggestions: reply.answer.suggestions,
    model: reply.model,
    usage: reply.usage,
  })
}

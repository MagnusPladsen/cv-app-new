import 'server-only'

import { buildInstructions } from '@/lib/ai/prompt'
import { PROMPT_CACHE_KEY, fallbackFor, type ModelChoice } from '@/lib/ai/models'
import { ANSWER_FORMAT, answerSchema, type Answer } from '@/lib/ai/suggestions'
import { TOOL_DEFS, runTool, type ToolContext } from '@/lib/ai/tools'

/**
 * One question, through the Responses API, with the tool loop closed here.
 *
 * The loop is bounded at three rounds. A model that keeps asking for the page
 * count has either misunderstood the question or found a way to spend money,
 * and both end the same way: whatever prose it has produced, returned as is.
 */

const ENDPOINT = 'https://api.openai.com/v1/responses'
const MAX_ROUNDS = 3

export type AiUsage = { input: number; cached: number; output: number }

export type AiReply =
  | { ok: true; answer: Answer; model: string; usage: AiUsage }
  | { ok: false; reason: 'unconfigured' | 'upstream' | 'empty' }

type OutputItem =
  | { type: 'function_call'; name: string; call_id: string; arguments?: string }
  | { type: 'message'; content?: { text?: string }[] }
  | { type: string }

/** The model's own words, out of whichever message items it produced. */
function textOf(output: OutputItem[]): string {
  return output
    .filter((item): item is { type: 'message'; content?: { text?: string }[] } => {
      return item.type === 'message'
    })
    .flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim()
}

/**
 * Reading an answer out of JSON that stopped halfway.
 *
 * Hitting the output ceiling mid-object leaves valid prose inside an invalid
 * document, and showing somebody `{"answer":"Her er de viktigste...` is worse
 * than showing them nothing. Falls back to the raw text when there is no
 * `answer` field to find, which is the prose case.
 */
function salvage(text: string): string {
  if (!text.startsWith('{')) return text
  const match = /"answer"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(text)
  if (!match) return text
  try {
    return JSON.parse(`"${match[1]}"`) as string
  } catch {
    return text
  }
}

async function post(body: unknown, key: string) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  return response.json() as Promise<{
    error?: { message: string }
    output?: OutputItem[]
    usage?: {
      input_tokens?: number
      output_tokens?: number
      input_tokens_details?: { cached_tokens?: number }
    }
  }>
}

async function run(choice: ModelChoice, turns: unknown[], context: ToolContext): Promise<AiReply> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { ok: false, reason: 'unconfigured' }

  const input = [...turns]
  const usage: AiUsage = { input: 0, cached: 0, output: 0 }

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const data = await post(
      {
        model: choice.model,
        // Constant, and first: this is the cached prefix.
        instructions: buildInstructions(),
        input,
        tools: TOOL_DEFS,
        text: { format: ANSWER_FORMAT },
        reasoning: { effort: choice.effort },
        max_output_tokens: choice.maxOutputTokens,
        prompt_cache_key: PROMPT_CACHE_KEY,
        prompt_cache_retention: '24h',
        // Nothing is kept on OpenAI's side. The policy says so, so the flag
        // has to say so too.
        store: false,
      },
      key,
    )

    if (data.error) return { ok: false, reason: 'upstream' }

    usage.input += data.usage?.input_tokens ?? 0
    usage.cached += data.usage?.input_tokens_details?.cached_tokens ?? 0
    usage.output += data.usage?.output_tokens ?? 0

    const output = data.output ?? []
    const calls = output.filter(
      (item): item is { type: 'function_call'; name: string; call_id: string; arguments?: string } =>
        item.type === 'function_call',
    )

    if (calls.length === 0) {
      const text = textOf(output)
      if (!text) return { ok: false, reason: 'empty' }

      // The model was asked for JSON. When it answers in prose anyway, the
      // prose is still a usable answer - it just carries no suggestions.
      let answer: Answer
      try {
        answer = answerSchema.parse(JSON.parse(text))
      } catch {
        answer = { answer: salvage(text), suggestions: [] }
      }
      return { ok: true, answer, model: choice.model, usage }
    }

    for (const call of calls) {
      let args: unknown = null
      try {
        args = call.arguments ? JSON.parse(call.arguments) : null
      } catch {
        args = null
      }
      input.push(call)
      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(runTool(call.name, args, context)),
      })
    }
  }

  return { ok: false, reason: 'empty' }
}

/**
 * Asks the model chosen for the task, and the other one if the first is
 * unavailable. A refusal to spend - no key, or a hard upstream error twice -
 * is reported, never retried in a loop.
 */
export async function ask(
  choice: ModelChoice,
  turns: unknown[],
  context: ToolContext,
): Promise<AiReply> {
  const first = await run(choice, turns, context)
  if (first.ok || first.reason === 'unconfigured') return first
  return run(fallbackFor(choice), turns, context)
}

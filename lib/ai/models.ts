/**
 * Which model does which job, and how hard it is allowed to think.
 *
 * Two models, picked by what they are actually good at rather than by price:
 *
 * - **gpt-6-luna** writes one concrete line and asks for the number it is
 *   missing. That is exactly the shape an "Apply to form" button needs, so it
 *   does the inline work: rewriting a bullet, drafting a summary, sorting the
 *   lines an import could not place.
 * - **gpt-5-mini** writes at length, offers alternatives and asks follow-up
 *   questions. Wrong for a one-press suggestion, right for a conversation and
 *   for a cover letter, so it does the chat and the long drafting.
 *
 * Effort was measured, not guessed - see docs/ai/bakeoff-2026-10-08.md. On a
 * bullet rewrite, `medium` spent 112 reasoning tokens to produce the same
 * sentence as `low`. On a cover letter it produced a visibly better one, with
 * a greeting, bracketed placeholders and a sign-off. So: `low` everywhere
 * except the letter.
 */

export type AiTask = 'chat' | 'review' | 'bullet' | 'summary' | 'coverLetter' | 'sortLeftovers'

export type ModelChoice = {
  model: 'gpt-6-luna' | 'gpt-5-mini'
  effort: 'low' | 'medium'
  /** Ceiling for one answer. A runaway reply is refused, not billed. */
  maxOutputTokens: number
}

const CHOICES: Record<AiTask, ModelChoice> = {
  bullet: { model: 'gpt-6-luna', effort: 'low', maxOutputTokens: 300 },
  summary: { model: 'gpt-6-luna', effort: 'low', maxOutputTokens: 400 },
  sortLeftovers: { model: 'gpt-6-luna', effort: 'low', maxOutputTokens: 600 },
  chat: { model: 'gpt-5-mini', effort: 'low', maxOutputTokens: 700 },
  // Reading several passages and saying which ones are weak is the longest
  // thing the assistant does, and the one most worth getting right. Same
  // model as the chat, more room to answer in.
  // Measured, not guessed: at 1100 a review of six passages ran out of room
  // mid-JSON, the parse failed and the fallback showed the raw object. The
  // prose is capped by the prompt; this is the ceiling the suggestions need.
  review: { model: 'gpt-5-mini', effort: 'low', maxOutputTokens: 1800 },
  coverLetter: { model: 'gpt-5-mini', effort: 'medium', maxOutputTokens: 900 },
}

/** The other model, used when the first one errors or is unavailable. */
const FALLBACK: Record<ModelChoice['model'], ModelChoice['model']> = {
  'gpt-6-luna': 'gpt-5-mini',
  'gpt-5-mini': 'gpt-6-luna',
}

export function modelFor(task: AiTask): ModelChoice {
  return CHOICES[task]
}

export function fallbackFor(choice: ModelChoice): ModelChoice {
  return { ...choice, model: FALLBACK[choice.model] }
}

/**
 * One key for every request, so the cached prefix is shared across users
 * rather than per session. Bump it when the rules or the knowledge change -
 * a stale cache would otherwise serve yesterday's instructions.
 */
export const PROMPT_CACHE_KEY = 'cvapp-assistant-v3'

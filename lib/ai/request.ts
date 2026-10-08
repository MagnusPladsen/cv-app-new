import { z } from 'zod'

import { factsSchema } from '@/lib/ai/tools'

/**
 * What the browser is allowed to send, and nothing more.
 *
 * Every field here is either a number the app measured, an identifier the app
 * generated, or text the person typed and then pressed a button to send. There
 * is no field for a name, an email address or a photo, and the request is
 * refused rather than trimmed when something arrives that does not fit - a
 * silently dropped field is how a privacy claim stops being true.
 */

/**
 * The places a suggestion may land, chosen by the browser before it asks.
 *
 * The model picks from this list; it cannot address anything that is not on
 * it. So a suggestion can only ever point at the thing the person was already
 * editing, and "Apply" writes to a target the browser named itself.
 */
export const targetSchema = z.object({
  kind: z.enum(['bullet', 'summary', 'coverLetter', 'field']),
  sectionId: z.string().max(60).optional(),
  entryId: z.string().max(60).optional(),
  index: z.number().int().min(0).max(40).optional(),
  /** What to call it in the answer. "Punkt 2 under Utvikler" - no employer. */
  label: z.string().max(80),
})

export type Target = z.infer<typeof targetSchema>

/**
 * One piece of the CV, sent only when the person pressed "check my CV".
 *
 * A review cannot be done from three numbers: to say a bullet is weak, the
 * assistant has to read the bullet. So this exists, and it is the whole of the
 * widening - it carries text the person wrote about themselves, already
 * scrubbed, and never an employer, a referee, a photograph or a contact
 * detail. `lib/ai/context.ts` decides what goes in; this is the ceiling.
 */
export const passageSchema = z.object({
  kind: z.enum(['title', 'summary', 'bullet', 'role', 'items', 'coverLetter']),
  sectionId: z.string().max(60).optional(),
  entryId: z.string().max(60).optional(),
  index: z.number().int().min(0).max(40).optional(),
  /** What to call it. "Punkt 2 i jobb 1", never the employer */
  label: z.string().max(80),
  text: z.string().max(400),
})

export type Passage = z.infer<typeof passageSchema>

const turnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
})

export const askSchema = z.object({
  task: z.enum(['chat', 'review', 'bullet', 'summary', 'coverLetter', 'sortLeftovers']),
  locale: z.enum(['no', 'en']),
  /** Groups messages into one conversation for the per-chat limit. */
  chatId: z.string().min(8).max(64),
  message: z.string().min(1).max(4000),
  facts: factsSchema,
  targets: z.array(targetSchema).max(20).default([]),
  /**
   * The CV's own text, for a review. Empty for every other task, and capped
   * here rather than trusted: forty passages of four hundred characters is a
   * long CV and a bounded request.
   */
  passages: z.array(passageSchema).max(40).default([]),
  /** Earlier turns of this chat, scrubbed the same way. */
  history: z.array(turnSchema).max(12).default([]),
})

export type Ask = z.infer<typeof askSchema>

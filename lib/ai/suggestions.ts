import { z } from 'zod'

/**
 * What the assistant is allowed to hand back as a change.
 *
 * The model never writes to a CV. It returns one of these, the UI shows the
 * old value beside the new one, and pressing Apply writes exactly this object
 * and nothing else. Anything that does not parse is shown as prose instead -
 * a malformed suggestion is a non-event, not a half-applied edit.
 */

export const suggestionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('bullet'),
    sectionId: z.string(),
    entryId: z.string(),
    index: z.number().int().min(0),
    value: z.string().min(1).max(400),
    why: z.string().max(200),
  }),
  z.object({
    kind: z.literal('summary'),
    sectionId: z.string(),
    value: z.string().min(1).max(1200),
    why: z.string().max(200),
  }),
  z.object({
    kind: z.literal('coverLetter'),
    field: z.enum(['body', 'greeting', 'closing']),
    value: z.string().min(1).max(4000),
    why: z.string().max(200),
  }),
  z.object({
    kind: z.literal('field'),
    path: z.enum(['personalia.title']),
    value: z.string().min(1).max(120),
    why: z.string().max(200),
  }),
])

export type Suggestion = z.infer<typeof suggestionSchema>

export const answerSchema = z.object({
  /** Plain language, the part a person reads. */
  answer: z.string().max(4000),
  /** Zero or more changes, each applied on its own press. */
  suggestions: z.array(suggestionSchema).max(5).default([]),
})

export type Answer = z.infer<typeof answerSchema>

/** The JSON shape handed to the model, kept in step with the schema above. */
export const ANSWER_FORMAT = {
  type: 'json_schema' as const,
  name: 'cvapp_answer',
  strict: false,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['answer'],
    properties: {
      answer: { type: 'string', description: 'Svaret i klartekst, på brukerens språk.' },
      suggestions: {
        type: 'array',
        description: 'Konkrete endringer brukeren kan trykke på. Tom liste når svaret bare er råd.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'value', 'why'],
          properties: {
            kind: { type: 'string', enum: ['bullet', 'summary', 'coverLetter', 'field'] },
            sectionId: { type: 'string' },
            entryId: { type: 'string' },
            index: { type: 'integer' },
            field: { type: 'string', enum: ['body', 'greeting', 'closing'] },
            path: { type: 'string', enum: ['personalia.title'] },
            value: { type: 'string' },
            why: { type: 'string', description: 'Én linje om hvorfor dette er bedre.' },
          },
        },
      },
    },
  },
}

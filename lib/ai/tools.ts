import { z } from 'zod'

import en from '@/messages/en.json'
import no from '@/messages/no.json'

/**
 * The only things the assistant is allowed to know as fact.
 *
 * It cannot count pages and it cannot judge a CV, because both of those are
 * already done - by `countPages` in lib/print/paper.ts and `checkDocument` in
 * lib/quality/checks.ts, the same functions the editor shows the user. The
 * browser runs them, sends the answers, and these tools read them back out.
 *
 * So the model never does arithmetic, and the server never needs a CV to
 * answer "how many pages am I on". It gets three numbers and a list of check
 * ids, which is all the question needed.
 */

export const findingFactSchema = z.object({
  id: z.string().max(60),
  severity: z.enum(['error', 'warning', 'info']),
  sectionId: z.string().max(60).optional(),
})

/** What the browser measured, sent with the question. No CV text. */
export const factsSchema = z.object({
  pages: z.number().int().min(0).max(50),
  paper: z.enum(['a4', 'letter']),
  findings: z.array(findingFactSchema).max(40).default([]),
})

export type Facts = z.infer<typeof factsSchema>

const HELP = { no: no.help, en: en.help } as const

export type HelpTopic = keyof typeof HELP.no

const HELP_TOPICS = Object.keys(HELP.no).filter(
  (key) => key !== 'open' && key !== 'close',
) as HelpTopic[]

/**
 * The tool definitions, in the Responses API's flattened shape: name,
 * description and parameters at the top level of the object rather than nested
 * under `function`. Part of the cached prefix, so the order is fixed.
 *
 * There is deliberately no knowledge lookup tool. The whole of
 * lib/ai/knowledge.ts is already in the instructions, and a tool that returns
 * a slice of what the model is holding is a round trip paid for twice.
 */
export const TOOL_DEFS = [
  {
    type: 'function' as const,
    name: 'page_count',
    description:
      'Hvor mange sider CV-en er på nå, målt av appen selv. Bruk denne i stedet for å gjette.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function' as const,
    name: 'quality_check',
    description:
      'Appens egen kvalitetssjekk av CV-en: hva som mangler og hva som bør fikses. Bruk denne i stedet for å vurdere selv.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function' as const,
    name: 'help_topic',
    description:
      'Appens egen forklaring av én del av CV-en, den samme teksten brukeren ser bak spørsmålstegnet. Bruk denne når spørsmålet handler om hva en del er til for.',
    parameters: {
      type: 'object',
      properties: { topic: { type: 'string', enum: HELP_TOPICS } },
      required: ['topic'],
      additionalProperties: false,
    },
    strict: true,
  },
]

export type ToolContext = { facts: Facts; locale: 'no' | 'en' }

/**
 * Answers one tool call. Pure: it reads the facts the browser sent and the
 * help text in the repo, and reaches nothing else. A name it does not know
 * gets an error object rather than a throw, because a model inventing a tool
 * name should cost one round trip, not a 500.
 */
export function runTool(name: string, args: unknown, context: ToolContext): unknown {
  if (name === 'page_count') {
    return { pages: context.facts.pages, paper: context.facts.paper }
  }

  if (name === 'quality_check') {
    return { findings: context.facts.findings }
  }

  if (name === 'help_topic') {
    const topic = (args as { topic?: string } | null)?.topic
    const texts = HELP[context.locale] as Record<string, string>
    const text = topic ? texts[topic] : undefined
    if (!text) return { error: 'unknown topic', topics: HELP_TOPICS }
    return { topic, text }
  }

  return { error: 'unknown tool' }
}

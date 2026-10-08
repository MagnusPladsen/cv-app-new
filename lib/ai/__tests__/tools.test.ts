import { describe, expect, it } from 'vitest'

import { TOOL_DEFS, factsSchema, runTool } from '@/lib/ai/tools'

const facts = factsSchema.parse({
  pages: 3,
  paper: 'a4',
  findings: [{ id: 'tooLong', severity: 'warning' }],
})

describe('the assistant tools', () => {
  it('reads the page count the browser measured rather than deriving one', () => {
    expect(runTool('page_count', null, { facts, locale: 'no' })).toEqual({ pages: 3, paper: 'a4' })
  })

  it('hands back the app’s own findings', () => {
    expect(runTool('quality_check', null, { facts, locale: 'no' })).toEqual({
      findings: [{ id: 'tooLong', severity: 'warning' }],
    })
  })

  it('answers help_topic in the asked-for language', () => {
    const no = runTool('help_topic', { topic: 'summary' }, { facts, locale: 'no' })
    const en = runTool('help_topic', { topic: 'summary' }, { facts, locale: 'en' })

    expect(no).not.toEqual(en)
    for (const result of [no, en]) {
      expect((result as { text: string }).text.length).toBeGreaterThan(20)
    }
  })

  it('returns an error object for a topic or tool it does not have', () => {
    // A model inventing a name should cost one round trip, not a 500.
    expect(runTool('help_topic', { topic: 'nonsense' }, { facts, locale: 'no' })).toMatchObject({
      error: 'unknown topic',
    })
    expect(runTool('read_whole_cv', null, { facts, locale: 'no' })).toEqual({
      error: 'unknown tool',
    })
  })

  it('offers no tool that could return CV content', () => {
    // The tools exist so the model does not guess. None of them may become a
    // way to fetch the document the request schema refuses to carry.
    expect(TOOL_DEFS.map((tool) => tool.name).sort()).toEqual([
      'help_topic',
      'page_count',
      'quality_check',
    ])
  })

  it('refuses facts that are a document in disguise', () => {
    expect(factsSchema.safeParse({ pages: 1, paper: 'a4', sections: [] }).success).toBe(true)
    expect(factsSchema.safeParse({ pages: 1, paper: 'a3' }).success).toBe(false)
    expect(factsSchema.safeParse({ pages: 900, paper: 'a4' }).success).toBe(false)
  })
})

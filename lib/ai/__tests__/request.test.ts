import { describe, expect, it } from 'vitest'

import { askSchema } from '@/lib/ai/request'

const valid = {
  task: 'chat',
  locale: 'no',
  chatId: 'chat-12345678',
  message: 'Hvor lang bør CV-en min være?',
  facts: { pages: 2, paper: 'a4', findings: [] },
}

describe('what the browser may send', () => {
  it('accepts a question with the measured facts', () => {
    expect(askSchema.safeParse(valid).success).toBe(true)
  })

  it('refuses a request with no question', () => {
    expect(askSchema.safeParse({ ...valid, message: '' }).success).toBe(false)
  })

  it('refuses a pasted novel rather than billing for it', () => {
    expect(askSchema.safeParse({ ...valid, message: 'x'.repeat(4001) }).success).toBe(false)
  })

  it('refuses an unknown task, so a cheap model cannot be swapped in by a caller', () => {
    expect(askSchema.safeParse({ ...valid, task: 'gradeMe' }).success).toBe(false)
  })

  it('caps the history, so one chat cannot resend itself forever', () => {
    const turn = { role: 'user' as const, content: 'hei' }
    expect(askSchema.safeParse({ ...valid, history: Array(13).fill(turn) }).success).toBe(false)
  })

  it('needs facts: there is no mode in which the model guesses the page count', () => {
    expect(askSchema.safeParse({ ...valid, facts: undefined }).success).toBe(false)
  })

  it('keeps a suggestion target to ids and a label, never a value', () => {
    const parsed = askSchema.safeParse({
      ...valid,
      targets: [{ kind: 'bullet', sectionId: 's1', entryId: 'e1', index: 0, label: 'Punkt 1' }],
    })

    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(Object.keys(parsed.data.targets[0]!).sort()).toEqual([
      'entryId',
      'index',
      'kind',
      'label',
      'sectionId',
    ])
  })
})

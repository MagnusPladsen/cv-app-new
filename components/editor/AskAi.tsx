'use client'

import { Sparkles } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { useAssistant } from '@/components/editor/assistant-context'
import { SuggestionCard } from '@/components/editor/SuggestionCard'
import { buildFacts, scrubPassages } from '@/lib/ai/context'
import type { Passage, Target } from '@/lib/ai/request'
import type { Suggestion } from '@/lib/ai/suggestions'

/**
 * "Ask AI", on the three fields that are genuinely hard to write.
 *
 * Not on every field: most of them are a date or a name, and a button offering
 * help with a date is noise that makes the three that matter harder to find.
 * Every field keeps its own plain explanation behind the question mark, which
 * works with no model, no network and no money.
 *
 * One press, one field. It sends that field's text and nothing else, and what
 * comes back is a suggestion with the old value above it.
 */

export function AskAi({
  drafts,
  label,
  targets,
  task,
}: {
  /** The field's text, as passages. Scrubbed here, before anything is sent. */
  drafts: Passage[]
  /** What to ask about it, in the user's words. */
  label: string
  targets: Target[]
  task: 'bullet' | 'summary' | 'coverLetter'
}) {
  const t = useTranslations('assistant')
  const locale = useLocale() === 'en' ? 'en' : 'no'
  const assistant = useAssistant()

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  // No provider, nothing to ask about: render nothing rather than a button
  // that cannot work.
  if (!assistant) return null
  const { document, handlers, pages } = assistant
  if (drafts.every((draft) => !draft.text.trim())) return null

  async function ask() {
    setError(null)
    setSuggestions([])

    const scrubbed = scrubPassages(drafts, document)
    if (!scrubbed.ok) {
      setError('errorNationalId')
      return
    }

    setPending(true)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          locale,
          // Its own conversation: a field asked about twice is two messages,
          // not a thread that has to be resent each time.
          chatId: `field-${crypto.randomUUID()}`,
          message: label,
          facts: buildFacts(document, pages),
          passages: scrubbed.passages,
          targets,
          history: [],
        }),
      })

      const data = (await response.json()) as {
        answer?: string
        suggestions?: Suggestion[]
        error?: string
        reason?: string
      }

      if (!response.ok || !data.answer) {
        const reason = data.reason
        setError(
          data.error === 'budget'
            ? reason === 'global'
              ? 'errorGlobal'
              : reason === 'visitorDay'
                ? 'errorVisitorDay'
                : reason === 'chatsPerDay'
                  ? 'errorChatsPerDay'
                  : 'errorUnconfigured'
            : data.error === 'rateLimited'
              ? 'errorRateLimited'
              : data.error === 'unconfigured'
                ? 'errorUnconfigured'
                : 'errorUpstream',
        )
        return
      }

      setSuggestions(data.suggestions ?? [])
      if ((data.suggestions ?? []).length === 0) setError('askNothing')
    } catch {
      setError('errorUpstream')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-brand hover:text-brand-strong disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        disabled={pending}
        onClick={ask}
        type="button"
      >
        <Sparkles aria-hidden="true" className="size-3.5 text-brand-strong" />
        {pending ? t('thinking') : t('askField')}
      </button>

      {error ? <p className="text-xs text-destructive">{t(error)}</p> : null}

      {suggestions.map((suggestion, index) => (
        <SuggestionCard
          document={document}
          handlers={handlers}
          key={`${suggestion.kind}-${index}`}
          suggestion={suggestion}
        />
      ))}
    </div>
  )
}

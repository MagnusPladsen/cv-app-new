'use client'

import { ChevronDown, Info, ListChecks, Send, Sparkles } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useRef, useState } from 'react'

import { Link } from '@/i18n/navigation'
import { SuggestionCard } from '@/components/editor/SuggestionCard'
import {
  buildFacts,
  chatTargets,
  collectPassages,
  prepareMessage,
  targetsFor,
} from '@/lib/ai/context'
import type { Passage, Target } from '@/lib/ai/request'
import type { Suggestion } from '@/lib/ai/suggestions'
import { getCvLabels } from '@/lib/cv-labels'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import type { CvDocument } from '@/lib/schema/cv'

/**
 * The assistant, in a drawer nobody has to open.
 *
 * Shut by default and silent until pressed: there is no background call, no
 * "while you type", and the panel says in plain words what leaves the browser
 * before anything does. That sentence is not decoration - it is what makes the
 * consent in the privacy policy real.
 *
 * Suggestions arrive as data, never as an edit. The old value sits above the
 * new one and the button writes exactly the object the model returned, through
 * the same handlers as typing, so it lands in the undo history like anything
 * else.
 */

type Turn = {
  role: 'user' | 'assistant'
  content: string
  suggestions?: Suggestion[]
}

/** Which message to show for which refusal. Every path has one. */
function errorKey(error: string, reason?: string): string {
  if (error === 'budget') {
    if (reason === 'global') return 'errorGlobal'
    if (reason === 'visitorDay') return 'errorVisitorDay'
    if (reason === 'chat') return 'errorChat'
    if (reason === 'chatsPerDay') return 'errorChatsPerDay'
    return 'errorUnconfigured'
  }
  if (error === 'rateLimited') return 'errorRateLimited'
  if (error === 'nationalId') return 'errorNationalId'
  if (error === 'unconfigured') return 'errorUnconfigured'
  return 'errorUpstream'
}

export function AssistantPanel({
  document,
  handlers,
  pages,
}: {
  document: CvDocument
  handlers: DocumentEditorHandlers
  pages: number
}) {
  const t = useTranslations('assistant')
  const locale = useLocale() === 'en' ? 'en' : 'no'
  const tLabels = useTranslations('personalia')
  const tLetter = useTranslations('letter')

  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // One chat is one id, because that is what the per-chat limit counts.
  const chatId = useRef<string>(`chat-${crypto.randomUUID()}`)

  const labels = getCvLabels(document.language)
  const targets = useMemo(
    () => chatTargets(document, labels, tLabels('professionalTitle'), tLetter('title')),
    [document, labels, tLabels, tLetter],
  )

  async function send(
    text: string,
    options: { task?: 'chat' | 'review'; passages?: Passage[]; targets?: Target[] } = {},
  ) {
    setError(null)
    const prepared = prepareMessage(text, document)
    if (!prepared.ok) {
      setError(prepared.reason === 'empty' ? 'errorEmpty' : 'errorNationalId')
      return
    }

    const history = turns.map((turn) => ({ role: turn.role, content: turn.content }))
    setTurns([...turns, { role: 'user', content: prepared.message }])
    setInput('')
    setPending(true)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: options.task ?? 'chat',
          locale,
          chatId: chatId.current,
          message: prepared.message,
          facts: buildFacts(document, pages),
          passages: options.passages ?? [],
          targets: options.targets ?? targets,
          // A review stands on its own: resending the chat with the CV
          // attached would pay for the whole conversation twice.
          history: options.task === 'review' ? [] : history.slice(-12),
        }),
      })

      const data = (await response.json()) as {
        answer?: string
        suggestions?: Suggestion[]
        error?: string
        reason?: string
      }

      if (!response.ok || !data.answer) {
        setError(errorKey(data.error ?? 'upstream', data.reason))
        return
      }

      setTurns((previous) => [
        ...previous,
        { role: 'assistant', content: data.answer!, suggestions: data.suggestions ?? [] },
      ])
    } catch {
      setError('errorUpstream')
    } finally {
      setPending(false)
    }
  }

  /**
   * The one press that sends the CV's own text. Separate from the input, and
   * labelled with what it sends, because it is a bigger thing to agree to
   * than asking a question.
   */
  function review() {
    setError(null)
    const collected = collectPassages(document, labels, tLabels('professionalTitle'), tLetter('title'))
    if (!collected.ok) {
      setError('errorNationalId')
      return
    }
    if (collected.passages.length === 0) {
      setError('reviewEmpty')
      return
    }

    void send(t('reviewQuestion'), {
      task: 'review',
      passages: collected.passages,
      targets: targetsFor(collected.passages),
    })
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-5">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <Sparkles aria-hidden="true" className="size-4 shrink-0 text-brand-strong" />
        <span className="text-sm font-semibold">{t('title')}</span>
        <ChevronDown
          aria-hidden="true"
          className={`ml-auto size-4 shrink-0 text-muted-foreground transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('intro')}</p>

          {/* Before the input, not behind a link: somebody has to be able to
              read what travels without first deciding to look for it. */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <Info aria-hidden="true" className="size-3.5 shrink-0" />
              {t('privacyTitle')}
            </p>
            <p>{t('privacySent')}</p>
            <p>{t('privacyStripped')}</p>
            <p>{t('privacyWhere')}</p>
            <Link
              className="w-fit font-medium text-brand-strong underline-offset-2 hover:underline"
              href="/personvern"
            >
              {t('privacyMore')}
            </Link>
          </div>

          {/* Its own control rather than a suggested question: this one
              sends the CV's text, and what it sends is written next to it. */}
          <div className="flex flex-col gap-1.5">
            <button
              className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/40 bg-brand-soft/60 px-4 py-2 text-sm font-semibold text-brand-strong transition hover:border-brand disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              disabled={pending}
              onClick={review}
              type="button"
            >
              <ListChecks aria-hidden="true" className="size-4" />
              {t('review')}
            </button>
            <p className="text-xs text-muted-foreground">{t('reviewSends')}</p>
          </div>

          {turns.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t('examplesTitle')}
              </p>
              <div className="flex flex-wrap gap-2">
                {(['example1', 'example2', 'example3'] as const).map((key) => (
                  <button
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs transition hover:border-brand hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    disabled={pending}
                    key={key}
                    onClick={() => send(t(key))}
                    type="button"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {turns.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {turns.map((turn, index) => (
                <li
                  className={`flex flex-col gap-2 ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
                  key={`${turn.role}-${index}`}
                >
                  <p
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-line ${
                      turn.role === 'user'
                        ? 'bg-brand-soft/60 text-brand-strong'
                        : 'border border-border/70 bg-card/60 text-foreground'
                    }`}
                  >
                    {turn.content}
                  </p>

                  {turn.suggestions && turn.suggestions.length > 0 ? (
                    <div className="flex w-full flex-col gap-2">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {t('suggestions')}
                      </p>
                      {turn.suggestions.map((suggestion, suggestionIndex) => (
                        <SuggestionCard
                          document={document}
                          handlers={handlers}
                          key={`${suggestion.kind}-${suggestionIndex}`}
                          suggestion={suggestion}
                        />
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}

          {pending ? <p className="text-sm text-muted-foreground">{t('thinking')}</p> : null}
          {error ? <p className="text-sm text-destructive">{t(error)}</p> : null}

          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (!pending) void send(input)
            }}
          >
            <textarea
              aria-label={t('title')}
              className="min-h-[2.75rem] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              maxLength={4000}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('placeholder')}
              rows={2}
              value={input}
            />
            <button
              className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft/60 px-4 py-2 text-sm font-semibold text-brand-strong transition hover:border-brand disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              disabled={pending}
              type="submit"
            >
              <Send aria-hidden="true" className="size-4" />
              {t('send')}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  )
}

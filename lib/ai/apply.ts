import type { Suggestion } from '@/lib/ai/suggestions'
import type { CvDocument, Section, TimelineEntry } from '@/lib/schema/cv'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'

/**
 * Turning a suggestion into an edit, and showing what it would replace.
 *
 * Deliberately separate from the chat: the UI shows the current value beside
 * the suggested one and writes exactly this, so the press is a diff the person
 * read rather than a change the model made. Anything that no longer resolves -
 * a section deleted while the answer was in flight, an index past the end of
 * the text - returns null and the Apply button is not offered.
 */

const sectionOf = (document: CvDocument, id: string | undefined): Section | undefined =>
  document.sections.find((section) => section.id === id)

const entryOf = (section: Section | undefined, id: string): TimelineEntry | undefined =>
  section && 'entries' in section && Array.isArray(section.entries)
    ? (section.entries as TimelineEntry[]).find((entry) => entry.id === id)
    : undefined

/** The lines of an entry's description, which is what a "bullet" is here. */
const linesOf = (entry: TimelineEntry): string[] => (entry.description ?? '').split('\n')

/**
 * What the suggestion would replace, or null when it no longer points at
 * anything. An empty string is a valid answer - the field is simply empty.
 */
export function currentValue(document: CvDocument, suggestion: Suggestion): string | null {
  if (suggestion.kind === 'summary') {
    const section = sectionOf(document, suggestion.sectionId)
    return section && section.type === 'summary' ? section.text : null
  }

  if (suggestion.kind === 'bullet') {
    const entry = entryOf(sectionOf(document, suggestion.sectionId), suggestion.entryId)
    if (!entry) return null
    const lines = linesOf(entry)
    // Replacing a line, or adding one at the end. Further than that is a
    // suggestion about a bullet that does not exist.
    if (suggestion.index > lines.length) return null
    return lines[suggestion.index] ?? ''
  }

  if (suggestion.kind === 'coverLetter') {
    return document.coverLetter?.[suggestion.field] ?? ''
  }

  return document.personalia.title
}

/**
 * Writes the suggestion through the editor's own handlers, so it joins the
 * undo history like anything typed by hand. Returns false when the target has
 * gone, having changed nothing.
 */
export function applySuggestion(
  document: CvDocument,
  suggestion: Suggestion,
  handlers: DocumentEditorHandlers,
): boolean {
  if (currentValue(document, suggestion) === null) return false

  if (suggestion.kind === 'summary') {
    handlers.onSummaryChange(suggestion.sectionId, suggestion.value)
    return true
  }

  if (suggestion.kind === 'bullet') {
    const entry = entryOf(sectionOf(document, suggestion.sectionId), suggestion.entryId)
    if (!entry) return false
    const lines = linesOf(entry)
    lines[suggestion.index] = suggestion.value
    handlers.onUpdateEntry(suggestion.sectionId, suggestion.entryId, {
      description: lines.join('\n'),
      // A suggested bullet is a bullet. An entry still set to prose would
      // render the line as a paragraph and the suggestion would look ignored.
      descriptionMode: 'bullets',
    })
    return true
  }

  if (suggestion.kind === 'coverLetter') {
    handlers.onCoverLetterChange({ [suggestion.field]: suggestion.value })
    return true
  }

  handlers.onPersonaliaChange({ title: suggestion.value })
  return true
}

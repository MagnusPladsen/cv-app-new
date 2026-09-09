export type LegalSection = {
  /** Stable across translations and across edits. Used as the heading anchor. */
  id: string
  heading: string
  /** Paragraphs. Rendered in order, as plain text. */
  body: string[]
}

export type LegalDocument = {
  title: string
  /** ISO date. Bumped whenever the substance changes, not for typos. */
  lastUpdated: string
  intro: string[]
  sections: LegalSection[]
}

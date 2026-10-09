export type GuideSection = {
  /** Stable across translations. The heading anchor, and the table-of-contents link. */
  id: string
  heading: string
  /** Paragraphs, rendered in order as plain text. */
  body: string[]
}

export type GuideQuestion = {
  question: string
  /** One or two sentences. Long answers belong in a section. */
  answer: string
}

export type GuideDocument = {
  title: string
  /** One line under the heading, and the meta description's longer cousin. */
  lede: string
  intro: string[]
  sections: GuideSection[]
  /** Rendered as a list, and as FAQPage structured data. */
  faq: GuideQuestion[]
  faqHeading: string
  tocHeading: string
}

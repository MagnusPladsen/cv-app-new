import { getTemplate } from '@/components/cv/templates'
import { CV_DOC_CLASS } from '@/components/cv/CvDocument'
import { PAPER } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { buildThemeTokens, themeTokensToStyle, type CvThemeStyle } from '@/lib/theme/tokens'

/**
 * The søknad, rendered as a page of the same document.
 *
 * It carries `.cv-doc` and the template's own class, so it inherits the paper
 * size, the accent, the typeface pairing and the margins the CV already has -
 * a letter in a different face beside a CV in another reads as two documents
 * from two people. `public/cv/letter.css` is the only stylesheet that knows
 * about letters, and it is scoped to `.cv-letter`.
 *
 * An empty letter still renders: the preview is where you write it, and a page
 * that appears only once it is finished is a page you cannot write on.
 */
export function CoverLetterDocument({
  document,
  decorative = false,
}: {
  document: CvDocumentData
  /** Thumbnails and previews are decorative; the printed page is not. */
  decorative?: boolean
}) {
  const letter = document.coverLetter
  if (!letter?.enabled) return null

  const template = getTemplate(document.theme.templateId)
  const tokens = buildThemeTokens(document.theme, template.tokens)
  const paper = PAPER[document.paper]

  const style: CvThemeStyle = {
    ...themeTokensToStyle(tokens),
    '--cv-page-width': `${paper.widthMm}mm`,
    '--cv-page-height': `${paper.heightMm}mm`,
    '--cv-margin': `${tokens.marginMm}mm`,
  }

  const { personalia } = document
  const sender = [personalia.firstName, personalia.lastName].filter(Boolean).join(' ')
  const contact = [personalia.email, personalia.phone].filter(Boolean).join(' · ')
  const dateline = [letter.place, letter.date].filter(Boolean).join(', ')

  const Name = decorative ? 'p' : 'h1'

  return (
    <div
      className={`${CV_DOC_CLASS} ${CV_DOC_CLASS}--${template.id} cv-letter`}
      lang={document.language}
      style={style}
    >
      <header className="cv-letter__head">
        <div className="cv-letter__sender">
          <Name className="cv-letter__name">{sender}</Name>
          {personalia.title ? <p className="cv-letter__title">{personalia.title}</p> : null}
          {contact ? <p className="cv-letter__contact">{contact}</p> : null}
        </div>
        {dateline ? <p className="cv-letter__dateline">{dateline}</p> : null}
      </header>

      {letter.recipient ? (
        <p className="cv-letter__recipient">{letter.recipient}</p>
      ) : null}

      {letter.position ? <p className="cv-letter__subject">{letter.position}</p> : null}

      {letter.greeting ? <p className="cv-letter__greeting">{letter.greeting}</p> : null}

      {/* pre-line, not paragraphs: people write a letter with blank lines and
          expect to see them where they put them. */}
      <div className="cv-letter__body">{letter.body}</div>

      {letter.closing ? <p className="cv-letter__closing">{letter.closing}</p> : null}

      {sender ? <p className="cv-letter__signature">{sender}</p> : null}
    </div>
  )
}

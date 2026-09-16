import { ALL_TEMPLATE_STYLESHEETS } from '@/components/cv/templates'
import { CV_STYLESHEETS } from '@/lib/print/stylesheets'

/**
 * The stylesheets that render a CV, loaded only where one is rendered.
 *
 * These used to sit in the root layout, which meant the landing page, the
 * gallery and both policy pages each blocked their first paint on twenty-one
 * stylesheets - about 57 KiB and, on a slow connection, the better part of a
 * second - for a document none of them contains. The gallery stopped
 * rendering live CVs when it moved to captured stills; the layout kept
 * loading the sheets anyway.
 *
 * Two pages actually need them: the editor, whose preview is a real document
 * and whose export prints that document, and the proof sheet.
 *
 * All eighteen templates rather than the active one, because the editor
 * switches template without a navigation and a sheet fetched at that moment
 * would show an unstyled CV until it arrived.
 *
 * React hoists `<link rel="stylesheet">` into the head from wherever it is
 * rendered, so this works as an ordinary component.
 */
export function CvStylesheets() {
  return (
    <>
      {[...CV_STYLESHEETS, ...ALL_TEMPLATE_STYLESHEETS].map((href) => (
        <link href={href} key={href} rel="stylesheet" />
      ))}
    </>
  )
}

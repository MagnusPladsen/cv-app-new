'use client'

import { ArrowRight } from 'lucide-react'

import { useTemplateStart } from '@/components/gallery/use-template-start'

/**
 * The landing page's first call to action.
 *
 * It used to go straight to the gallery, which quietly assumed everybody
 * starts from nothing. Most people arriving here have a CV already and would
 * rather not type it again, so the button asks which it is - and the import
 * sits beside the blank page rather than three clicks past it.
 */
export function GetStartedButton({ label }: { label: string }) {
  const { begin, dialog } = useTemplateStart()

  return (
    <>
      <button
        className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
        onClick={begin}
        type="button"
      >
        {label}
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
      {dialog}
    </>
  )
}

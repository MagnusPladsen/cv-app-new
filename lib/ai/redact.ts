import { NATIONAL_ID } from '@/lib/quality/checks'
import type { Personalia } from '@/lib/schema/cv'

/**
 * What leaves the browser, and what is removed first.
 *
 * The assistant is useful because it reads the text. That means text does
 * leave the machine when somebody presses a button - and the policy says so
 * plainly. What it must never carry is the person: their name, their address,
 * their email, their phone, and above all a fødselsnummer.
 *
 * Done here rather than on the server, so the identifiers are gone before the
 * request exists rather than after it arrives.
 */

export type Scrubbed = { ok: true; text: string } | { ok: false; reason: 'nationalId' }

/** The placeholders the assistant sees instead. Readable, so its answer reads. */
const MASKS = {
  name: '[navn]',
  email: '[e-post]',
  phone: '[telefon]',
  place: '[sted]',
} as const

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Replaces every identifier this person has typed into their own CV, wherever
 * it appears in the text being sent.
 *
 * Refuses outright on an eleven-digit national identity number. That is the
 * one piece of data where carrying on with a mask is worse than stopping: if
 * it is in the text, the person should be told it is there and take it out of
 * their CV, not have it quietly swallowed.
 */
export function scrub(text: string, personalia?: Personalia): Scrubbed {
  if (NATIONAL_ID.test(text)) return { ok: false, reason: 'nationalId' }

  let out = text
  if (personalia) {
    const replacements: [string | undefined, string][] = [
      [personalia.firstName, MASKS.name],
      [personalia.lastName, MASKS.name],
      [personalia.email, MASKS.email],
      [personalia.phone, MASKS.phone],
      [personalia.city, MASKS.place],
      [personalia.country, MASKS.place],
      ...personalia.links.map((link) => [link.url, '[lenke]'] as [string, string]),
      ...personalia.links.map((link) => [link.label, '[lenke]'] as [string, string]),
    ]

    // Longest first, or a first name masks the local part of the email
    // address that contains it and the address itself then survives.
    const ordered = replacements
      .map(([value, mask]) => [value?.trim() ?? '', mask] as const)
      // Two characters is a surname like "Li"; one is a letter that would
      // pepper the text with placeholders.
      .filter(([value]) => value.length >= 2)
      .sort((a, b) => b[0].length - a[0].length)

    for (const [value, mask] of ordered) {
      out = out.replace(new RegExp(escape(value), 'gi'), mask)
    }

    // "Ola Nordmann" masked word by word reads "[navn] [navn]". Only a run of
    // two or more is collapsed: touching a single one would move the
    // punctuation after it.
    out = out.replace(/\[navn\](\s*\[navn\])+/g, MASKS.name).trim()
  }

  return { ok: true, text: out }
}

/** Nothing is sent until this passes, so it is worth being able to see it. */
export function describeWhatIsSent(parts: string[]): string {
  return parts.filter(Boolean).join('\n\n')
}

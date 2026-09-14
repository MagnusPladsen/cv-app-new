import { GRACE_DAYS, INACTIVE_MONTHS } from './policy'

/**
 * The warning email, in both languages in one message.
 *
 * Nothing records which language a person picked - the account row holds an
 * email address and timestamps - and guessing from an email domain would be
 * worse than showing both. Norwegian first: it is the primary market.
 *
 * It says what will happen, when, and the one thing that stops it. It asks for
 * nothing, and it links to the site rather than to a tokenised URL, because a
 * "click here or lose your data" link is the shape of every phishing mail and
 * a person right to be suspicious of it should still be able to act.
 */
export function warningEmail(siteUrl: string) {
  const subject = `Kontoen din på CVApp slettes om ${GRACE_DAYS} dager · Your CVApp account will be deleted in ${GRACE_DAYS} days`

  const text = [
    'Hei,',
    '',
    `Du har ikke logget inn på CVApp på ${INACTIVE_MONTHS} måneder. Vi sletter kontoer som ikke er i bruk, fordi vi ikke skal lagre opplysninger vi ikke trenger.`,
    '',
    `Om ${GRACE_DAYS} dager sletter vi kontoen din og alle CV-ene som ligger på den. Det kan ikke angres.`,
    '',
    `Vil du beholde den, er alt du trenger å gjøre å logge inn: ${siteUrl}`,
    '',
    'Logger du inn, stopper slettingen, og du hører ikke fra oss igjen før det eventuelt har gått to nye år.',
    '',
    'CV-er du har lagret lokalt i nettleseren din blir ikke berørt.',
    '',
    '—',
    '',
    'Hi,',
    '',
    `You have not signed in to CVApp for ${INACTIVE_MONTHS} months. We delete accounts that are not in use, because we should not store data we do not need.`,
    '',
    `In ${GRACE_DAYS} days we will delete your account and every CV on it. That cannot be undone.`,
    '',
    `To keep it, all you have to do is sign in: ${siteUrl}`,
    '',
    'Signing in stops the deletion, and you will not hear from us again until another two years have passed.',
    '',
    'CVs you saved locally in your browser are not affected.',
  ].join('\n')

  return { subject, text }
}

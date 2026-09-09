import type { LegalDocument } from './types'

/** The English rendering of PRIVACY_NO. Section ids must match, and a test
 *  enforces it: a policy that says different things in two languages is two
 *  policies, and only one of them can be the one you are relying on. */
export const PRIVACY_EN: LegalDocument = {
  title: 'Privacy policy',
  lastUpdated: '2026-09-09',
  intro: [
    'CVApp is a tool for building your own CV. This policy explains what we process, why, for how long, and what you can require of us.',
    'In short: you can use CVApp without an account. Your CVs then live only in your browser and we store none of their content. Our hosting provider still holds your IP address in its server logs, as any website’s does. If you sign in, your CVs are also saved to your account so they follow you between devices.',
  ],
  sections: [
    {
      id: 'controller',
      heading: 'Data controller',
      body: [
        'Magnus Pladsen, a private individual. There is no registered company behind CVApp, and therefore no organisation number.',
        'Privacy contact: magnus_pladsen@hotmail.com',
      ],
    },
    {
      id: 'what',
      heading: 'What we process',
      body: [
        'The contents of your CVs: name, contact details, work history, education, skills, languages, certifications, interests, driving licence, references, and an optional portrait photo.',
        'Account details if you sign in: your email address and which sign-in provider you used.',
        'Technical data held by the hosting provider, such as IP address and browser type in server logs. CV content is never logged.',
        'A complete field-by-field list is kept in the data inventory in the source code (docs/privacy/data-inventory.md).',
      ],
    },
    {
      id: 'basis',
      heading: 'Legal basis',
      body: [
        'Storing and rendering your CV is performance of a contract, GDPR Article 6(1)(b). It is the service itself, so we do not ask for your consent to it.',
        'We do not ask for consent to anything else either, because we do nothing else: no analytics, no tracking, no marketing, no profiling.',
      ],
    },
    {
      id: 'free-text',
      heading: 'Free-text fields and special categories',
      body: [
        'CVApp has no field for health, religion, ethnicity, political opinions or trade union membership, and never asks for any of them.',
        'You can still write whatever you like in free-text fields such as the summary, descriptions and custom sections. What you put there is your choice. We recommend not including information about health, religion, ethnicity, political opinions or trade union membership unless it is necessary for the role you are applying for.',
        'If you do choose to include such information, it is stored on the basis of the explicit consent you give by entering it, under GDPR Article 9(2)(a). Contract is not a valid basis for special categories of personal data. You can withdraw that consent at any time by editing or deleting the CV, and the information is then gone.',
      ],
    },
    {
      id: 'references',
      heading: 'Referees and other named people',
      body: [
        'If you add a referee, we process information about someone who does not use CVApp themselves. We store what you typed so it can be printed on your CV. We never contact your referee, and your CV is never publicly accessible.',
        'You are responsible for having their permission to share their contact details. If you are listed as a referee on someone’s CV and want your details removed, contact us at the address above.',
      ],
    },
    {
      id: 'processors',
      heading: 'Who processes data for us',
      body: [
        'We use processors for hosting and storage. The table below shows who they are, what they do, where the processing happens, and whether a data processing agreement is in place.',
      ],
    },
    {
      id: 'transfers',
      heading: 'Transfers outside the EEA',
      body: [
        'We transfer no personal data outside the EEA.',
        'Your CVs and account details are stored in Frankfurt, Germany. The site is hosted by Vercel, and your requests are processed in Frankfurt too.',
        'Your CV content never passes through one of our servers in any case: it lives in your browser and syncs directly to the database.',
      ],
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      body: [
        'CVs in your browser stay there until you delete them, clear your browser data, or sign out.',
        'CVs on your account stay until you delete the CV or the account. A deleted CV leaves a row with no content, holding its id, timestamps and which account it belonged to, so the deletion also reaches the other devices you use. That row is still personal data about you, and it is deleted along with the account.',
        'If you delete your account, the account and every CV on it are deleted immediately from the live systems. Backups held by the database provider rotate out on that provider’s schedule, and deleted data is never restored into production.',
        'Server logs held by the hosting provider are deleted on that provider’s schedule.',
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies and browser storage',
      body: [
        'CVApp uses no cookies for analytics, tracking or marketing, and therefore has no consent banner.',
        'We store your CVs and a few preferences in your browser’s storage, and set a sign-in cookie if you sign in. Both are strictly necessary to deliver the service you asked for, and are exempt from the consent requirement under the Norwegian Electronic Communications Act section 3-15.',
      ],
    },
    {
      id: 'rights',
      heading: 'Your rights',
      body: [
        'Access: you can download everything we hold about you as JSON, under Your account.',
        'Portability: that same download is machine-readable, and you can additionally download your CVs in a format that imports back in.',
        'Rectification: you can change anything in your CVs at any time in the editor.',
        'Erasure: you can delete a single CV, or your whole account and everything on it, under Your account.',
        'Restriction and objection: contact us at the address above.',
        'You can complain to Datatilsynet, the Norwegian Data Protection Authority, if you believe we are processing your data unlawfully. See datatilsynet.no.',
        'We respond within one month.',
      ],
    },
    {
      id: 'voluntary',
      heading: 'Do you have to provide anything?',
      body: [
        'No. You can use CVApp without an account, and you decide what goes into your CV. With no content there is no CV, but that is the only consequence.',
      ],
    },
    {
      id: 'automated',
      heading: 'Automated decisions and artificial intelligence',
      body: [
        'CVApp makes no automated decisions about you and does no profiling.',
        'CVApp uses no artificial intelligence. Nothing you write in your CV is sent to a language model, and we do not send CV content to any third party for processing.',
      ],
    },
    {
      id: 'security',
      heading: 'Security',
      body: [
        'All traffic uses HTTPS. Data is stored encrypted by the database provider.',
        'Access to CVs is restricted in the database itself, so one user cannot read another’s CVs regardless of what the application asks for.',
        'CV content is never logged.',
      ],
    },
    {
      id: 'changes',
      heading: 'Changes',
      body: [
        'If this policy changes, we update the date at the top. Material changes are announced in the app.',
      ],
    },
  ],
}

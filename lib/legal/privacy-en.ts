import type { LegalDocument } from './types'

/** The English rendering of PRIVACY_NO. Section ids must match, and a test
 *  enforces it: a policy that says different things in two languages is two
 *  policies, and only one of them can be the one you are relying on. */
export const PRIVACY_EN: LegalDocument = {
  title: 'Privacy policy',
  lastUpdated: '2026-10-08',
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
        'We count page views with Vercel Web Analytics, and measure how fast pages loaded with Vercel Speed Insights, to see which parts of the service get used and where it is slow. The basis is legitimate interests, Article 6(1)(f): nothing is stored in your browser, no profile of you is built, and nothing you type into a CV is included.',
        'Beyond that we ask for consent to nothing, because we do nothing more: no marketing, no profiling, no sharing with advertisers.',
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
        'Everything we store is stored in the EEA. Your CVs and account details are in Frankfurt, Germany, and the site is served from Frankfurt.',
        'There is one transfer outside the EEA, and only one: if you use the assistant, the text you ask for help with is sent to OpenAI in the United States. You press a button each time, and your name, email address, phone number and place are removed before the request is built. The section on the assistant says exactly what is sent.',
        'The basis for the transfer is the explicit consent you give by pressing, GDPR Article 49(1)(a). OpenAI additionally offers Standard Contractual Clauses.',
        'Beyond that, your CV content never passes through one of our servers: it lives in your browser and syncs directly to the database in Frankfurt.',
      ],
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      body: [
        'CVs in your browser stay there until you delete them, clear your browser data, or sign out.',
        'CVs on your account stay until you delete the CV or the account. A deleted CV leaves a row with no content, holding its id, timestamps and which account it belonged to, so the deletion also reaches the other devices you use. That row is still personal data about you, and it is deleted along with the account.',
        'If you delete your account, the account and every CV on it are deleted immediately from the live systems. The database provider takes no automatic backups on the plan we are on today, so there is no copy the deletion does not reach. Were we to move to a plan with daily backups, those roll off after seven days, and deleted data is never restored into production.',
        'Server logs held by the hosting provider are kept for one hour on the plan we are on today, and then deleted. On a paid plan it is one day.',
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies and browser storage',
      body: [
        'CVApp uses no cookies for analytics, tracking or marketing, and therefore has no consent banner. Our visitor statistics store nothing on your device: Vercel Web Analytics counts the page view, the page you came from, country, browser type and screen type, and Speed Insights measures how long the page took to become ready. Neither sets a cookie nor any other storage. The consent requirement in the Norwegian Electronic Communications Act section 3-15 therefore does not apply.',
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
      heading: 'Automated decisions',
      body: [
        'CVApp makes no automated decisions about you in the legal sense, and does no profiling. Nothing in the app decides anything about you, ranks you, or assesses you as a candidate.',
        'CVApp uses artificial intelligence in one place: the assistant. It suggests text and answers questions, and it changes nothing by itself. What is sent, and where, is in the section below.',
      ],
    },
    {
      id: 'ai',
      heading: 'The assistant (artificial intelligence)',
      body: [
        'CVApp has an assistant that answers questions about CVs and applications, and suggests better wording. It is voluntary, and you press a button each time. Nothing is sent until you do.',
        'When you press, three things are sent: your question, the text you asked for help with, and the measurements the app made itself — how many pages your CV runs to, which paper size you use, and which items the quality check found. Nothing else.',
        'Your name, email address, phone number, place and links are removed in your browser before the request is built, and replaced with [navn], [e-post], [telefon] and [sted]. If the text contains a Norwegian national identity number, nothing is sent at all, and you are told to take it out of your CV.',
        'Your photo is never sent. Your whole CV is never sent. Your account details are never sent. No conversation is stored, by us or by the provider.',
        'The text is processed by OpenAI in the United States. The request is sent with instructions not to store it, and it is not used to train models. The part of the request that is the same for everybody — our own instructions — may sit in a cache at OpenAI for up to 24 hours, which is what makes the service cheap enough to run.',
        'The assistant suggests; it changes nothing. A suggestion becomes a change only when you press it, and you see what changes before you do.',
        'The basis is the explicit consent you give by pressing, GDPR Article 6(1)(a), and Article 49(1)(a) for the transfer to the United States. You withdraw it by not using the assistant. There is nothing to delete afterwards, because nothing was stored.',
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

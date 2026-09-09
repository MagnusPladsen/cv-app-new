import type { LegalDocument } from './types'

/** The English rendering of TERMS_NO. Section ids must match; a test enforces it. */
export const TERMS_EN: LegalDocument = {
  title: 'Terms of use',
  lastUpdated: '2026-09-09',
  intro: [
    'CVApp is a tool for building your own CV. These terms apply when you use it.',
    'How we handle personal data is set out in the privacy policy, not here.',
  ],
  sections: [
    {
      id: 'service',
      heading: 'What the service is',
      body: [
        'CVApp lets you build, edit and download CVs as PDFs. You can use it without an account. If you sign in, your CVs are saved to your account so they follow you between devices.',
        'We are not a job board. We do not send your CV anywhere, and we do not put you in touch with employers.',
      ],
    },
    {
      id: 'beta',
      heading: 'Beta and pricing',
      body: [
        'CVApp is in beta and is free. Everything works, and you can build and download as many CVs as you like without paying.',
        'In time there will be a small charge to cover server and database costs. We will give notice well before that happens, and you will never be charged without agreeing to it first.',
        'Beta means things can change. We may change or remove features, but we will never delete your CVs unless you ask us to.',
      ],
    },
    {
      id: 'your-content',
      heading: 'Your content',
      body: [
        'The CVs you make are yours. We take no rights in them, use them for nothing else, and show them to nobody.',
        'You are responsible for what you write. That applies particularly to information about other people: if you add a referee, you must have their permission to share their contact details.',
        'You can download everything you have stored, and delete it, at any time.',
      ],
    },
    {
      id: 'acceptable-use',
      heading: 'What you may not use it for',
      body: [
        'Do not enter unlawful content, or information about other people that you have no right to process.',
        'Do not try to reach other people’s CVs, work around security measures, or load the service with automated requests to a degree that affects other users.',
        'If you do, we may close your account. You will be told, and you will have the chance to download your content first unless it is unlawful.',
      ],
    },
    {
      id: 'availability',
      heading: 'Availability',
      body: [
        'The service is provided as it is. We do not promise it is always available or free of faults, and we run it with no guaranteed uptime.',
        'Your CVs live in your browser as well as on your account, so an outage rarely cuts you off from them entirely. Even so, download a copy of any CV you depend on.',
      ],
    },
    {
      id: 'liability',
      heading: 'Liability',
      body: [
        'We are not liable for losses arising from the service being unavailable, or from faults in it, beyond what mandatory Norwegian law provides.',
        'If you are a consumer, these terms do not limit your rights under consumer protection law.',
      ],
    },
    {
      id: 'termination',
      heading: 'Ending',
      body: [
        'You can delete your account at any time under Your account. Everything on it is deleted with it.',
        'We may discontinue the service. If we do, we will give notice in good time so you can download your CVs.',
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to these terms',
      body: [
        'If these terms change, we update the date at the top. Material changes are announced in the app.',
      ],
    },
    {
      id: 'law',
      heading: 'Governing law',
      body: [
        'Norwegian law applies. Disputes are heard by the Norwegian courts.',
        'Questions about these terms: magnus_pladsen@hotmail.com',
      ],
    },
  ],
}

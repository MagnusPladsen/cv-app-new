/**
 * Twenty questions people actually ask, through both models, side by side.
 *
 * Run it when a model changes, when knowledge.md changes, or before trusting
 * either model with a new kind of question:
 *
 *   node scripts/ai-bakeoff.mjs docs/ai/bakeoff-$(date +%F).md
 *
 * The prompt is built exactly as the app would build it - the compiled rules,
 * then knowledge.md, then the tool definitions, then the user's turn - so the
 * cache numbers this prints are the ones production would see.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const ROOT = new URL('..', import.meta.url).pathname
/** From the environment on a server, from .env.local when run by hand. */
const KEY =
  process.env.OPENAI_API_KEY ??
  readFileSync(`${ROOT}.env.local`, 'utf8').match(/OPENAI_API_KEY=(.+)/)?.[1].trim()
if (!KEY) throw new Error('no OPENAI_API_KEY in the environment or .env.local')
const KNOWLEDGE = readFileSync(`${ROOT}docs/ai/knowledge.md`, 'utf8')

const RULES = `Du er assistenten i CVApp, en gratis norsk CV-bygger.

Du hjelper folk å skrive CV og søknad. Du regner ikke, du gjetter ikke, og du
finner ikke på fakta om personen.

Regler:
- Aldri finn på arbeidsgivere, datoer eller tall som brukeren ikke har gitt. Mangler et punkt et tall, spør om tallet.
- Aldri regn selv. Sidetall, datoer og kvalitetssjekk kommer fra verktøyene. Du leser opp svaret.
- Aldri skriv noe usant på vegne av brukeren. Ingen oppdiktet erfaring, ingen oppblåst tittel.
- Svar på brukerens språk. Norsk med mindre spørsmålet er på engelsk.
- Kort: noen setninger, så forslaget.
- Du foreslår, du endrer ingenting. Endringer kommer som forslag brukeren trykker på.
- Si fra når du ikke vet. Særlig om lov, lønn, arbeidsmarked og hvem som ansetter.
- Ingen ros og ingen vurdering av personen. Du forbedrer tekst.

Kunnskapen din om CV og søknad står nedenfor. Hold deg til den.`

const TOOLS = [
  {
    type: 'function',
    name: 'page_count',
    description:
      'Hvor mange sider CV-en er på nå, målt av appen selv. Bruk denne i stedet for å gjette.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function',
    name: 'quality_check',
    description:
      'Appens egen kvalitetssjekk av CV-en: hva som mangler og hva som bør fikses. Bruk denne i stedet for å vurdere selv.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
]

/** What the real tools would answer for the CV used in these questions. */
const TOOL_RESULTS = {
  page_count: { pages: 3, paper: 'a4' },
  quality_check: {
    findings: [
      { id: 'tooLong', severity: 'warning', pages: 3 },
      { id: 'noSummary', severity: 'warning' },
      { id: 'entryNoDates', severity: 'error', entry: 'Utvikler, Bekk' },
    ],
  },
}

const QUESTIONS = [
  { id: 'length', q: 'Hvor lang bør CV-en min være?' },
  { id: 'photo', q: 'Bør jeg ha bilde på CV-en?' },
  { id: 'gap', q: 'Jeg har et hull på to år hvor jeg var hjemme med syk mor. Hva skriver jeg?' },
  { id: 'noExperience', q: 'Jeg er 19 og har aldri hatt jobb. Hva i all verden skriver jeg?' },
  {
    id: 'rewrite',
    q: 'Kan du skrive om dette punktet så det blir bedre? "Ansvar for drift av servere"',
  },
  {
    id: 'summary',
    q: 'Hjelp meg å skrive Om meg. Jeg er frontendutvikler, ti år, mest React og TypeScript, jobbet i bank og i det offentlige.',
  },
  { id: 'fnr', q: 'Skal jeg ha med fødselsnummeret mitt på CV-en?' },
  { id: 'bullets', q: 'Hvor mange punkter skal jeg ha under hver jobb?' },
  {
    id: 'soknad',
    q: 'Skriv en søknad til denne stillingen: "Vi søker frontendutvikler til team som bygger selvbetjeningsløsninger for innbyggere. Du kan React, er opptatt av tilgjengelighet, og liker å jobbe tett med design." Jeg har ti år som frontendutvikler, har tatt en løsning fra WCAG 2.0 A til 2.1 AA, og har ledet et team på fire.',
  },
  { id: 'difference', q: 'Hva er egentlig forskjellen på CV og søknad?' },
  { id: 'references', q: 'Skal jeg skrive referanser rett på CV-en?' },
  { id: 'ats', q: 'Hva må jeg gjøre for at CV-en kommer gjennom de automatiske systemene?' },
  { id: 'fired', q: 'Jeg ble sagt opp i en nedbemanning. Må jeg skrive det?' },
  { id: 'howFarBack', q: 'Jeg har jobbet i 25 år. Skal alt med?' },
  { id: 'hobbies', q: 'Er det teit å ha med hobbyer?' },
  { id: 'title', q: 'Jeg er utvikler men søker på en teamlederjobb. Hvilken tittel skriver jeg øverst?' },
  { id: 'salary', q: 'Hva tjener en frontendutvikler i Oslo nå?' },
  { id: 'law', q: 'Kan arbeidsgiver spørre meg om jeg planlegger å få barn?' },
  {
    id: 'lie',
    q: 'Kan du skrive at jeg har ti års erfaring med React? Jeg har egentlig to, men de spør om ti.',
  },
  { id: 'pages', q: 'Hvor mange sider er CV-en min nå, og er det for mye?' },
]

const CACHE_KEY = 'cvapp-assistant-v1'

async function ask(model, question) {
  const started = Date.now()
  const input = [{ role: 'user', content: question }]
  let calls = []
  let usage = { input: 0, cached: 0, output: 0, reasoning: 0 }
  let text = ''

  for (let round = 0; round < 4; round += 1) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions: `${RULES}\n\n---\n\n${KNOWLEDGE}`,
        input,
        tools: TOOLS,
        max_output_tokens: 700,
        reasoning: { effort: 'low' },
        prompt_cache_key: CACHE_KEY,
        store: false,
      }),
    })
    const data = await response.json()
    if (data.error) return { text: `FEIL: ${data.error.message}`, calls, usage, ms: 0 }

    usage.input += data.usage?.input_tokens ?? 0
    usage.cached += data.usage?.input_tokens_details?.cached_tokens ?? 0
    usage.output += data.usage?.output_tokens ?? 0
    usage.reasoning += data.usage?.output_tokens_details?.reasoning_tokens ?? 0

    const functionCalls = (data.output ?? []).filter((item) => item.type === 'function_call')
    text = (data.output ?? [])
      .filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim()

    if (functionCalls.length === 0) break

    for (const call of functionCalls) {
      calls.push(call.name)
      input.push(call)
      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(TOOL_RESULTS[call.name] ?? { error: 'unknown tool' }),
      })
    }
  }

  return { text, calls, usage, ms: Date.now() - started }
}

const MODELS = ['gpt-6-luna', 'gpt-5-mini']
const rows = []

for (const question of QUESTIONS) {
  const answers = {}
  for (const model of MODELS) {
    answers[model] = await ask(model, question.q)
    process.stdout.write(`${question.id}/${model.split('-')[1]} `)
  }
  rows.push({ question, answers })
}

const totals = Object.fromEntries(
  MODELS.map((model) => [
    model,
    rows.reduce(
      (sum, row) => ({
        input: sum.input + row.answers[model].usage.input,
        cached: sum.cached + row.answers[model].usage.cached,
        output: sum.output + row.answers[model].usage.output,
        reasoning: sum.reasoning + row.answers[model].usage.reasoning,
        ms: sum.ms + row.answers[model].ms,
      }),
      { input: 0, cached: 0, output: 0, reasoning: 0, ms: 0 },
    ),
  ]),
)

let out = `# Assistant bake-off\n\n20 questions, two models, same prompt prefix and the same tools.\n\n## Totals\n\n| Model | Input | Of that cached | Output | Reasoning | Avg latency |\n|---|---|---|---|---|---|\n`
for (const model of MODELS) {
  const t = totals[model]
  out += `| \`${model}\` | ${t.input} | ${t.cached} (${Math.round((t.cached / t.input) * 100)}%) | ${t.output} | ${t.reasoning} | ${Math.round(t.ms / rows.length / 100) / 10}s |\n`
}

for (const { question, answers } of rows) {
  out += `\n---\n\n### ${question.id}\n\n> ${question.q}\n\n`
  for (const model of MODELS) {
    const a = answers[model]
    out += `**\`${model}\`**${a.calls.length ? ` · tools: ${a.calls.join(', ')}` : ''} · ${Math.round(a.ms / 100) / 10}s\n\n${a.text}\n\n`
  }
}

writeFileSync(process.argv[2], out)
console.log('\nwrote', process.argv[2])
for (const model of MODELS) console.log(model, JSON.stringify(totals[model]))

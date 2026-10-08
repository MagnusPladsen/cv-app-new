/**
 * Writes docs/ai/knowledge.md from lib/ai/knowledge.ts.
 *
 * The TypeScript is the source: the assistant's prompt is built from it, and a
 * markdown file a serverless function cannot read is not a knowledge base.
 * The markdown is what a person reviews and argues with.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const ROOT = new URL('..', import.meta.url).pathname
const source = readFileSync(`${ROOT}lib/ai/knowledge.ts`, 'utf8')
const literal = source.slice(source.indexOf('export const KNOWLEDGE = `') + 'export const KNOWLEDGE = `'.length, source.lastIndexOf('`'))
const markdown = literal.replaceAll('\\`', '`').replaceAll('\\${', '${').replaceAll('\\\\', '\\')

writeFileSync(`${ROOT}docs/ai/knowledge.md`, markdown)
console.log('docs/ai/knowledge.md written from lib/ai/knowledge.ts')

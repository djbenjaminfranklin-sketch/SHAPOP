#!/usr/bin/env node
// Cherche les textes visibles encore écrits en dur dans une seule langue,
// les dictionnaires incomplets, les choix de langue en dur et les positions
// gauche/droite qui ne s'inversent pas en hébreu.
// Usage : node scripts/check-hardcoded-text.mjs [fichiers ou dossiers…]
//         (sans argument : tout src/). Code de sortie 1 s'il reste des problèmes.
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { listSourceFiles, auditDictionaries, auditLangComparisons, auditHardcodedText, auditPhysicalDirections, auditCountrySpecific, formatProblems } from './i18n-audit.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
const summaryOnly = process.argv.includes('--summary')
let files = []
if (args.length === 0) files = listSourceFiles(path.join(root, 'src'))
else for (const a of args) {
  const p = path.resolve(a)
  if (fs.statSync(p).isDirectory()) files.push(...listSourceFiles(p))
  else files.push(p)
}

const sections = [
  ['Dictionnaires incomplets', auditDictionaries(files)],
  ['Choix de langue en dur', auditLangComparisons(files)],
  ['Textes visibles en dur', auditHardcodedText(files)],
  ['Positions gauche/droite en dur (hébreu)', auditPhysicalDirections(files)],
  ['Devise ou pays en dur', auditCountrySpecific(files)],
]
let total = 0
for (const [title, probs] of sections) {
  total += probs.length
  console.log(`\n== ${title} : ${probs.length}`)
  if (summaryOnly) {
    const byFile = {}
    for (const p of probs) byFile[path.relative(root, p.file)] = (byFile[path.relative(root, p.file)] || 0) + 1
    for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${f}`)
  } else if (probs.length) console.log(formatProblems(probs, root))
}
console.log(`\nTotal : ${total}`)
process.exit(total ? 1 : 0)

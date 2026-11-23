// Échoue si un texte n'existe pas dans l'une des 5 langues (en, fr, es, ru, he),
// si un dictionnaire n'est pas dans l'ordre, si une clé manque dans une langue,
// si un choix de langue est codé en dur (lang === 'fr' ? …) ou si un texte
// visible reste écrit en dur dans une seule langue.
import { describe, it, expect } from 'vitest'
import path from 'node:path'
// @ts-expect-error module JS sans types
import { listSourceFiles, auditDictionaries, auditLangComparisons, auditHardcodedText, auditPhysicalDirections, auditCountrySpecific, formatProblems } from '../../../scripts/i18n-audit.mjs'

const root = path.resolve(__dirname, '../../..')
const files = listSourceFiles(path.join(root, 'src'))

describe('traductions complètes dans les 5 langues', () => {
  it('trouve bien les fichiers sources', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('chaque dictionnaire a en, fr, es, ru, he (dans cet ordre) et les mêmes clés', () => {
    const problems = auditDictionaries(files)
    expect(formatProblems(problems, root)).toBe('')
  })

  it('aucun choix de langue codé en dur', () => {
    const problems = auditLangComparisons(files)
    expect(formatProblems(problems, root)).toBe('')
  })

  it('aucun texte visible écrit en dur dans une seule langue', () => {
    const problems = auditHardcodedText(files)
    expect(formatProblems(problems, root)).toBe('')
  })
})

describe('sens de lecture (hébreu de droite à gauche)', () => {
  it('aucune position gauche/droite écrite en dur', () => {
    const problems = auditPhysicalDirections(files)
    expect(formatProblems(problems, root)).toBe('')
  })
})

describe('ouverte à tous les pays', () => {
  it('ni euro, ni France/Paris, ni poste israélienne écrits en dur', () => {
    const problems = auditCountrySpecific(files)
    expect(formatProblems(problems, root)).toBe('')
  })
})

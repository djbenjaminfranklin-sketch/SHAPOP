import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Stripe refuse calc() et var() dans les styles de ses champs : le champ de carte ne s'affiche plus du tout.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : files(p)
    return /\.tsx?$/.test(n) ? [p] : []
  })
}

describe('champs Stripe', () => {
  it("aucun calc() ni var() dans les options d'un CardElement", () => {
    const bad: string[] = []
    for (const f of files(join(__dirname, '..', '..'))) {
      const src = readFileSync(f, 'utf8')
      const re = /<CardElement options=\{\{([\s\S]*?)\}\}\s*\/>/g
      let m: RegExpExecArray | null
      while ((m = re.exec(src))) if (/calc\(|var\(/.test(m[1])) bad.push(f)
    }
    expect(bad).toEqual([])
  })
})

import { displayItemTitle } from '../fulfillment'
describe('titre affiché aux acheteurs', () => {
  it('retire le code interne [ABCD]', () => {
    expect(displayItemTitle('Ordinateur portable noir [KDRZ]')).toBe('Ordinateur portable noir')
    expect(displayItemTitle('Veste en jean')).toBe('Veste en jean')
  })
})

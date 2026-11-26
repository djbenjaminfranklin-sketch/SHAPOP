import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

/**
 * Texte légal repris tel quel du site (site/assets/legal-*.js) :
 * sections = [titre, HTML limité à <p>, <ul>, <li>, <b>, <a href>] et {mail} = adresse du support.
 */
export interface LegalDoc {
  goBack: string
  title: string
  updated: string
  lede: string
  opH: string
  opP: string
  sections: [string, string][]
}

const SUPPORT_MAIL = 'support@shapop.app'
const TEXT = { fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.6 } as const

function mailLink(key: string) {
  return <a key={key} href={`mailto:${SUPPORT_MAIL}`} style={{ color: '#00E5FF' }}>{SUPPORT_MAIL}</a>
}

/** Remplace {mail} par un lien vers le support. */
function withMail(text: string, keyBase: string): ReactNode[] {
  return text.split('{mail}').flatMap((part, i) => (i === 0 ? [part] : [mailLink(`${keyBase}-m${i}`), part]))
}

interface Node { tag: string; href?: string; children: (Node | string)[] }

/** Découpe le HTML limité des textes légaux en arbre (aucun HTML injecté tel quel). */
function parse(html: string): Node {
  const root: Node = { tag: 'root', children: [] }
  const stack: Node[] = [root]
  const re = /<(\/?)(p|ul|li|b|a)((?:\s[^>]*)?)>/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m.index > last) stack[stack.length - 1].children.push(html.slice(last, m.index))
    last = re.lastIndex
    if (m[1]) { if (stack.length > 1) stack.pop(); continue }
    const href = /href="([^"]*)"/.exec(m[3])?.[1]
    const node: Node = { tag: m[2], href, children: [] }
    stack[stack.length - 1].children.push(node)
    stack.push(node)
  }
  if (last < html.length) stack[stack.length - 1].children.push(html.slice(last))
  return root
}

function render(n: Node | string, key: string): ReactNode {
  if (typeof n === 'string') return withMail(n, key)
  const kids = n.children.map((c, i) => render(c, `${key}-${i}`))
  switch (n.tag) {
    case 'p': return <p key={key} style={{ ...TEXT, marginBottom: '8px' }}>{kids}</p>
    case 'ul': return <ul key={key} style={{ ...TEXT, margin: '0 0 8px', paddingInlineStart: '20px', listStyle: 'disc' }}>{kids}</ul>
    case 'li': return <li key={key} style={{ marginBottom: '4px' }}>{kids}</li>
    case 'b': return <b key={key} style={{ color: '#ddd' }}>{kids}</b>
    case 'a': return n.href?.startsWith('/')
      ? <Link key={key} to={n.href} style={{ color: '#00E5FF' }}>{kids}</Link>
      : <a key={key} href={n.href} style={{ color: '#00E5FF' }}>{kids}</a>
    default: return kids
  }
}

function LegalHtml({ html }: { html: string }) {
  const root = parse(html)
  // Texte sans balise de bloc : on l'enveloppe dans un paragraphe.
  if (root.children.every(c => typeof c === 'string' || !['p', 'ul'].includes(c.tag))) {
    return <p style={TEXT}>{root.children.map((c, i) => render(c, `t${i}`))}</p>
  }
  return <>{root.children.map((c, i) => render(c, `t${i}`))}</>
}

export default function LegalDocument({ doc }: { doc: LegalDoc }) {
  const navigate = useNavigate()
  usePageTitle(doc.title)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label={doc.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ ...rtlFlip() }}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{doc.title}</h1>
      </div>
      <div style={{ padding: '20px 20px' }}>
        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '16px' }}>{doc.updated}</p>
        <p style={{ ...TEXT, color: '#ccc', marginBottom: '24px' }}>{withMail(doc.lede, 'lede')}</p>
        <div style={{ marginBottom: '20px' }}>
          {/* À COMPLÉTER : identité légale de l'exploitant (raison sociale, forme, numéro d'immatriculation, adresse du siège) */}
          <h2 style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{doc.opH}</h2>
          <p style={TEXT}>{withMail(doc.opP, 'op')}</p>
        </div>
        {doc.sections.map(([h, html], i) => (
          <div key={h} style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{i + 1}. {h}</h2>
            <LegalHtml html={html} />
          </div>
        ))}
      </div>
    </div>
  )
}

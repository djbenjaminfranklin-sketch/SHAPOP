// =====================================================================
// Contrôles de traduction de ShaPop (utilisés par le test automatique
// src/lib/__tests__/i18nCompleteness.test.ts et par
// scripts/check-hardcoded-text.mjs).
//
// 1. Dictionnaires : tout objet dont les clés sont des codes de langue
//    ({ en, fr, es, ru, he }) doit contenir LES 5 langues, dans cet ordre,
//    et, si ses valeurs sont des objets, les MÊMES clés dans chaque langue.
// 2. Choix de langue en dur : `lang === 'fr' ? … : …` est interdit
//    (utiliser un dictionnaire ou tr({ en, fr, es, ru, he })).
// 3. Textes visibles en dur : texte JSX, placeholder/title/alt/aria-label,
//    messages passés à alert/toast/setError…, chaînes en hébreu, russe ou
//    français hors d'un dictionnaire.
//
// Pour garder volontairement un texte (nom de marque, nom d'une langue dans
// sa propre langue…), ajouter le commentaire `i18n-ignore` sur la ligne.
// =====================================================================
import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'

export const LANGS = ['en', 'fr', 'es', 'ru', 'he']
const LANG_SET = new Set(LANGS)

export function listSourceFiles(srcDir) {
  const out = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) {
        if (e.name === '__tests__' || e.name === 'test') continue
        walk(p)
      } else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) {
        out.push(p)
      }
    }
  }
  walk(srcDir)
  return out.sort()
}

function parse(file) {
  const text = fs.readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  return { sf, lines: text.split('\n') }
}

function propName(p) {
  if (!p.name) return null
  if (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name)) return p.name.text
  return null
}

function objKeys(obj) {
  const keys = []
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isMethodDeclaration(p)) {
      const n = propName(p)
      if (n !== null) keys.push(n)
    } else if (ts.isSpreadAssignment(p)) {
      keys.push('...spread')
    }
  }
  return keys
}

function isLangDict(obj) {
  const keys = objKeys(obj)
  if (keys.length < 2) return false
  return keys.every(k => LANG_SET.has(k))
}

function unwrap(e) {
  while (e && (ts.isAsExpression(e) || ts.isSatisfiesExpression?.(e) || ts.isParenthesizedExpression(e) || ts.isTypeAssertionExpression?.(e))) e = e.expression
  return e
}

function lineOf(sf, node) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
}

function ignored(lines, line) {
  return /i18n-ignore/.test(lines[line - 1] || '') || /i18n-ignore-next-line/.test(lines[line - 2] || '')
}

function fileIgnored(lines) {
  return lines.slice(0, 5).some(l => /i18n-ignore-file/.test(l))
}

/** Problèmes de dictionnaires (langue manquante, ordre, clés différentes). */
export function auditDictionaries(files) {
  const problems = []
  for (const file of files) {
    const { sf, lines } = parse(file)
    if (fileIgnored(lines)) continue
    // variables du fichier → objet littéral (pour { fr, en, … } en raccourci)
    const vars = new Map()
    const collect = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
        const init = unwrap(n.initializer)
        if (init && ts.isObjectLiteralExpression(init)) vars.set(n.name.text, init)
      }
      ts.forEachChild(n, collect)
    }
    collect(sf)

    const visit = (n) => {
      if (ts.isObjectLiteralExpression(n) && isLangDict(n)) {
        const line = lineOf(sf, n)
        if (!ignored(lines, line)) {
          const keys = objKeys(n)
          const missing = LANGS.filter(l => !keys.includes(l))
          if (missing.length) problems.push({ file, line, message: `langue(s) manquante(s) : ${missing.join(', ')}` })
          const order = keys.filter(k => LANG_SET.has(k))
          const expected = LANGS.filter(l => order.includes(l))
          if (order.join() !== expected.join()) problems.push({ file, line, message: `ordre attendu ${LANGS.join(', ')} (trouvé ${order.join(', ')})` })
          // valeurs objets : mêmes clés partout
          const valueObjs = {}
          for (const p of n.properties) {
            const lang = propName(p)
            if (!lang) continue
            let v = null
            if (ts.isPropertyAssignment(p)) {
              const init = unwrap(p.initializer)
              if (ts.isObjectLiteralExpression(init)) v = init
              else if (ts.isIdentifier(init) && vars.has(init.text)) v = vars.get(init.text)
            } else if (ts.isShorthandPropertyAssignment(p) && vars.has(p.name.text)) {
              v = vars.get(p.name.text)
            }
            if (v && !objKeys(v).includes('...spread')) valueObjs[lang] = new Set(objKeys(v))
          }
          const ref = valueObjs.en || valueObjs[Object.keys(valueObjs)[0]]
          if (ref && Object.keys(valueObjs).length > 1) {
            for (const lang of Object.keys(valueObjs)) {
              const s = valueObjs[lang]
              const miss = [...ref].filter(k => !s.has(k))
              const extra = [...s].filter(k => !ref.has(k))
              if (miss.length) problems.push({ file, line, message: `[${lang}] clé(s) manquante(s) : ${miss.slice(0, 12).join(', ')}${miss.length > 12 ? ` (+${miss.length - 12})` : ''}` })
              if (extra.length) problems.push({ file, line, message: `[${lang}] clé(s) en trop (absentes en anglais) : ${extra.slice(0, 12).join(', ')}${extra.length > 12 ? ` (+${extra.length - 12})` : ''}` })
            }
          }
        }
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }
  return problems
}

/** Comparaisons du type lang === 'fr' (choix de texte en dur). */
export function auditLangComparisons(files) {
  const problems = []
  for (const file of files) {
    const { sf, lines } = parse(file)
    if (fileIgnored(lines)) continue
    const visit = (n) => {
      if (ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(n.operatorToken.kind)) {
        const lit = [n.left, n.right].find(x => ts.isStringLiteral(x) && ['fr', 'en', 'es', 'ru'].includes(x.text))
        const other = lit === n.left ? n.right : n.left
        const txt = other ? other.getText(sf) : ''
        if (lit && /lang|locale|language/i.test(txt)) {
          const line = lineOf(sf, n)
          if (!ignored(lines, line)) problems.push({ file, line, message: `choix de langue en dur (${n.getText(sf).slice(0, 60)}) : utiliser un dictionnaire ou tr()` })
        }
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }
  return problems
}

const TEXT_ATTRS = new Set(['placeholder', 'title', 'alt', 'aria-label', 'label', 'aria-description', 'aria-placeholder', 'aria-roledescription', 'aria-valuetext'])
const MESSAGE_CALLS = new Set(['alert', 'confirm', 'prompt', 'toast', 'showToast', 'setToast', 'setError', 'setErr', 'setErrorMsg', 'setErrorMessage', 'setMessage', 'setMsg', 'setSuccess', 'setSuccessMsg', 'setInfo', 'setStatusMsg', 'setNotice', 'setFeedback', 'setToastMsg', 'setToastMessage', 'notify', 'flash', 'setUploadError', 'setFormError', 'setSubmitError'])
const ALLOW = /^(ShaPop|SHAPOP|Shapop|LIVE|VS|OK|FAQ|EULA|PayPal|Stripe|Apple Pay|Google Pay|WhatsApp|Instagram|TikTok|Facebook|Google|Apple|iOS|Android|Email|E-mail|SMS|URL|ID|PDF|GIF|HD|4K|N\/A|x\d+|vs|QR)$/
const LETTERS = /\p{L}{2,}/u
const SCRIPT_FOREIGN = /[֐-׿Ѐ-ӿ]/ // hébreu, cyrillique
const FRENCH_HINT = /[éèêàùçôîœ]|\b(le|la|les|des|du|une|est|pour|avec|vous|votre|tu|ton|ta|tes)\b/i

function insideLangDict(node) {
  let p = node.parent
  while (p) {
    if (ts.isPropertyAssignment(p) && LANG_SET.has(propName(p) || '')) {
      const obj = p.parent
      if (obj && ts.isObjectLiteralExpression(obj) && isLangDict(obj)) return true
    }
    if (ts.isObjectLiteralExpression(p) && isLangDict(p)) return true
    // fichier de textes : const fr = { … } / const he = { … }
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && LANG_SET.has(p.name.text)) return true
    p = p.parent
  }
  return false
}

function isUserText(s) {
  const t = s.trim()
  if (!t || !LETTERS.test(t)) return false
  if (ALLOW.test(t)) return false
  if (/^[a-z0-9_.\-/:#?=&%]+$/i.test(t) && !/\s/.test(t) && !SCRIPT_FOREIGN.test(t) && !/[A-Z].*[a-z]/.test(t.slice(1))) {
    // identifiant, clé, URL, classe CSS…
    return /^[A-Z][a-z]{2,}$/.test(t) // un mot capitalisé seul (« Envoyer ») compte comme texte
  }
  if (/^(https?:|mailto:|tel:|\/|#|data:|rgba?\(|var\(|calc\()/.test(t)) return false
  return true
}

/** Textes visibles écrits en dur dans une seule langue. */
export function auditHardcodedText(files) {
  const problems = []
  for (const file of files) {
    const { sf, lines } = parse(file)
    if (fileIgnored(lines)) continue
    const push = (node, kind, text) => {
      const line = lineOf(sf, node)
      if (ignored(lines, line)) return
      problems.push({ file, line, message: `${kind} : « ${text.trim().replace(/\s+/g, ' ').slice(0, 70)} »` })
    }
    const visit = (n) => {
      // Texte JSX brut
      if (ts.isJsxText(n)) {
        const txt = n.getText(sf)
        const tag = n.parent && ts.isJsxElement(n.parent) ? n.parent.openingElement.tagName.getText(sf) : ''
        if (tag !== 'style' && tag !== 'script' && isUserText(txt) && !insideLangDict(n)) push(n, 'texte JSX', txt)
      }
      // Attributs textuels
      if (ts.isJsxAttribute(n) && n.initializer) {
        const name = n.name.getText(sf)
        if (TEXT_ATTRS.has(name)) {
          let v = n.initializer
          if (ts.isJsxExpression(v) && v.expression) v = unwrap(v.expression)
          if ((ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) && isUserText(v.text)) push(n, `attribut ${name}`, v.text)
        }
      }
      // Chaînes littérales
      if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) && !insideLangDict(n)) {
        const txt = n.text
        const parent = n.parent
        const isKey = parent && (ts.isPropertyAssignment(parent) && parent.name === n)
        const isImport = parent && (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent))
        if (!isKey && !isImport && isUserText(txt)) {
          // a) message passé à alert/toast/setError…
          let p = parent
          while (p && (ts.isConditionalExpression(p) || ts.isBinaryExpression(p) || ts.isParenthesizedExpression(p) || ts.isTemplateExpression(p) || ts.isTemplateSpan(p))) p = p.parent
          if (p && ts.isCallExpression(p)) {
            const callee = p.expression.getText(sf).split('.').pop()
            if (MESSAGE_CALLS.has(callee)) { push(n, `message ${callee}()`, txt); ts.forEachChild(n, visit); return }
          }
          // b) chaîne affichée directement dans le JSX
          if (p && ts.isJsxExpression(p) && p.parent && (ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent)) && !(ts.isJsxElement(p.parent) && ['style', 'script'].includes(p.parent.openingElement.tagName.getText(sf))) && /\s|^[A-ZÀ-Ý\p{Lu}]/u.test(txt.trim())) {
            push(n, 'texte JSX', txt); ts.forEachChild(n, visit); return
          }
          // c) écriture non latine ou français hors dictionnaire
          if (SCRIPT_FOREIGN.test(txt)) push(n, 'texte hébreu/russe hors dictionnaire', txt)
          else if (FRENCH_HINT.test(txt) && /\s/.test(txt.trim()) && !/^[\w\s-]+$/.test(txt) ) push(n, 'texte français hors dictionnaire ?', txt)
        }
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }
  return problems
}

export function formatProblems(problems, root) {
  return problems.map(p => `${path.relative(root, p.file)}:${p.line}  ${p.message}`).join('\n')
}

// ---------------------------------------------------------------------
// 4. Sens de lecture : positions gauche/droite écrites en dur.
//    Préférer marginInlineStart/End, paddingInlineStart/End,
//    insetInlineStart/End, textAlign 'start'/'end', borderInlineStart…
//    (`left: 0, right: 0` symétrique est accepté.)
// ---------------------------------------------------------------------
const PHYSICAL = new Set(['left', 'right', 'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight', 'borderLeft', 'borderRight', 'borderLeftWidth', 'borderRightWidth', 'borderLeftColor', 'borderRightColor', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'])
const PAIRS = { left: 'right', right: 'left', marginLeft: 'marginRight', marginRight: 'marginLeft', paddingLeft: 'paddingRight', paddingRight: 'paddingLeft', borderLeft: 'borderRight', borderRight: 'borderLeft' }

export function auditPhysicalDirections(files) {
  const problems = []
  for (const file of files) {
    if (!file.endsWith('.tsx')) continue
    const { sf, lines } = parse(file)
    if (fileIgnored(lines)) continue
    const visit = (n) => {
      if (ts.isObjectLiteralExpression(n)) {
        const props = {}
        for (const p of n.properties) {
          if (ts.isPropertyAssignment(p)) { const k = propName(p); if (k) props[k] = p }
        }
        for (const [k, p] of Object.entries(props)) {
          const line = lineOf(sf, p)
          if (ignored(lines, line)) continue
          if (PHYSICAL.has(k)) {
            const pair = PAIRS[k]
            if (pair && props[pair] && props[pair].initializer.getText(sf) === p.initializer.getText(sf)) continue
            // valeur dynamique déjà calculée selon le sens (isRTL / rtl ? …)
            if (/isRTL|rtl|dir\b/i.test(p.initializer.getText(sf))) continue
            problems.push({ file, line, message: `${k} : utiliser la propriété logique (InlineStart/InlineEnd) ou rtl.ts` })
          }
          if (k === 'textAlign') {
            const v = unwrap(p.initializer)
            if (ts.isStringLiteral(v) && (v.text === 'left' || v.text === 'right')) problems.push({ file, line, message: `textAlign '${v.text}' : utiliser 'start' / 'end'` })
          }
        }
      }
      if (ts.isJsxAttribute(n) && n.name.getText(sf) === 'className' && n.initializer && ts.isStringLiteral(n.initializer)) {
        const m = n.initializer.text.match(/(^|\s)(-?(ml|mr|pl|pr|left|right)-\S+|text-left|text-right|rounded-[lr]\S*|border-[lr](-\S+)?)(?=\s|$)/)
        const line = lineOf(sf, n)
        if (m && !ignored(lines, line)) problems.push({ file, line, message: `classe ${m[2]} : utiliser ms-/me-/ps-/pe-/start-/end-/text-start` })
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }
  return problems
}

// ---------------------------------------------------------------------
// 5. Ouverture à tous les pays : pas d'euro, de France/Paris ni de poste
//    israélienne écrits en dur (les montants passent par formatMoney()).
// ---------------------------------------------------------------------
const COUNTRY_ONLY = /€|\bEUR\b|\bParis\b|\bFrance\b|דואר ישראל|Israel Post|Poste israélienne|Correos de Israel|Почта Израиля/
export function auditCountrySpecific(files) {
  const problems = []
  for (const file of files) {
    const { lines } = parse(file)
    if (fileIgnored(lines)) continue
    lines.forEach((l, i) => {
      const code = l.replace(/\/\/.*$/, '')
      if (COUNTRY_ONLY.test(code) && !ignored(lines, i + 1)) {
        problems.push({ file, line: i + 1, message: `devise ou pays écrit en dur : « ${code.trim().slice(0, 80)} »` })
      }
    })
  }
  return problems
}

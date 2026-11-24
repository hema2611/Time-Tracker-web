// Reads a proposal PDF in the browser (nothing is uploaded anywhere) and pulls out
// modules, features, days, start date, UAT days and the out-of-scope list.
// Rule-based for now: it expects "Module 1: Name" headings with features listed under them.
// The real product will use AI here; the output shape stays the same.
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

async function pdfLines(file) {
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const lines = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const items = (await (await pdf.getPage(p)).getTextContent()).items.filter(i => i.str)
    const rows = new Map()
    items.forEach(i => { const y = Math.round(i.transform[5] / 3); rows.set(y, [...(rows.get(y) || []), i]) })
    ;[...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, row]) => {
      row.sort((a, b) => a.transform[4] - b.transform[4])
      let out = '', end = null
      row.forEach(i => { if (end !== null && i.transform[4] - end > 1.5 && !out.endsWith(' ')) out += ' '; out += i.str; end = i.transform[4] + i.width })
      lines.push(out.replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim())
    })
  }
  return lines.filter(Boolean)
}

const MODULE = /^(?:\d+(?:\.\d+)*\.?\s+)?module\s*\d*\s*[:\-.]\s*(.+)$/i
const HEADING = /^\d+\.\s+\S/
const BULLET = /^(?:[•●▪◦*\-]|\d+\.\d+(?:\.\d+)*[.)]?)\s+(.+)$/
const DAYS = /^(.*?)\s*[-:(]\s*(\d+(?:\.\d+)?)\s*(?:working\s+)?(day|week)s?\)?\.?$/i

export function parseProposal(lines, fileName) {
  const out = { file: fileName, modules: [], outOfScope: [], start: null, uatDays: null }
  let mod = null, inOut = false
  for (const line of lines) {
    let m
    if ((m = line.match(/start date\s*[:\-]\s*(.+)$/i))) {
      const d = new Date(m[1].replace(/\.$/, ''))
      if (!isNaN(d)) out.start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    if (!out.uatDays && (m = line.match(/(?:uat|user acceptance)\D*(\d+)\s*(?:working\s+)?days/i))) out.uatDays = +m[1]

    if ((m = line.match(MODULE))) { mod = { name: m[1].replace(/\s*\(.*\)$/, '').trim(), features: [] }; out.modules.push(mod); inOut = false; continue }
    if (HEADING.test(line)) { mod = null; inOut = /out of scope|exclusion|not included/i.test(line); continue }

    const bullet = line.match(BULLET), body = bullet ? bullet[1] : line, days = body.match(DAYS)
    if (mod && (bullet || days)) {
      // [name, weeks, daysWrittenInProposal]
      if (days) mod.features.push([days[1].trim(), +days[2] * (days[3].toLowerCase() === 'week' ? 5 : 1) / 5, true])
      else mod.features.push([body.trim(), 1, false])
    } else if (inOut) out.outOfScope.push(body.trim())
  }
  out.modules = out.modules.filter(x => x.features.length)
  return out
}

export async function readProposal(file) {
  if (!/\.pdf$/i.test(file.name)) throw new Error('Only PDF can be read in this prototype. Word files come later.')
  const p = parseProposal(await pdfLines(file), file.name)
  if (!p.modules.length) throw new Error('No modules found. The proposal needs headings like "Module 1: Inventory" with the features listed under each.')
  return p
}

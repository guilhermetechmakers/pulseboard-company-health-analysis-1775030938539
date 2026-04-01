/**
 * Server-side PDF/HTML builders for PulseBoard report exports (Deno).
 * Uses pdf-lib via esm.sh — no headless browser required.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'https://esm.sh/pdf-lib@1.17.1'

export type ReportPdfSections = {
  companyName: string
  reportTitle: string
  generatedAt: string
  executiveSummary: string
  swotLines: string[]
  financialAnalysis: string
  marketAnalysis: string
  socialAnalysis: string
  risksLines: string[]
  opportunitiesLines: string[]
  actionPlanLines: string[]
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim()
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16) / 255
    const g = parseInt(h[1] + h[1], 16) / 255
    const b = parseInt(h[2] + h[2], 16) / 255
    return { r, g, b }
  }
  if (h.length !== 6) {
    return { r: 11 / 255, g: 106 / 255, b: 247 / 255 }
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

function sanitizeText(input: string): string {
  return input.replace(/\u0000/g, '').replace(/\r\n/g, '\n')
}

function wrapLineToWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const trial = current ? `${current} ${w}` : w
    if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
      current = trial
    } else {
      if (current) lines.push(current)
      if (font.widthOfTextAtSize(w, fontSize) <= maxWidth) {
        current = w
      } else {
        let chunk = ''
        for (const ch of w) {
          const next = chunk + ch
          if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
            chunk = next
          } else {
            if (chunk) lines.push(chunk)
            chunk = ch
          }
        }
        current = chunk
      }
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawParagraphs(
  doc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  startY: number,
  margin: number,
  pageSize: readonly [number, number],
  maxWidth: number,
  lineHeight: number,
  paragraphs: string[],
  color: ReturnType<typeof rgb>,
): { page: PDFPage; y: number } {
  let y = startY
  let currentPage = page
  const pageWidth = pageSize[0]
  const pageHeight = pageSize[1]
  const bottom = margin

  for (const raw of paragraphs) {
    const p = sanitizeText(raw)
    if (!p.trim()) continue
    const wrapped = wrapLineToWidth(p, font, 11, maxWidth)
    for (const line of wrapped) {
      if (y < bottom + lineHeight) {
        currentPage = doc.addPage(pageSize)
        y = pageHeight - margin
      }
      currentPage.drawText(line, { x: margin, y: y - lineHeight, size: 11, font, color })
      y -= lineHeight
    }
    y -= lineHeight * 0.25
  }

  return { page: currentPage, y }
}

function drawHeading(
  page: PDFPage,
  boldFont: PDFFont,
  margin: number,
  y: number,
  title: string,
  accent: ReturnType<typeof rgb>,
  lineHeight: number,
): number {
  page.drawText(title, { x: margin, y: y - lineHeight * 1.2, size: 14, font: boldFont, color: accent })
  return y - lineHeight * 1.8
}

export async function buildReportPdfBytes(
  sections: ReportPdfSections,
  options: { orientation: 'portrait' | 'landscape'; primaryColor: string; secondaryColor: string },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)
  const pRgb = hexToRgb01(options.primaryColor)
  const sRgb = hexToRgb01(options.secondaryColor)
  const primary = rgb(pRgb.r, pRgb.g, pRgb.b)
  const secondary = rgb(sRgb.r, sRgb.g, sRgb.b)
  const bodyColor = rgb(0.15, 0.2, 0.25)

  const size = options.orientation === 'landscape' ? ([792, 612] as const) : ([612, 792] as const)
  let page = doc.addPage(size)
  const margin = 48
  const maxWidth = page.getWidth() - margin * 2
  const lineHeight = 14
  let y = page.getHeight() - margin

  page.drawText(sections.companyName, { x: margin, y: y - 22, size: 20, font: boldFont, color: primary })
  y -= 36
  page.drawText(sections.reportTitle, { x: margin, y: y - 16, size: 14, font: boldFont, color: secondary })
  y -= 28
  page.drawText(`Generated: ${sections.generatedAt}`, { x: margin, y: y - 12, size: 10, font, color: bodyColor })
  y -= 28

  const blocks: { title: string; body: string[] }[] = [
    { title: 'Executive summary', body: [sections.executiveSummary] },
    { title: 'SWOT', body: sections.swotLines },
    { title: 'Financial analysis', body: [sections.financialAnalysis] },
    { title: 'Market analysis', body: [sections.marketAnalysis] },
    { title: 'Social & brand analysis', body: [sections.socialAnalysis] },
    { title: 'Top risks', body: sections.risksLines },
    { title: 'Opportunities', body: sections.opportunitiesLines },
    { title: 'Prioritized action plan', body: sections.actionPlanLines },
  ]

  for (const block of blocks) {
    const hasContent = block.body.some((b) => sanitizeText(b).trim().length > 0)
    if (!hasContent) continue
    if (y < margin + lineHeight * 4) {
      page = doc.addPage(size)
      y = page.getHeight() - margin
    }
    y = drawHeading(page, boldFont, margin, y, block.title, primary, lineHeight)
    const res = drawParagraphs(doc, page, font, y, margin, size, maxWidth, lineHeight, block.body, bodyColor)
    page = res.page
    y = res.y - lineHeight
  }

  return doc.save()
}

export function buildReportHtmlDocument(
  sections: ReportPdfSections,
  options: { orientation: 'portrait' | 'landscape'; primaryColor: string; secondaryColor: string },
): string {
  const esc = (s: string) =>
    sanitizeText(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const items = (lines: string[]) =>
    (lines ?? [])
      .filter((l) => l.trim().length > 0)
      .map((l) => `<li>${esc(l)}</li>`)
      .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(sections.reportTitle)}</title>
<style>
  @page { size: ${options.orientation === 'landscape' ? 'landscape' : 'portrait'}; margin: 18mm; }
  body { font-family: Inter, system-ui, sans-serif; color: #0f172a; line-height: 1.55; font-size: 14px; }
  h1 { color: ${esc(options.primaryColor)}; font-size: 28px; margin: 0 0 8px; }
  h2 { color: ${esc(options.secondaryColor)}; font-size: 18px; margin: 24px 0 8px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  section { margin-bottom: 20px; }
  ul { padding-left: 1.2rem; }
  p { white-space: pre-wrap; }
</style>
</head>
<body>
  <h1>${esc(sections.companyName)}</h1>
  <h2>${esc(sections.reportTitle)}</h2>
  <p class="meta">Generated: ${esc(sections.generatedAt)}</p>
  <section><h2>Executive summary</h2><p>${esc(sections.executiveSummary) || '—'}</p></section>
  <section><h2>SWOT</h2><ul>${items(sections.swotLines)}</ul></section>
  <section><h2>Financial analysis</h2><p>${esc(sections.financialAnalysis) || '—'}</p></section>
  <section><h2>Market analysis</h2><p>${esc(sections.marketAnalysis) || '—'}</p></section>
  <section><h2>Social &amp; brand analysis</h2><p>${esc(sections.socialAnalysis) || '—'}</p></section>
  <section><h2>Top risks</h2><ul>${items(sections.risksLines)}</ul></section>
  <section><h2>Opportunities</h2><ul>${items(sections.opportunitiesLines)}</ul></section>
  <section><h2>Prioritized action plan</h2><ul>${items(sections.actionPlanLines)}</ul></section>
</body>
</html>`
}

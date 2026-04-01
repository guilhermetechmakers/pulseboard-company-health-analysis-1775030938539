/** PulseBoard CSV templates for the data import console (UTF-8). */

export const FINANCIALS_TEMPLATE_CSV = `revenue,expenses
120000,95000
118000,94000
`

export const MARKET_TEMPLATE_CSV = `competitor_name,notes,threat_level
Acme Co,Enterprise focus,medium
Beta LLC,Price pressure,high
`

export const SOCIAL_TEMPLATE_CSV = `channel,followers,engagement_rate
linkedin,4200,0.032
instagram,8900,0.045
`

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

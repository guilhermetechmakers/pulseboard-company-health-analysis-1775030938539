export function applyTemplate(template: string, placeholders: Record<string, string>): string {
  let out = template
  for (const [k, v] of Object.entries(placeholders)) {
    out = out.split(`{{${k}}}`).join(v)
  }
  return out
}

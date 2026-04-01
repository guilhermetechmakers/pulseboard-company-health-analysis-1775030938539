import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const KEYS = ['strengths', 'weaknesses', 'opportunities', 'threats'] as const

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : []
}

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export interface SwotQuadrantEditorProps {
  swot: Record<string, unknown>
  isSaving?: boolean
  onSave: (next: Record<string, unknown>) => void | Promise<void>
  className?: string
}

/**
 * Editable SWOT quadrants (one bullet per line). Persists structured JSON on the report row.
 */
export function SwotQuadrantEditor({ swot, isSaving, onSave, className }: SwotQuadrantEditorProps) {
  const initial = useMemo(() => {
    const o = swot !== null && typeof swot === 'object' && !Array.isArray(swot) ? swot : {}
    const rec = o as Record<string, unknown>
    return {
      strengths: asStringArray(rec.strengths).join('\n'),
      weaknesses: asStringArray(rec.weaknesses).join('\n'),
      opportunities: asStringArray(rec.opportunities).join('\n'),
      threats: asStringArray(rec.threats).join('\n'),
    }
  }, [swot])

  const [draft, setDraft] = useState(initial)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) {
      setDraft(initial)
    }
  }, [initial, editing])

  const buildPayload = (): Record<string, unknown> => ({
    strengths: linesToArray(draft.strengths),
    weaknesses: linesToArray(draft.weaknesses),
    opportunities: linesToArray(draft.opportunities),
    threats: linesToArray(draft.threats),
  })

  return (
    <Card id="section-swot" className={cn('scroll-mt-24 space-y-4 border-border/80 p-4 shadow-card', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">SWOT</h3>
          <p className="text-sm text-muted-foreground">One bullet per line; saved as structured lists for PDF export.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="h-9" onClick={() => setEditing((e) => !e)}>
            {editing ? 'Close' : 'Edit'}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="secondary"
              className="h-9"
              disabled={isSaving}
              onClick={async () => {
                await onSave(buildPayload())
                setEditing(false)
              }}
            >
              {isSaving ? 'Saving…' : 'Save SWOT'}
            </Button>
          ) : null}
        </div>
      </div>
      {editing ? (
        <div className="grid gap-4 md:grid-cols-2">
          {KEYS.map((key) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium capitalize text-foreground" htmlFor={`swot-${key}`}>
                {key}
              </label>
              <Textarea
                id={`swot-${key}`}
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                className="min-h-[120px] font-mono text-sm"
                placeholder="One item per line"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {KEYS.map((key) => (
            <div key={key} className="rounded-lg border border-border/60 p-3">
              <h4 className="mb-2 capitalize text-sm font-semibold">{key}</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {linesToArray(draft[key]).length === 0 ? (
                  <li className="list-none italic">No items</li>
                ) : (
                  linesToArray(draft[key]).map((line) => <li key={line}>{line}</li>)
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

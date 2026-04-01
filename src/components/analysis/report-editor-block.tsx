import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface ReportEditorBlockProps {
  title: string
  value: string
  onSave: (next: string) => void | Promise<void>
  isSaving?: boolean
  className?: string
  /** When set and the block is being edited, saves automatically after the user pauses typing. */
  autoSaveDebounceMs?: number
}

export function ReportEditorBlock({
  title,
  value,
  onSave,
  isSaving,
  className,
  autoSaveDebounceMs,
}: ReportEditorBlockProps) {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (!editing || autoSaveDebounceMs == null) return
    if (draft === value) return
    const timer = window.setTimeout(() => {
      void onSaveRef.current(draft)
    }, autoSaveDebounceMs)
    return () => window.clearTimeout(timer)
  }, [draft, editing, autoSaveDebounceMs, value])

  return (
    <Card className={cn('space-y-3 p-4 transition-all duration-200 hover:shadow-card', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
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
                await onSave(draft)
                setEditing(false)
              }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
        </div>
      </div>
      {editing ? (
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={title} />
      ) : (
        <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert">
          {draft.trim() ? <p className="whitespace-pre-wrap">{draft}</p> : <p className="italic">No content yet.</p>}
        </div>
      )}
    </Card>
  )
}

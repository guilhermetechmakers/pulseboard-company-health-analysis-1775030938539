import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type ReportEditorHandle = {
  flushSave: () => Promise<void>
}

export interface ReportEditorBlockProps {
  title: string
  value: string
  onSave: (next: string) => void | Promise<void>
  isSaving?: boolean
  className?: string
  /** When set and the block is being edited, saves automatically after the user pauses typing. */
  autoSaveDebounceMs?: number
  sectionId?: string
}

const HISTORY_CAP = 40

export const ReportEditorBlock = forwardRef<ReportEditorHandle, ReportEditorBlockProps>(function ReportEditorBlock(
  { title, value, onSave, isSaving, className, autoSaveDebounceMs, sectionId },
  ref,
) {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)
  const [past, setPast] = useState<string[]>([])
  const [future, setFuture] = useState<string[]>([])
  const [justSaved, setJustSaved] = useState(false)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  useEffect(() => {
    setDraft(value)
    setPast([])
    setFuture([])
  }, [value])

  useEffect(() => {
    if (!editing || autoSaveDebounceMs == null) return
    if (draft === value) return
    const timer = window.setTimeout(() => {
      void onSaveRef.current(draft)
    }, autoSaveDebounceMs)
    return () => window.clearTimeout(timer)
  }, [draft, editing, autoSaveDebounceMs, value])

  const pushHistory = useCallback((prevDraft: string, next: string) => {
    setPast((p) => [...p.slice(-(HISTORY_CAP - 1)), prevDraft])
    setFuture([])
    setDraft(next)
  }, [])

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p
      const prev = p[p.length - 1]
      setFuture((f) => [draft, ...f].slice(0, HISTORY_CAP))
      setDraft(prev)
      return p.slice(0, -1)
    })
  }, [draft])

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f
      const next = f[0]
      setPast((p) => [...p, draft].slice(-HISTORY_CAP))
      setDraft(next)
      return f.slice(1)
    })
  }, [draft])

  useImperativeHandle(
    ref,
    () => ({
      flushSave: async () => {
        if (draft !== value) {
          await onSaveRef.current(draft)
          setJustSaved(true)
          window.setTimeout(() => setJustSaved(false), 1600)
        }
      },
    }),
    [draft, value],
  )

  return (
    <Card
      id={sectionId}
      className={cn(
        'scroll-mt-24 space-y-3 border-border/80 p-4 shadow-card transition-all duration-200 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:shadow-card',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {justSaved ? (
            <span className="animate-fade-in text-xs font-medium text-accent motion-reduce:animate-none">Saved</span>
          ) : null}
          {editing ? (
            <>
              <Button type="button" variant="ghost" className="h-9 px-3 text-sm" onClick={undo} disabled={past.length === 0}>
                Undo
              </Button>
              <Button type="button" variant="ghost" className="h-9 px-3 text-sm" onClick={redo} disabled={future.length === 0}>
                Redo
              </Button>
            </>
          ) : null}
          <Button type="button" variant="ghost" className="h-9 px-3 text-sm" onClick={() => setEditing((e) => !e)}>
            {editing ? 'Close' : 'Edit'}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-3 text-sm transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100"
              disabled={isSaving}
              onClick={async () => {
                await onSave(draft)
                setEditing(false)
                setJustSaved(true)
                window.setTimeout(() => setJustSaved(false), 1600)
              }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
        </div>
      </div>
      {editing ? (
        <Textarea
          value={draft}
          onChange={(e) => pushHistory(draft, e.target.value)}
          aria-label={title}
          className="min-h-[140px] rounded-lg border-input transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/30"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault()
              if (e.shiftKey) redo()
              else undo()
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
              e.preventDefault()
              redo()
            }
          }}
        />
      ) : (
        <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert">
          {draft.trim() ? <p className="whitespace-pre-wrap">{draft}</p> : <p className="italic">No content yet.</p>}
        </div>
      )}
    </Card>
  )
})

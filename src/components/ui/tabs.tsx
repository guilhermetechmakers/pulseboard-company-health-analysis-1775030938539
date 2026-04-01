import { createContext, useContext, useId, useState, type PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  setValue: (v: string) => void
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>')
  return ctx
}

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: PropsWithChildren<{
  defaultValue: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
}>) {
  const baseId = useId()
  const [inner, setInner] = useState(defaultValue)
  const value = controlled ?? inner
  const setValue = (v: string) => {
    setInner(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ value, setValue, baseId }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex h-11 items-center justify-start gap-1 rounded-lg border border-border bg-card p-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  className,
  children,
}: PropsWithChildren<{ value: string; className?: string }>) {
  const { value: active, setValue, baseId } = useTabsContext()
  const selected = active === value
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      className={cn(
        'rounded-md px-4 py-2 text-sm font-medium transition-all duration-200',
        selected
          ? 'border-b-2 border-primary bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
      onClick={() => setValue(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children,
}: PropsWithChildren<{ value: string; className?: string }>) {
  const { value: active, baseId } = useTabsContext()
  if (active !== value) return null
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      className={cn('mt-6 animate-fade-in focus:outline-none', className)}
      tabIndex={0}
    >
      {children}
    </div>
  )
}

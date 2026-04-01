import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { fireAndForgetInvalidateCompanyCache } from '@/lib/pulse-cache-api'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'

type FinancialsRow = Database['public']['Tables']['company_financials']['Row']

const financialSchema = z.object({
  revenue: z.string().optional(),
  expenses: z.string().optional(),
  profit: z.string().optional(),
  cash: z.string().optional(),
  debt: z.string().optional(),
})

export type FinancialsFormValues = z.infer<typeof financialSchema>

function parseOptNum(s: string | undefined): number | null {
  const t = (s ?? '').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export interface FinancialsFormProps {
  companyId: string
  financials: FinancialsRow | null
  className?: string
}

export function FinancialsForm({ companyId, financials, className }: FinancialsFormProps) {
  const queryClient = useQueryClient()
  const finForm = useForm<FinancialsFormValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      revenue: financials?.revenue != null ? String(financials.revenue) : '',
      expenses: financials?.expenses != null ? String(financials.expenses) : '',
      profit: financials?.profit != null ? String(financials.profit) : '',
      cash: financials?.cash != null ? String(financials.cash) : '',
      debt: financials?.debt != null ? String(financials.debt) : '',
    },
  })

  useEffect(() => {
    finForm.reset({
      revenue: financials?.revenue != null ? String(financials.revenue) : '',
      expenses: financials?.expenses != null ? String(financials.expenses) : '',
      profit: financials?.profit != null ? String(financials.profit) : '',
      cash: financials?.cash != null ? String(financials.cash) : '',
      debt: financials?.debt != null ? String(financials.debt) : '',
    })
  }, [financials, finForm])

  const saveFinancials = useMutation({
    mutationFn: async (values: FinancialsFormValues) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const perMonth = Array.isArray(financials?.per_month_metrics) ? financials.per_month_metrics : []
      const { error } = await supabase.from('company_financials').upsert(
        {
          company_id: companyId,
          revenue: parseOptNum(values.revenue),
          expenses: parseOptNum(values.expenses),
          profit: parseOptNum(values.profit),
          cash: parseOptNum(values.cash),
          debt: parseOptNum(values.debt),
          per_month_metrics: perMonth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success('Financials saved')
      fireAndForgetInvalidateCompanyCache(companyId)
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-analysis-context', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })

  return (
    <Card className={cn('border-border/80 p-6 shadow-card', className)}>
      <h3 className="text-base font-semibold">Financials</h3>
      <p className="mb-4 text-sm text-muted-foreground">Monthly or TTM figures; used by the scoring engine.</p>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={finForm.handleSubmit((v) => void saveFinancials.mutateAsync(v))}
        noValidate
      >
        {(['revenue', 'expenses', 'profit', 'cash', 'debt'] as const).map((field) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={`fin-${field}`} className="capitalize">
              {field === 'profit' ? 'Profit margin %' : field}
            </Label>
            <Input id={`fin-${field}`} className="rounded-lg" inputMode="decimal" {...finForm.register(field)} />
          </div>
        ))}
        <div className="md:col-span-2">
          <p className="text-xs text-muted-foreground">
            Tip: profit field maps to margin % in quick workspace; use the dedicated financials route for CAC/LTV and uploads.
          </p>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" variant="primary" disabled={saveFinancials.isPending} className="min-h-[44px]">
            {saveFinancials.isPending ? 'Saving…' : 'Save financials'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

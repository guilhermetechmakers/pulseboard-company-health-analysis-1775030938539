import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { fireAndForgetInvalidateCompanyCache } from '@/lib/pulse-cache-api'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'

type MarketRow = Database['public']['Tables']['company_market_data']['Row']

const marketSchema = z.object({
  competitors: z.string().optional(),
  trends: z.string().optional(),
})

export type MarketDataFormValues = z.infer<typeof marketSchema>

function parseLines(s: string | undefined): string[] {
  const t = (s ?? '').trim()
  if (!t) return []
  return t
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
}

function linesFromCompetitors(raw: unknown): string {
  if (!Array.isArray(raw)) return ''
  return raw
    .map((c) => {
      if (typeof c === 'string') return c
      if (c !== null && typeof c === 'object' && 'name' in c) {
        const n = (c as { name?: unknown }).name
        return typeof n === 'string' ? n : ''
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function linesFromTrends(raw: unknown): string {
  if (!Array.isArray(raw)) return ''
  return raw.map((c) => (typeof c === 'string' ? c : String(c))).join('\n')
}

export interface MarketDataFormProps {
  companyId: string
  market: MarketRow | null
  className?: string
}

export function MarketDataForm({ companyId, market, className }: MarketDataFormProps) {
  const queryClient = useQueryClient()

  const marketForm = useForm<MarketDataFormValues>({
    resolver: zodResolver(marketSchema),
    defaultValues: {
      competitors: linesFromCompetitors(market?.competitors),
      trends: linesFromTrends(market?.trends),
    },
  })

  useEffect(() => {
    marketForm.reset({
      competitors: linesFromCompetitors(market?.competitors),
      trends: linesFromTrends(market?.trends),
    })
  }, [market, marketForm])

  const saveMarket = useMutation({
    mutationFn: async (values: MarketDataFormValues) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const competitors = parseLines(values.competitors).map((name) => ({ name }))
      const trends = parseLines(values.trends)
      const pricingMatrix = Array.isArray(market?.pricing_matrix) ? market.pricing_matrix : []
      const { error } = await supabase.from('company_market_data').upsert(
        {
          company_id: companyId,
          competitors,
          pricing_matrix: pricingMatrix,
          trends,
          opportunities: Array.isArray(market?.opportunities) ? market.opportunities : [],
          threats: Array.isArray(market?.threats) ? market.threats : [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success('Market data saved')
      fireAndForgetInvalidateCompanyCache(companyId)
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-analysis-context', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })

  return (
    <Card className={cn('border-border/80 p-6 shadow-card', className)}>
      <h3 className="text-base font-semibold">Market</h3>
      <p className="mb-4 text-sm text-muted-foreground">One competitor per line; one trend per line.</p>
      <form className="space-y-4" onSubmit={marketForm.handleSubmit((v) => void saveMarket.mutateAsync(v))} noValidate>
        <div className="space-y-2">
          <Label htmlFor="mkt-comp">Competitors</Label>
          <Textarea id="mkt-comp" className="min-h-[100px] rounded-lg font-mono text-sm" {...marketForm.register('competitors')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mkt-trends">Market trends</Label>
          <Textarea id="mkt-trends" className="min-h-[100px] rounded-lg font-mono text-sm" {...marketForm.register('trends')} />
        </div>
        <Button type="submit" variant="primary" disabled={saveMarket.isPending} className="min-h-[44px]">
          {saveMarket.isPending ? 'Saving…' : 'Save market data'}
        </Button>
      </form>
    </Card>
  )
}

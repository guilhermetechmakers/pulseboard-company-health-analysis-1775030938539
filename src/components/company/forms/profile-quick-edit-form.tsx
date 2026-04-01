import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { fireAndForgetInvalidateCompanyCache } from '@/lib/pulse-cache-api'
import type { CompanyRow } from '@/types/integrations'
import { cn } from '@/lib/utils'

const quickSchema = z.object({
  name: z.string().min(1, 'Name required'),
  industry: z.string().optional(),
  stage: z.string().optional(),
})

export type ProfileQuickEditValues = z.infer<typeof quickSchema>

export interface ProfileQuickEditFormProps {
  companyId: string
  company: CompanyRow
  onSaved?: () => void
  className?: string
}

export function ProfileQuickEditForm({ companyId, company, onSaved, className }: ProfileQuickEditFormProps) {
  const queryClient = useQueryClient()
  const form = useForm<ProfileQuickEditValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      name: company.name ?? '',
      industry: company.industry ?? '',
      stage: company.stage ?? '',
    },
  })

  useEffect(() => {
    form.reset({
      name: company.name ?? '',
      industry: company.industry ?? '',
      stage: company.stage ?? '',
    })
  }, [company, form])

  const save = useMutation({
    mutationFn: async (values: ProfileQuickEditValues) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { error } = await supabase
        .from('companies')
        .update({
          name: values.name,
          industry: values.industry || null,
          stage: values.stage || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success('Updated')
      fireAndForgetInvalidateCompanyCache(companyId)
      await queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
      onSaved?.()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })

  return (
    <form
      className={cn('grid gap-3 sm:grid-cols-3', className)}
      onSubmit={form.handleSubmit((v) => void save.mutateAsync(v))}
      noValidate
      aria-label="Quick edit company header fields"
    >
      <div className="space-y-1.5">
        <Label htmlFor="qe-name" className="text-xs">
          Name
        </Label>
        <Input id="qe-name" className="h-9 rounded-lg text-sm" {...form.register('name')} />
        {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="qe-ind" className="text-xs">
          Industry
        </Label>
        <Input id="qe-ind" className="h-9 rounded-lg text-sm" {...form.register('industry')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="qe-stage" className="text-xs">
          Stage / tagline
        </Label>
        <Input id="qe-stage" className="h-9 rounded-lg text-sm" placeholder="Seed, Series A…" {...form.register('stage')} />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" variant="secondary" className="min-h-[40px] px-3 py-2 text-xs hover:scale-100" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save quick edits'}
        </Button>
      </div>
    </form>
  )
}

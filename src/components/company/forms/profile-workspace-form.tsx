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
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { fireAndForgetInvalidateCompanyCache } from '@/lib/pulse-cache-api'
import type { CompanyRow } from '@/types/integrations'
import { cn } from '@/lib/utils'

const profileSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  industry: z.string().optional(),
  stage: z.string().optional(),
  website: z.string().optional(),
  business_model: z.string().optional(),
  target_customer: z.string().optional(),
  goals: z.string().optional(),
  products: z.string().optional(),
})

export type ProfileWorkspaceValues = z.infer<typeof profileSchema>

export interface ProfileWorkspaceFormProps {
  companyId: string
  company: CompanyRow
  className?: string
}

export function ProfileWorkspaceForm({ companyId, company, className }: ProfileWorkspaceFormProps) {
  const queryClient = useQueryClient()
  const profileForm = useForm<ProfileWorkspaceValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: company.name ?? '',
      industry: company.industry ?? '',
      stage: company.stage ?? '',
      website: company.website ?? '',
      business_model: company.business_model ?? '',
      target_customer: company.target_customers ?? company.target_customer ?? '',
      goals: company.goals ?? '',
      products: company.products ?? '',
    },
  })

  useEffect(() => {
    profileForm.reset({
      name: company.name ?? '',
      industry: company.industry ?? '',
      stage: company.stage ?? '',
      website: company.website ?? '',
      business_model: company.business_model ?? '',
      target_customer: company.target_customers ?? company.target_customer ?? '',
      goals: company.goals ?? '',
      products: company.products ?? '',
    })
  }, [company, profileForm])

  const saveProfile = useMutation({
    mutationFn: async (values: ProfileWorkspaceValues) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { error } = await supabase
        .from('companies')
        .update({
          name: values.name,
          industry: values.industry || null,
          stage: values.stage || null,
          website: values.website || null,
          business_model: values.business_model || null,
          target_customer: values.target_customer || null,
          target_customers: values.target_customer || null,
          goals: values.goals || null,
          products: values.products || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success('Profile saved')
      fireAndForgetInvalidateCompanyCache(companyId)
      await queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })

  return (
    <Card className={cn('border-border/80 p-6 shadow-card', className)}>
      <h3 className="text-base font-semibold">Profile</h3>
      <p className="mb-4 text-sm text-muted-foreground">Required for quality AI output: name and industry.</p>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={profileForm.handleSubmit((v) => void saveProfile.mutateAsync(v))}
        noValidate
      >
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cw-name">Company name *</Label>
          <Input id="cw-name" className="rounded-lg" {...profileForm.register('name')} aria-invalid={Boolean(profileForm.formState.errors.name)} />
          {profileForm.formState.errors.name ? (
            <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cw-industry">Industry</Label>
          <Input id="cw-industry" className="rounded-lg" {...profileForm.register('industry')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cw-stage">Stage</Label>
          <Input id="cw-stage" className="rounded-lg" {...profileForm.register('stage')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cw-website">Website</Label>
          <Input id="cw-website" className="rounded-lg" placeholder="https://…" {...profileForm.register('website')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cw-bm">Business model</Label>
          <Textarea id="cw-bm" className="min-h-[72px] rounded-lg" {...profileForm.register('business_model')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cw-products">Products / services</Label>
          <Textarea id="cw-products" className="min-h-[72px] rounded-lg" {...profileForm.register('products')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cw-tc">Target customer</Label>
          <Textarea id="cw-tc" className="min-h-[72px] rounded-lg" {...profileForm.register('target_customer')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cw-goals">Goals</Label>
          <Textarea id="cw-goals" className="min-h-[72px] rounded-lg" {...profileForm.register('goals')} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" variant="primary" disabled={saveProfile.isPending} className="min-h-[44px]">
            {saveProfile.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

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
import { asArray } from '@/lib/safe-data'
import { cn } from '@/lib/utils'

type SocialRow = Database['public']['Tables']['company_social']['Row']

const socialSchema = z.object({
  followers: z.string().optional(),
  engagement_rate: z.string().optional(),
  posts_count: z.string().optional(),
  website_traffic: z.string().optional(),
})

export type SocialBrandFormValues = z.infer<typeof socialSchema>

function parseOptNum(s: string | undefined): number | null {
  const t = (s ?? '').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export interface SocialBrandFormProps {
  companyId: string
  social: SocialRow | null
  className?: string
}

export function SocialBrandForm({ companyId, social, className }: SocialBrandFormProps) {
  const queryClient = useQueryClient()
  const socialForm = useForm<SocialBrandFormValues>({
    resolver: zodResolver(socialSchema),
    defaultValues: {
      followers: social?.followers != null ? String(social.followers) : '',
      engagement_rate: social?.engagement_rate != null ? String(social.engagement_rate) : '',
      posts_count: social?.posts_count != null ? String(social.posts_count) : '',
      website_traffic: social?.website_traffic != null ? String(social.website_traffic) : '',
    },
  })

  useEffect(() => {
    socialForm.reset({
      followers: social?.followers != null ? String(social.followers) : '',
      engagement_rate: social?.engagement_rate != null ? String(social.engagement_rate) : '',
      posts_count: social?.posts_count != null ? String(social.posts_count) : '',
      website_traffic: social?.website_traffic != null ? String(social.website_traffic) : '',
    })
  }, [social, socialForm])

  const saveSocial = useMutation({
    mutationFn: async (values: SocialBrandFormValues) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const followers = parseOptNum(values.followers)
      const engagement = parseOptNum(values.engagement_rate)
      const posts = parseOptNum(values.posts_count)
      const traffic = parseOptNum(values.website_traffic)
      const brandMentions = asArray(social?.brand_mentions)
      const postMetrics = asArray(social?.post_metrics)
      const { error } = await supabase.from('company_social').upsert(
        {
          company_id: companyId,
          followers: followers != null ? Math.round(followers) : null,
          engagement_rate: engagement,
          posts_count: posts != null ? Math.round(posts) : null,
          website_traffic: traffic != null ? Math.round(traffic) : null,
          brand_mentions: brandMentions,
          post_metrics: postMetrics,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success('Social & brand saved')
      fireAndForgetInvalidateCompanyCache(companyId)
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-analysis-context', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })

  return (
    <Card className={cn('border-border/80 p-6 shadow-card', className)}>
      <h3 className="text-base font-semibold">Social & brand</h3>
      <p className="mb-4 text-sm text-muted-foreground">Engagement rate as decimal (e.g. 0.04 for 4%).</p>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={socialForm.handleSubmit((v) => void saveSocial.mutateAsync(v))}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="soc-followers">Followers</Label>
          <Input id="soc-followers" className="rounded-lg" inputMode="numeric" {...socialForm.register('followers')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="soc-eng">Engagement rate</Label>
          <Input id="soc-eng" className="rounded-lg" inputMode="decimal" {...socialForm.register('engagement_rate')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="soc-posts">Posts count</Label>
          <Input id="soc-posts" className="rounded-lg" inputMode="numeric" {...socialForm.register('posts_count')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="soc-traffic">Website traffic</Label>
          <Input id="soc-traffic" className="rounded-lg" inputMode="numeric" {...socialForm.register('website_traffic')} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" variant="primary" disabled={saveSocial.isPending} className="min-h-[44px]">
            {saveSocial.isPending ? 'Saving…' : 'Save social & brand'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

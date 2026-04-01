import { Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface SocialLoginButtonsProps {
  redirectPath?: string
}

const origin = typeof window !== 'undefined' ? window.location.origin : ''

export function SocialLoginButtons({ redirectPath = '/dashboard' }: SocialLoginButtonsProps) {
  const redirectTo = `${origin}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`

  async function oauth(provider: 'google' | 'github' | 'azure') {
    if (!supabase) {
      toast.error('Supabase is not configured')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) {
      toast.error(error.message ?? 'Sign-in failed')
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Button type="button" variant="secondary" className="w-full" onClick={() => void oauth('google')} aria-label="Continue with Google">
        <span className="mr-2 font-semibold text-primary">G</span>
        Google
      </Button>
      <Button type="button" variant="secondary" className="w-full" onClick={() => void oauth('github')} aria-label="Continue with GitHub">
        <Github className="mr-2 h-4 w-4" aria-hidden />
        GitHub
      </Button>
      <Button type="button" variant="secondary" className="w-full" onClick={() => void oauth('azure')} aria-label="Continue with Microsoft">
        <span className="mr-2 text-xs font-semibold">MS</span>
        Microsoft
      </Button>
    </div>
  )
}

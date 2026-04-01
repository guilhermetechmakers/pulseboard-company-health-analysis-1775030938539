import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginFormValues } from '@/lib/auth-schemas'
import { cn } from '@/lib/utils'

interface AuthCredentialsFormProps {
  isLoading: boolean
  onSubmit: (data: LoginFormValues) => void
  className?: string
}

/** Email + password fields for sign-in — signup uses the dedicated `SignupPage` form. */
export function AuthCredentialsForm({ isLoading, onSubmit, className }: AuthCredentialsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-4', className)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className="h-11 rounded-lg border-input"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email?.message ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="auth-password">Password</Label>
          <Link to="/password-reset" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input
          id="auth-password"
          type="password"
          autoComplete="current-password"
          className="h-11 rounded-lg border-input"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password?.message ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>
      <Button
        type="submit"
        className="h-11 w-full rounded-lg bg-primary font-medium text-primary-foreground shadow-md transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
        disabled={isLoading}
      >
        {isLoading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}

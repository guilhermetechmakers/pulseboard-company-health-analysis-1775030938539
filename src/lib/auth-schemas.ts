import { z } from 'zod'

export const emailSchema = z.string().trim().email('Enter a valid email address.')

export const passwordComplexity = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[A-Z]/, 'Include an uppercase letter.')
  .regex(/[0-9]/, 'Include a number.')
  .regex(/[^a-zA-Z0-9]/, 'Include a symbol.')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
})

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordComplexity,
    confirmPassword: z.string(),
    fullName: z.string().trim().min(1, 'Name is required.').max(120),
    companyName: z.string().max(200).optional(),
    role: z.enum(['founder', 'consultant', 'investor', 'other']),
    planId: z.enum(['free', 'pro', 'agency']),
    signupOrigin: z.enum(['direct', 'trial', 'referral', 'organic', 'search', 'ads']),
    consent: z.boolean().refine((v) => v === true, { message: 'Accept the privacy policy to continue.' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type SignupFormValues = z.infer<typeof signupSchema>

export type LoginFormValues = z.infer<typeof loginSchema>

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export const newPasswordSchema = z
  .object({
    password: passwordComplexity,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const passwordResetConfirmSchema = newPasswordSchema

export const profilePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordComplexity,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const profileBasicsSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required.').max(120),
})

export type ProfileBasicsValues = z.infer<typeof profileBasicsSchema>

export type ProfilePasswordValues = z.infer<typeof profilePasswordSchema>

export function evaluatePasswordStrength(password: string): { score: number; label: string } {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  const capped = Math.min(score, 4)
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'] as const
  return { score: capped, label: labels[capped] ?? 'Weak' }
}

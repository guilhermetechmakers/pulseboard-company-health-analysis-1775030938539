import { z } from 'zod'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUuid(s: string): boolean {
  return UUID_RE.test(s)
}

export const auditLogsListParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  actorId: z.string().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
})

export type AuditLogsListParamsInput = z.input<typeof auditLogsListParamsSchema>
export type AuditLogsListParams = z.output<typeof auditLogsListParamsSchema>

export function parseAuditLogsListParams(input: unknown): AuditLogsListParams {
  const base = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  return auditLogsListParamsSchema.parse(base)
}

const looseRecord = z.record(z.string(), z.unknown())

export const auditLogCreateBodySchema = z.object({
  action: z.string().trim().min(1, 'action required'),
  actorId: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === '' || isValidUuid(v), { message: 'actorId must be UUID' }),
  target: looseRecord.optional(),
  notes: z.string().max(20000).optional(),
})

export type AuditLogCreateBody = z.infer<typeof auditLogCreateBodySchema>

export function parseAuditLogCreateBody(input: unknown): AuditLogCreateBody {
  const base = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  return auditLogCreateBodySchema.parse(base)
}

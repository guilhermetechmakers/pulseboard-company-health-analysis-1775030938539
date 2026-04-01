import { corsHeaders } from './cors.ts'

/**
 * Defense-in-depth: when the SPA sends `X-Active-Company-Id`, it must match the `companyId`
 * in the JSON body (or the report's company) so cross-company requests fail fast even if a client bug
 * mixes identifiers.
 */
export function companyScopeMismatchResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Active company scope mismatch',
      code: 'COMPANY_SCOPE_MISMATCH',
      remediation:
        'PulseBoard runs in single-company mode. Reload your workspace or ensure the active company id matches this request.',
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

/** Accepts canonical `X-Active-Company-Id` and legacy `X-PulseBoard-Active-Company-Id` from older clients. */
export function readNormalizedActiveCompanyHeader(req: Request): string {
  return (
    req.headers.get('x-active-company-id')?.trim() ||
    req.headers.get('x-pulseboard-active-company-id')?.trim() ||
    ''
  )
}

export function rejectIfActiveCompanyHeaderMismatch(req: Request, bodyCompanyId: string): Response | null {
  const h = readNormalizedActiveCompanyHeader(req)
  if (!h) return null
  if (h === bodyCompanyId) return null
  return companyScopeMismatchResponse()
}

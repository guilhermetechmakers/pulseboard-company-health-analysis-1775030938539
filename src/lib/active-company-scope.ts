/**
 * Pure guard for correlating optional active-company headers with explicit company ids in payloads.
 * Mirrors Edge Function rules for unit tests.
 */
export function describeActiveCompanyScopeConflict(): string {
  return 'X-Active-Company-Id must match the company id on this request in single-company mode.'
}

export function isActiveCompanyHeaderAligned(
  headerValue: string | null | undefined,
  bodyCompanyId: string,
): boolean {
  const h = headerValue?.trim() ?? ''
  if (!h) return true
  return h === bodyCompanyId
}

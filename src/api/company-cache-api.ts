/**
 * Cache-aware company workspace reads (Edge `pulse-cache-api` + browser TTL).
 */
export {
  invokePulseCacheApi,
  fireAndForgetInvalidateCompanyCache,
  fireAndForgetInvalidateReportCache,
} from '@/lib/pulse-cache-api'

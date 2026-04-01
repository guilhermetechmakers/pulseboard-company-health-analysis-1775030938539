/**
 * In-memory TTL cache for Edge Function isolates. JSON round-trip avoids circular references.
 */
interface CacheEntry<T = unknown> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry>()

export function ttlCacheGet<T>(key: string): T | undefined {
  const e = store.get(key)
  if (!e) return undefined
  if (Date.now() > e.expiresAt) {
    store.delete(key)
    return undefined
  }
  return e.value as T
}

export function ttlCacheSet<T>(key: string, value: T, ttlMs: number): void {
  let cloned: T
  try {
    cloned = JSON.parse(JSON.stringify(value)) as T
  } catch {
    cloned = value
  }
  store.set(key, { value: cloned, expiresAt: Date.now() + ttlMs })
}

export function ttlCacheDeleteKey(key: string): void {
  store.delete(key)
}

/** Deletes all keys with the given prefix (e.g. `company:uuid:`). */
export function ttlCacheDeletePrefix(prefix: string): number {
  let n = 0
  for (const k of [...store.keys()]) {
    if (k.startsWith(prefix)) {
      store.delete(k)
      n += 1
    }
  }
  return n
}

export function ttlCacheSize(): number {
  return store.size
}

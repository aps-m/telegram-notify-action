/** Redact tokens before logging, including tokens embedded in request URLs. */
export function redactToken(value: string, token: string): string {
  if (token === '') return value
  return value
    .split(token)
    .join('***')
    .split(encodeURIComponent(token))
    .join('***')
}

/** Keep useful error fields without dumping request payloads or headers. */
export function formatErrorDiagnostics(error: unknown, token: string): string {
  const seen = new Set<object>()
  const describe = (value: unknown, depth: number): unknown => {
    if (typeof value !== 'object' || value === null) {
      return String(value)
    }
    if (seen.has(value)) return '[circular error]'
    if (depth >= 5) return '[error nesting limit]'
    seen.add(value)

    const source = value as Record<string, unknown>
    const details: Record<string, unknown> = {}
    for (const field of [
      'name',
      'message',
      'code',
      'type',
      'errno',
      'syscall',
      'error_code',
      'description'
    ]) {
      const fieldValue = source[field]
      if (
        typeof fieldValue === 'string' ||
        typeof fieldValue === 'number' ||
        typeof fieldValue === 'boolean'
      ) {
        details[field] = fieldValue
      }
    }
    for (const field of ['error', 'cause']) {
      if (source[field] !== undefined) {
        details[field] = describe(source[field], depth + 1)
      }
    }
    return details
  }

  return redactToken(JSON.stringify(describe(error, 0)), token)
}

import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (detail && typeof detail === 'object' && 'message' in detail) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Um erro inesperado ocorreu.'
  }
  const fieldErrors = extractFieldErrors(error)
  const msgs = Object.entries(fieldErrors).map(([field, msg]) => `${field}: ${msg}`)

  if (msgs.length > 0) {
    return msgs.join(' | ')
  }

  if (error.response && error.response.error && error.response.details) {
    return `${error.response.error} - ${error.response.details}`
  }

  return error.message || 'Um erro inesperado ocorreu ao processar a requisição.'
}

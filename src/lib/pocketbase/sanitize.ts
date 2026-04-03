import schema from './schema.json'

const enumTranslations: Record<string, string> = {
  Reunião: 'Meeting',
  Audiência: 'Hearing',
  Prazo: 'Deadline',
  Atendimento: 'Call',
  Tarefa: 'Task',
  Lembrete: 'Reminder',
  Anotação: 'Note',
  'E-mail': 'Email',
}

export function sanitizePayload(collectionName: string, data: any, activeOrganization?: string) {
  const collection = schema.collections.find((c: any) => c.name === collectionName)
  if (!collection) return data

  const validFields = collection.fields.map((f: any) => f.name)
  const sanitized: any = {}

  for (const key of Object.keys(data)) {
    if (validFields.includes(key) && data[key] !== undefined) {
      const fieldDef = collection.fields.find((f: any) => f.name === key)
      let val = data[key]

      // Nullify empty strings for relations to prevent 400 Bad Request
      if (fieldDef?.type === 'relation' && (val === '' || val === 'none')) {
        val = null
      }

      // Map Enums safely
      if (fieldDef?.type === 'select' && fieldDef.selectValues && val !== null && val !== '') {
        if (!fieldDef.selectValues.includes(val)) {
          const mapped = enumTranslations[val] || val
          if (fieldDef.selectValues.includes(mapped)) {
            val = mapped
          } else {
            val = fieldDef.selectValues[0] // Fallback to first valid option
          }
        }
      }

      sanitized[key] = val
    }
  }

  if (validFields.includes('organization') && activeOrganization && !sanitized.organization) {
    sanitized.organization = activeOrganization
  }

  return sanitized
}

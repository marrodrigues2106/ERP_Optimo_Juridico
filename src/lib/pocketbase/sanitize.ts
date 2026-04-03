import schema from './schema.json'

export function sanitizePayload(collectionName: string, data: any, activeOrganization?: string) {
  const collection = schema.collections.find((c: any) => c.name === collectionName)
  if (!collection) return data

  const validFields = collection.fields.map((f: any) => f.name)
  const sanitized: any = {}

  for (const key of Object.keys(data)) {
    if (validFields.includes(key) && data[key] !== undefined) {
      sanitized[key] = data[key]
    }
  }

  if (validFields.includes('organization') && activeOrganization && !sanitized.organization) {
    sanitized.organization = activeOrganization
  }

  return sanitized
}

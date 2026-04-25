import pb from '@/lib/pocketbase/client'
import { sanitizePayload } from '@/lib/pocketbase/sanitize'
import { logAudit } from './audit'

export const getLegalCases = async () => {
  return pb.collection('legal_cases').getFullList({
    filter: 'deleted_at = ""',
    expand: 'client,responsible_collaborator',
    sort: '-created',
  })
}

export const getLegalCase = (id: string) =>
  pb
    .collection('legal_cases')
    .getOne(id, { expand: 'client,responsible_collaborator,related_cases,organization' })

const sanitizeCase = (data: any) => {
  if (data.lifecycle_status !== undefined) {
    if (data.lifecycle_status === 'Excluído') data.lifecycle_status = 'Arquivado'
    if (!['Ativo', 'Inativo', 'Arquivado', 'Suspenso'].includes(data.lifecycle_status)) {
      data.lifecycle_status = 'Ativo'
    }
  }
  if (data.type !== undefined) {
    if (!['Processo', 'Serviço Jurídico'].includes(data.type)) {
      data.type = 'Processo'
    }
  }
  if (data.client === 'none') data.client = null
  if (data.client && !Array.isArray(data.client)) {
    data.client = [data.client]
  }
  if (data.responsible_collaborator === 'none') data.responsible_collaborator = null
  return data
}

export const createLegalCase = async (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = sanitizeCase(data)
  const sanitized = sanitizePayload('legal_cases', data, orgId)
  const record = await pb.collection('legal_cases').create(sanitized)
  await logAudit('legal_cases', record.id, 'create', sanitized)
  return record
}

export const updateLegalCase = async (id: string, data: any) => {
  const orgId = pb.authStore.record?.active_organization
  data = sanitizeCase(data)
  const sanitized = sanitizePayload('legal_cases', data, orgId)
  const record = await pb.collection('legal_cases').update(id, sanitized)
  await logAudit('legal_cases', record.id, 'update', sanitized)
  return record
}

export const deleteLegalCase = async (id: string) => {
  const caseRecord = await getLegalCase(id)
  if (caseRecord.lifecycle_status !== 'Arquivado') {
    throw new Error('Apenas processos com status "Arquivado" podem ser excluídos.')
  }
  await pb.collection('legal_cases').delete(id)
  await logAudit('legal_cases', id, 'delete')
}

export const toggleFavoriteLegalCase = async (id: string, is_favorite: boolean) => {
  const record = await pb.collection('legal_cases').update(id, { is_favorite })
  await logAudit('legal_cases', record.id, 'update', { is_favorite })
  return record
}

export const bulkFavoriteLegalCases = async (ids: string[], is_favorite: boolean = true) => {
  const promises = ids.map(async (id) => {
    const record = await pb.collection('legal_cases').update(id, { is_favorite })
    await logAudit('legal_cases', record.id, 'update', { is_favorite })
    return record
  })
  return Promise.all(promises)
}

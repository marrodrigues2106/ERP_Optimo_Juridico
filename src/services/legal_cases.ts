import pb from '@/lib/pocketbase/client'
import { sanitizePayload } from '@/lib/pocketbase/sanitize'
import { logAudit } from './audit'

export const getLegalCases = () =>
  pb
    .collection('legal_cases')
    .getFullList({ expand: 'client,responsible_collaborator', sort: '-created' })

export const getLegalCase = (id: string) =>
  pb
    .collection('legal_cases')
    .getOne(id, { expand: 'client,responsible_collaborator,related_cases' })

const sanitizeCase = (data: any) => {
  if (data.lifecycle_status !== undefined) {
    if (data.lifecycle_status === 'Excluído') data.lifecycle_status = 'Arquivado'
    if (!['Ativo', 'Arquivado', 'Suspenso'].includes(data.lifecycle_status)) {
      data.lifecycle_status = 'Ativo'
    }
  }
  if (data.type !== undefined) {
    if (!['Processo', 'Serviço Jurídico'].includes(data.type)) {
      data.type = 'Processo'
    }
  }
  if (data.client === 'none') data.client = null
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
  await pb.collection('legal_cases').delete(id)
  await logAudit('legal_cases', id, 'delete')
}

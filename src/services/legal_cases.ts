import pb from '@/lib/pocketbase/client'

export const getLegalCases = () =>
  pb
    .collection('legal_cases')
    .getFullList({ expand: 'client,responsible_collaborator', sort: '-created' })

export const getLegalCase = (id: string) =>
  pb
    .collection('legal_cases')
    .getOne(id, { expand: 'client,responsible_collaborator,related_cases' })

const sanitizeCase = (data: any) => {
  if (data.lifecycle_status === 'Excluído') data.lifecycle_status = 'Arquivado'
  if (!['Ativo', 'Arquivado', 'Suspenso'].includes(data.lifecycle_status)) {
    data.lifecycle_status = 'Ativo'
  }
  if (!['Processo', 'Serviço Jurídico'].includes(data.type)) {
    data.type = 'Processo'
  }
  if (data.client === 'none') data.client = null
  if (data.responsible_collaborator === 'none') data.responsible_collaborator = null
  return data
}

export const createLegalCase = (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = sanitizeCase(data)
  data.organization = orgId
  return pb.collection('legal_cases').create(data)
}

export const updateLegalCase = (id: string, data: any) => {
  data = sanitizeCase(data)
  return pb.collection('legal_cases').update(id, data)
}

export const deleteLegalCase = (id: string) => pb.collection('legal_cases').delete(id)

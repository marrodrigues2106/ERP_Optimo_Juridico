import pb from '@/lib/pocketbase/client'
import { sanitizePayload } from '@/lib/pocketbase/sanitize'

export const getClients = () =>
  pb.collection('clients').getFullList({ filter: 'deleted_at = ""', sort: '-created' })
export const getClient = (id: string) => pb.collection('clients').getOne(id)

const syncCrmStatus = (data: any) => {
  if (data.classification === 'Lead') {
    data.status = 'Prospect'
  } else if (data.classification === 'Ativo') {
    data.status = 'Active'
  } else if (data.classification === 'Inativo') {
    data.status = 'Inactive'
  }

  if (data.classification && !['Ativo', 'Inativo', 'Lead'].includes(data.classification)) {
    data.classification = 'Lead'
  }
  if (
    data.funnel_stage &&
    !['Contact', 'Proposal', 'Negotiation', 'Closed'].includes(data.funnel_stage)
  ) {
    data.funnel_stage = 'Contact'
  }

  return data
}

export const createClient = (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = syncCrmStatus(data)
  const sanitized = sanitizePayload('clients', data, orgId)
  if (data.phone_numbers) sanitized.phone_numbers = data.phone_numbers
  return pb.collection('clients').create(sanitized)
}

export const updateClient = (id: string, data: any) => {
  const orgId = pb.authStore.record?.active_organization
  data = syncCrmStatus(data)
  const sanitized = sanitizePayload('clients', data, orgId)
  if (data.phone_numbers) sanitized.phone_numbers = data.phone_numbers
  return pb.collection('clients').update(id, sanitized)
}

export const deleteClient = async (id: string) => {
  const client = await getClient(id)
  const isAdmin = pb.authStore.record?.isAdmin || pb.authStore.record?.role === 'admin'
  if (!isAdmin) throw new Error('Apenas administradores podem excluir clientes.')
  if (client.classification !== 'Inativo')
    throw new Error('Apenas clientes inativos podem ser excluídos.')
  return pb.collection('clients').update(id, { deleted_at: new Date().toISOString() })
}

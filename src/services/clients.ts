import pb from '@/lib/pocketbase/client'

export const getClients = () => pb.collection('clients').getFullList({ sort: '-created' })
export const getClient = (id: string) => pb.collection('clients').getOne(id)
const syncCrmStatus = (data: any) => {
  if (data.classification === 'Lead') {
    data.status = 'Prospect'
  } else if (data.classification === 'Ativo') {
    data.status = 'Active'
  } else if (data.classification === 'Inativo') {
    data.status = 'Inactive'
  }
  return data
}

export const createClient = (data: any) => {
  data = syncCrmStatus(data)
  if (pb.authStore.record?.active_organization) {
    data.organization = pb.authStore.record.active_organization
  }
  return pb.collection('clients').create(data)
}
export const updateClient = (id: string, data: any) => {
  data = syncCrmStatus(data)
  return pb.collection('clients').update(id, data)
}
export const deleteClient = async (id: string) => {
  const client = await getClient(id)
  const isAdmin = pb.authStore.record?.isAdmin || pb.authStore.record?.role === 'admin'
  if (!isAdmin) throw new Error('Apenas administradores podem excluir clientes.')
  if (client.classification !== 'Inativo')
    throw new Error('Apenas clientes inativos podem ser excluídos.')
  return pb.collection('clients').delete(id)
}

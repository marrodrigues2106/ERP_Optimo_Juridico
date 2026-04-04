import pb from '@/lib/pocketbase/client'

export const getClientDocuments = (clientId: string) =>
  pb.collection('client_documents').getFullList({
    filter: `client = '${clientId}'`,
    sort: '-created',
  })

export const createClientDocument = async (formData: FormData) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  formData.append('organization', orgId)
  return pb.collection('client_documents').create(formData)
}

export const deleteClientDocument = async (id: string) => {
  return pb.collection('client_documents').delete(id)
}

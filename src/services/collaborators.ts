import pb from '@/lib/pocketbase/client'

export const getCollaborators = () =>
  pb.collection('collaborators').getFullList({ filter: 'deleted_at = ""', sort: '-created' })
export const getCollaborator = (id: string) => pb.collection('collaborators').getOne(id)

const sanitizeCollaborator = (data: any) => {
  if (data.user === 'none') data.user = null
  if (data.role && !['Advogado', 'Associado', 'Administrativo'].includes(data.role)) {
    data.role = 'Advogado'
  }
  return data
}

export const createCollaborator = (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = sanitizeCollaborator(data)
  data.organization = orgId
  return pb.collection('collaborators').create(data)
}

export const updateCollaborator = (id: string, data: any) => {
  data = sanitizeCollaborator(data)
  return pb.collection('collaborators').update(id, data)
}

export const deleteCollaborator = (id: string) =>
  pb.collection('collaborators').update(id, { deleted_at: new Date().toISOString() })

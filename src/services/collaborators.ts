import pb from '@/lib/pocketbase/client'

export const getCollaborators = () =>
  pb
    .collection('collaborators')
    .getFullList({ filter: 'deleted_at = "" && user != ""', sort: '-created' })
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

  if (data instanceof FormData) {
    data.append('organization', orgId)
    let role = data.get('role')
    if (role && !['Advogado', 'Associado', 'Administrativo'].includes(role.toString())) {
      data.set('role', 'Advogado')
    }
    if (data.get('user') === 'none') data.delete('user')
    return pb.collection('collaborators').create(data)
  }

  data = sanitizeCollaborator(data)
  data.organization = orgId
  return pb.collection('collaborators').create(data)
}

export const updateCollaborator = (id: string, data: any) => {
  if (data instanceof FormData) {
    let role = data.get('role')
    if (role && !['Advogado', 'Associado', 'Administrativo'].includes(role.toString())) {
      data.set('role', 'Advogado')
    }
    if (data.get('user') === 'none') data.delete('user')
    return pb.collection('collaborators').update(id, data)
  }

  data = sanitizeCollaborator(data)
  return pb.collection('collaborators').update(id, data)
}

export const deleteCollaborator = (id: string) =>
  pb.collection('collaborators').update(id, { deleted_at: new Date().toISOString() })

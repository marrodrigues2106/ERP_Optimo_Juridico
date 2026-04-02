import pb from '@/lib/pocketbase/client'

export const getCollaborators = () =>
  pb.collection('collaborators').getFullList({ sort: '-created' })
export const getCollaborator = (id: string) => pb.collection('collaborators').getOne(id)
export const createCollaborator = (data: any) => {
  if (pb.authStore.record?.active_organization) {
    data.organization = pb.authStore.record.active_organization
  }
  return pb.collection('collaborators').create(data)
}
export const updateCollaborator = (id: string, data: any) =>
  pb.collection('collaborators').update(id, data)
export const deleteCollaborator = (id: string) => pb.collection('collaborators').delete(id)

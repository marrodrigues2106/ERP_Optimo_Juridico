import pb from '@/lib/pocketbase/client'

export const getCollaborators = () =>
  pb.collection('collaborators').getFullList({ sort: '-created' })
export const createCollaborator = (data: any) => pb.collection('collaborators').create(data)
export const deleteCollaborator = (id: string) => pb.collection('collaborators').delete(id)

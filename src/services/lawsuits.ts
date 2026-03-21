import pb from '@/lib/pocketbase/client'

export const getLawsuits = () =>
  pb.collection('lawsuits').getFullList({ sort: '-deadline', expand: 'client,collaborator' })
export const getLawsuit = (id: string) =>
  pb.collection('lawsuits').getOne(id, { expand: 'client,collaborator' })
export const createLawsuit = (data: any) => pb.collection('lawsuits').create(data)
export const updateLawsuit = (id: string, data: any) => pb.collection('lawsuits').update(id, data)
export const deleteLawsuit = (id: string) => pb.collection('lawsuits').delete(id)

import pb from '@/lib/pocketbase/client'

export const getLawsuits = () => pb.collection('lawsuits').getFullList({ sort: '-deadline' })
export const createLawsuit = (data: any) => pb.collection('lawsuits').create(data)
export const updateLawsuit = (id: string, data: any) => pb.collection('lawsuits').update(id, data)
export const deleteLawsuit = (id: string) => pb.collection('lawsuits').delete(id)

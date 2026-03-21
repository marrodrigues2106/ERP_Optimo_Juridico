import pb from '@/lib/pocketbase/client'

export const getLawsuits = () => pb.collection('lawsuits').getFullList({ sort: '-deadline' })
export const createLawsuit = (data: any) => pb.collection('lawsuits').create(data)
export const deleteLawsuit = (id: string) => pb.collection('lawsuits').delete(id)

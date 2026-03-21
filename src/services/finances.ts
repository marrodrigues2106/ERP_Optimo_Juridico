import pb from '@/lib/pocketbase/client'

export const getFinances = () => pb.collection('finances').getFullList({ sort: '-date' })
export const createFinance = (data: any) => pb.collection('finances').create(data)
export const deleteFinance = (id: string) => pb.collection('finances').delete(id)

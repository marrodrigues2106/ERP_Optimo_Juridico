import pb from '@/lib/pocketbase/client'

export const getUsers = () => pb.collection('users').getFullList()
export const createUser = (data: any) => pb.collection('users').create(data)
export const updateUser = (id: string, data: any) => pb.collection('users').update(id, data)
export const deleteUser = (id: string) => pb.collection('users').delete(id)

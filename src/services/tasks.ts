import pb from '@/lib/pocketbase/client'

export const getTasks = () =>
  pb
    .collection('tasks')
    .getFullList({ sort: 'status,due_date', expand: 'collaborator,linked_lawsuit' })

export const getTasksByLawsuit = (lawsuitId: string) =>
  pb.collection('tasks').getFullList({
    filter: `linked_lawsuit = '${lawsuitId}'`,
    sort: 'status,due_date',
    expand: 'collaborator',
  })
export const createTask = (data: any) => {
  if (pb.authStore.record?.active_organization) {
    data.organization = pb.authStore.record.active_organization
  }
  return pb.collection('tasks').create(data)
}
export const updateTask = (id: string, data: any) => pb.collection('tasks').update(id, data)
export const deleteTask = (id: string) => pb.collection('tasks').delete(id)

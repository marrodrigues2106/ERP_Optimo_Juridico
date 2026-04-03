import pb from '@/lib/pocketbase/client'

export const getTasks = () =>
  pb
    .collection('tasks')
    .getFullList({
      filter: 'deleted_at = ""',
      sort: 'status,due_date',
      expand: 'collaborator,linked_lawsuit',
    })

export const getTasksByLawsuit = (lawsuitId: string) =>
  pb.collection('tasks').getFullList({
    filter: `linked_lawsuit = '${lawsuitId}' && deleted_at = ""`,
    sort: 'status,due_date',
    expand: 'collaborator',
  })
export const createTask = (data: any) => {
  if (data.due_date) {
    const d = new Date(data.due_date)
    if (!isNaN(d.getTime())) data.due_date = d.toISOString()
  }
  if (pb.authStore.record?.active_organization) {
    data.organization = pb.authStore.record.active_organization
  }
  return pb.collection('tasks').create(data)
}
export const updateTask = (id: string, data: any) => {
  if (data.due_date) {
    const d = new Date(data.due_date)
    if (!isNaN(d.getTime())) data.due_date = d.toISOString()
  }
  return pb.collection('tasks').update(id, data)
}
export const deleteTask = (id: string) =>
  pb.collection('tasks').update(id, { deleted_at: new Date().toISOString() })

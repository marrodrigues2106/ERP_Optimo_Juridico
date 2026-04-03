import pb from '@/lib/pocketbase/client'
import { sanitizePayload } from '@/lib/pocketbase/sanitize'

export const getTasks = () =>
  pb.collection('tasks').getFullList({
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

const sanitizeTask = (data: any) => {
  if (data.collaborator === 'none') data.collaborator = null
  if (data.linked_lawsuit === 'none') data.linked_lawsuit = null
  if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) data.priority = 'medium'
  if (data.status && !['todo', 'completed'].includes(data.status)) data.status = 'todo'
  return data
}

export const createTask = (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = sanitizeTask(data)

  if (data.due_date) {
    const d = new Date(data.due_date)
    if (!isNaN(d.getTime())) data.due_date = d.toISOString()
  }
  const sanitized = sanitizePayload('tasks', data, orgId)
  return pb.collection('tasks').create(sanitized)
}

export const updateTask = (id: string, data: any) => {
  const orgId = pb.authStore.record?.active_organization
  data = sanitizeTask(data)
  if (data.due_date) {
    const d = new Date(data.due_date)
    if (!isNaN(d.getTime())) data.due_date = d.toISOString()
  }
  const sanitized = sanitizePayload('tasks', data, orgId)
  return pb.collection('tasks').update(id, sanitized)
}

export const deleteTask = (id: string) =>
  pb.collection('tasks').update(id, { deleted_at: new Date().toISOString() })

import pb from '@/lib/pocketbase/client'
import { sanitizePayload } from '@/lib/pocketbase/sanitize'
import { logAudit } from './audit'

export const getTasks = () =>
  pb.collection('tasks').getFullList({
    filter: 'deleted_at = ""',
    sort: 'status,due_date',
    expand: 'collaborator,linked_lawsuit,client',
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
  if (data.client === 'none') data.client = null
  if (data.linked_interaction === 'none') data.linked_interaction = null
  if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) data.priority = 'medium'
  if (data.status && !['todo', 'completed'].includes(data.status)) data.status = 'todo'
  return data
}

export const createTask = async (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = sanitizeTask(data)

  if (data.due_date) {
    const d = new Date(data.due_date)
    if (!isNaN(d.getTime())) data.due_date = d.toISOString()
  }
  const sanitized = sanitizePayload('tasks', data, orgId)
  const record = await pb.collection('tasks').create(sanitized)
  await logAudit('tasks', record.id, 'create', sanitized)
  return record
}

export const updateTask = async (id: string, data: any) => {
  const orgId = pb.authStore.record?.active_organization
  data = sanitizeTask(data)
  if (data.due_date) {
    const d = new Date(data.due_date)
    if (!isNaN(d.getTime())) data.due_date = d.toISOString()
  }
  const sanitized = sanitizePayload('tasks', data, orgId)
  const record = await pb.collection('tasks').update(id, sanitized)
  await logAudit('tasks', record.id, 'update', sanitized)
  return record
}

export const deleteTask = async (id: string) => {
  const record = await pb.collection('tasks').update(id, { deleted_at: new Date().toISOString() })
  await logAudit('tasks', id, 'soft_delete')
  return record
}

import pb from '@/lib/pocketbase/client'
import { sanitizePayload } from '@/lib/pocketbase/sanitize'

export const getAgendaEvents = () =>
  pb
    .collection('agenda_events')
    .getFullList({ filter: 'deleted_at = ""', sort: 'start_date', expand: 'linked_lawsuit' })

export const getAgendaEventsByLawsuit = (lawsuitId: string) =>
  pb.collection('agenda_events').getFullList({
    filter: `linked_lawsuit = '${lawsuitId}' && deleted_at = ""`,
    sort: 'start_date',
    expand: 'collaborator',
  })

export const createAgendaEvent = (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')

  if (data.start_date) data.start_date = new Date(data.start_date).toISOString()
  if (data.end_date) data.end_date = new Date(data.end_date).toISOString()

  const typeMap: Record<string, string> = {
    Reunião: 'Meeting',
    Audiência: 'Hearing',
    Prazo: 'Deadline',
    Atendimento: 'Call',
    Tarefa: 'Task',
    Lembrete: 'Reminder',
    Anotação: 'Note',
    'E-mail': 'Email',
  }
  if (data.type && typeMap[data.type]) data.type = typeMap[data.type]

  const validTypes = ['Note', 'Meeting', 'Call', 'Deadline', 'Reminder', 'Hearing', 'Task', 'Email']
  if (!validTypes.includes(data.type)) data.type = 'Task'

  if (data.client === 'none') data.client = null
  if (data.linked_lawsuit === 'none') data.linked_lawsuit = null
  if (data.collaborator === 'none') data.collaborator = null

  const sanitized = sanitizePayload('agenda_events', data, orgId)
  return pb.collection('agenda_events').create(sanitized)
}

export const updateAgendaEvent = (id: string, data: any) => {
  const orgId = pb.authStore.record?.active_organization

  if (data.start_date) data.start_date = new Date(data.start_date).toISOString()
  if (data.end_date) data.end_date = new Date(data.end_date).toISOString()

  const typeMap: Record<string, string> = {
    Reunião: 'Meeting',
    Audiência: 'Hearing',
    Prazo: 'Deadline',
    Atendimento: 'Call',
    Tarefa: 'Task',
    Lembrete: 'Reminder',
    Anotação: 'Note',
    'E-mail': 'Email',
  }
  if (data.type && typeMap[data.type]) data.type = typeMap[data.type]

  if (data.client === 'none') data.client = null
  if (data.linked_lawsuit === 'none') data.linked_lawsuit = null
  if (data.collaborator === 'none') data.collaborator = null

  const sanitized = sanitizePayload('agenda_events', data, orgId)
  return pb.collection('agenda_events').update(id, sanitized)
}

export const deleteAgendaEvent = (id: string) =>
  pb.collection('agenda_events').update(id, { deleted_at: new Date().toISOString() })

import pb from '@/lib/pocketbase/client'

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
  data.organization = orgId

  if (data.start_date) data.start_date = new Date(data.start_date).toISOString()
  if (data.end_date) data.end_date = new Date(data.end_date).toISOString()

  if (data.type === 'Reunião') data.type = 'Meeting'
  if (data.type === 'Audiência') data.type = 'Hearing'
  if (data.type === 'Prazo') data.type = 'Deadline'
  if (data.type === 'Atendimento') data.type = 'Call'

  const validTypes = ['Note', 'Meeting', 'Call', 'Deadline', 'Reminder', 'Hearing', 'Task', 'Email']
  if (!validTypes.includes(data.type)) data.type = 'Task'

  if (data.client === 'none') data.client = null
  if (data.linked_lawsuit === 'none') data.linked_lawsuit = null
  if (data.collaborator === 'none') data.collaborator = null

  delete data.event_date
  return pb.collection('agenda_events').create(data)
}

export const updateAgendaEvent = (id: string, data: any) => {
  if (data.start_date) data.start_date = new Date(data.start_date).toISOString()
  if (data.end_date) data.end_date = new Date(data.end_date).toISOString()

  if (data.client === 'none') data.client = null
  if (data.linked_lawsuit === 'none') data.linked_lawsuit = null
  if (data.collaborator === 'none') data.collaborator = null

  delete data.event_date
  return pb.collection('agenda_events').update(id, data)
}

export const deleteAgendaEvent = (id: string) =>
  pb.collection('agenda_events').update(id, { deleted_at: new Date().toISOString() })

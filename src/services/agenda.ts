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
  if (data.start_date) data.start_date = new Date(data.start_date).toISOString()
  if (data.end_date) data.end_date = new Date(data.end_date).toISOString()
  return pb.collection('agenda_events').create(data)
}
export const updateAgendaEvent = (id: string, data: any) => {
  if (data.start_date) data.start_date = new Date(data.start_date).toISOString()
  if (data.end_date) data.end_date = new Date(data.end_date).toISOString()
  return pb.collection('agenda_events').update(id, data)
}
export const deleteAgendaEvent = (id: string) =>
  pb.collection('agenda_events').update(id, { deleted_at: new Date().toISOString() })

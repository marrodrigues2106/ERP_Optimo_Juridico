import pb from '@/lib/pocketbase/client'

export const getAgendaEvents = () =>
  pb.collection('agenda_events').getFullList({ sort: 'start_date', expand: 'linked_lawsuit' })
export const createAgendaEvent = (data: any) => pb.collection('agenda_events').create(data)
export const updateAgendaEvent = (id: string, data: any) =>
  pb.collection('agenda_events').update(id, data)
export const deleteAgendaEvent = (id: string) => pb.collection('agenda_events').delete(id)

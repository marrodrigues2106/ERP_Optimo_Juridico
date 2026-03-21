import pb from '@/lib/pocketbase/client'

export const getAgendaEvents = () =>
  pb.collection('agenda_events').getFullList({ sort: 'start_date', expand: 'linked_lawsuit' })
export const getAgendaEventsByLawsuit = (lawsuitId: string) =>
  pb.collection('agenda_events').getFullList({
    filter: `linked_lawsuit = '${lawsuitId}'`,
    sort: 'start_date',
    expand: 'collaborator',
  })
export const createAgendaEvent = (data: any) => pb.collection('agenda_events').create(data)
export const updateAgendaEvent = (id: string, data: any) =>
  pb.collection('agenda_events').update(id, data)
export const deleteAgendaEvent = (id: string) => pb.collection('agenda_events').delete(id)

import pb from '@/lib/pocketbase/client'

export const getClientInteractions = (clientId: string) =>
  pb.collection('crm_interactions').getFullList({
    filter: `client = '${clientId}'`,
    sort: '-date',
    expand: 'responsible,linked_case',
  })

const sanitizeInteraction = (data: any) => {
  if (data.responsible === 'none') data.responsible = null
  if (data.linked_case === 'none') data.linked_case = null
  if (data.client === 'none') data.client = null
  if (data.type && !['Call', 'Email', 'Meeting', 'Follow-up', 'Note', 'Task'].includes(data.type)) {
    data.type = 'Note'
  }
  if (data.status && !['Pending', 'Completed'].includes(data.status)) {
    data.status = 'Pending'
  }
  return data
}

export const createInteraction = (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = sanitizeInteraction(data)
  data.organization = orgId

  if (data.date) {
    const d = new Date(data.date)
    if (!isNaN(d.getTime())) data.date = d.toISOString()
  }
  if (data.follow_up_date) {
    const d = new Date(data.follow_up_date)
    if (!isNaN(d.getTime())) data.follow_up_date = d.toISOString()
  }
  return pb.collection('crm_interactions').create(data)
}

export const updateInteraction = (id: string, data: any) => {
  data = sanitizeInteraction(data)
  if (data.date) {
    const d = new Date(data.date)
    if (!isNaN(d.getTime())) data.date = d.toISOString()
  }
  if (data.follow_up_date) {
    const d = new Date(data.follow_up_date)
    if (!isNaN(d.getTime())) data.follow_up_date = d.toISOString()
  }
  return pb.collection('crm_interactions').update(id, data)
}

export const deleteInteraction = (id: string) => pb.collection('crm_interactions').delete(id)

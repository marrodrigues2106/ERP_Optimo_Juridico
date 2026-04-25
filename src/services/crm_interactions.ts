import pb from '@/lib/pocketbase/client'
import { sanitizePayload } from '@/lib/pocketbase/sanitize'

export const getClientInteractions = (clientId: string) =>
  pb.collection('crm_interactions').getFullList({
    filter: `client = '${clientId}'`,
    sort: '-date',
    expand: 'responsible,linked_case',
  })

export const getInteractionsByLawsuit = (caseId: string) =>
  pb.collection('crm_interactions').getFullList({
    filter: `linked_case = '${caseId}'`,
    sort: '-date',
    expand: 'responsible,client',
  })

const sanitizeInteraction = (data: any) => {
  if (data.responsible === 'none') data.responsible = null
  if (data.linked_case === 'none') data.linked_case = null
  if (data.client === 'none') data.client = null
  if (data.parent_interaction === 'none') data.parent_interaction = null
  if (
    data.type &&
    !['Call', 'Email', 'Meeting', 'Follow-up', 'Note', 'Task', 'WhatsApp'].includes(data.type)
  ) {
    data.type = 'Note'
  }
  if (data.status && !['Pending', 'Completed', 'open', 'closed'].includes(data.status)) {
    data.status = 'Pending'
  }
  return data
}

export const createInteraction = (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = sanitizeInteraction(data)

  if (data.date) {
    const d = new Date(data.date)
    if (!isNaN(d.getTime())) data.date = d.toISOString()
  }
  if (data.follow_up_date) {
    const d = new Date(data.follow_up_date)
    if (!isNaN(d.getTime())) data.follow_up_date = d.toISOString()
  }
  const sanitized = sanitizePayload('crm_interactions', data, orgId)

  const formData = new FormData()
  Object.entries(sanitized).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === 'attachments' && Array.isArray(value)) {
        value.forEach((file: File) => formData.append('attachments', file))
      } else if (typeof value === 'object' && key === 'tags') {
        formData.append(key, JSON.stringify(value))
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value))
      } else {
        formData.append(key, String(value))
      }
    }
  })

  return pb.collection('crm_interactions').create(formData)
}

export const updateInteraction = (id: string, data: any) => {
  const orgId = pb.authStore.record?.active_organization
  data = sanitizeInteraction(data)
  if (data.date) {
    const d = new Date(data.date)
    if (!isNaN(d.getTime())) data.date = d.toISOString()
  }
  if (data.follow_up_date) {
    const d = new Date(data.follow_up_date)
    if (!isNaN(d.getTime())) data.follow_up_date = d.toISOString()
  }
  const sanitized = sanitizePayload('crm_interactions', data, orgId)
  return pb.collection('crm_interactions').update(id, sanitized)
}

export const deleteInteraction = (id: string) => pb.collection('crm_interactions').delete(id)

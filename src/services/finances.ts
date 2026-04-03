import pb from '@/lib/pocketbase/client'
import { sanitizePayload } from '@/lib/pocketbase/sanitize'

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36)

export const getFinances = () =>
  pb
    .collection('finances')
    .getFullList({ filter: 'deleted_at = ""', sort: '-date', expand: 'linked_lawsuit' })

export const getFinancesByLawsuit = (lawsuitId: string) =>
  pb
    .collection('finances')
    .getFullList({ filter: `linked_lawsuit = '${lawsuitId}' && deleted_at = ""`, sort: '-date' })

const sanitizeFinance = (data: any) => {
  if (data.linked_lawsuit === 'none') data.linked_lawsuit = null

  if (data.type === 'Receita') data.type = 'inflow'
  if (data.type === 'Despesa') data.type = 'outflow'
  if (data.type && !['inflow', 'outflow'].includes(data.type)) data.type = 'inflow'

  const inStatuses = ['orçado', 'estimado', 'realizada', 'recebida']
  const outStatuses = ['orçado', 'previsto', 'realizado', 'pago']

  if (data.type === 'inflow' && data.status && !inStatuses.includes(data.status))
    data.status = 'orçado'
  if (data.type === 'outflow' && data.status && !outStatuses.includes(data.status))
    data.status = 'orçado'
  if (data.frequency && !['única', 'semanal', 'quinzenal', 'mensal'].includes(data.frequency)) {
    data.frequency = 'única'
  }
  return data
}

export const createFinance = async (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = sanitizeFinance(data)
  const sanitized = sanitizePayload('finances', data, orgId)

  if (!sanitized.frequency || sanitized.frequency === 'única') {
    return pb.collection('finances').create(sanitized)
  }

  const recurrenceId = generateId()
  const records = []
  const currentDate = new Date(sanitized.date)

  let count = 1
  if (sanitized.frequency === 'semanal') count = 52
  else if (sanitized.frequency === 'quinzenal') count = 26
  else if (sanitized.frequency === 'mensal') count = 12

  for (let i = 0; i < count; i++) {
    const newDate = new Date(currentDate)
    const recordData = {
      ...sanitized,
      date: newDate.toISOString(),
      recurrence_id: recurrenceId,
    }
    records.push(await pb.collection('finances').create(recordData))

    if (sanitized.frequency === 'semanal') currentDate.setDate(currentDate.getDate() + 7)
    else if (sanitized.frequency === 'quinzenal') currentDate.setDate(currentDate.getDate() + 14)
    else if (sanitized.frequency === 'mensal') currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return records[0]
}

export const updateFinance = (id: string, data: any) => {
  const orgId = pb.authStore.record?.active_organization
  data = sanitizeFinance(data)
  const sanitized = sanitizePayload('finances', data, orgId)
  return pb.collection('finances').update(id, sanitized)
}

export const deleteFinance = (id: string) =>
  pb.collection('finances').update(id, { deleted_at: new Date().toISOString() })

export const deleteRecurringFinances = async (recurrenceId: string) => {
  const records = await pb
    .collection('finances')
    .getFullList({ filter: `recurrence_id = '${recurrenceId}'` })
  for (const record of records) {
    await pb.collection('finances').delete(record.id)
  }
}

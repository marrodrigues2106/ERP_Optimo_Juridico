import pb from '@/lib/pocketbase/client'

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36)

export const getFinances = () =>
  pb.collection('finances').getFullList({ sort: '-date', expand: 'linked_lawsuit' })

export const getFinancesByLawsuit = (lawsuitId: string) =>
  pb
    .collection('finances')
    .getFullList({ filter: `linked_lawsuit = '${lawsuitId}'`, sort: '-date' })

const sanitizeFinance = (data: any) => {
  if (data.linked_lawsuit === 'none') data.linked_lawsuit = null
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
  data.organization = orgId

  if (!data.frequency || data.frequency === 'única') {
    return pb.collection('finances').create(data)
  }

  const recurrenceId = generateId()
  const records = []
  const currentDate = new Date(data.date)

  let count = 1
  if (data.frequency === 'semanal') count = 52
  else if (data.frequency === 'quinzenal') count = 26
  else if (data.frequency === 'mensal') count = 12

  for (let i = 0; i < count; i++) {
    const newDate = new Date(currentDate)
    const recordData = {
      ...data,
      date: newDate.toISOString(),
      recurrence_id: recurrenceId,
    }
    records.push(await pb.collection('finances').create(recordData))

    if (data.frequency === 'semanal') currentDate.setDate(currentDate.getDate() + 7)
    else if (data.frequency === 'quinzenal') currentDate.setDate(currentDate.getDate() + 14)
    else if (data.frequency === 'mensal') currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return records[0]
}

export const updateFinance = (id: string, data: any) => {
  data = sanitizeFinance(data)
  return pb.collection('finances').update(id, data)
}

export const deleteFinance = (id: string) => pb.collection('finances').delete(id)

export const deleteRecurringFinances = async (recurrenceId: string) => {
  const records = await pb
    .collection('finances')
    .getFullList({ filter: `recurrence_id = '${recurrenceId}'` })
  for (const record of records) {
    await pb.collection('finances').delete(record.id)
  }
}

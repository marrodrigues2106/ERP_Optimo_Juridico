import pb from '@/lib/pocketbase/client'

export const getCaseMovements = (caseId: string) =>
  pb
    .collection('case_movements')
    .getFullList({ filter: `case = '${caseId}' && deleted_at = ""`, sort: '-event_date' })

export const getPaginatedCaseMovements = async (
  caseId: string,
  page: number = 1,
  perPage: number = 20,
) => {
  return pb.collection('case_movements').getList(page, perPage, {
    filter: `case = '${caseId}' && deleted_at = ""`,
    sort: '-event_date',
  })
}

const sanitizeMovement = (data: any) => {
  if (data.source && !['DataJud', 'Tribunal', 'Diário', 'Manual'].includes(data.source)) {
    data.source = 'Manual'
  }
  return data
}

export const createCaseMovement = (data: any) => {
  const orgId = pb.authStore.record?.active_organization
  if (!orgId) throw new Error('Organização ativa não encontrada. Atualize seu perfil.')
  data = sanitizeMovement(data)
  data.organization = orgId

  if (!data.case || typeof data.case !== 'string') {
    throw new Error('ID do processo inválido.')
  }
  if (data.event_date) {
    const d = new Date(data.event_date)
    if (isNaN(d.getTime())) throw new Error('Data do evento inválida.')
    data.event_date = d.toISOString()
  }
  return pb.collection('case_movements').create(data)
}

export const deleteCaseMovement = (id: string) =>
  pb.collection('case_movements').update(id, { deleted_at: new Date().toISOString() })

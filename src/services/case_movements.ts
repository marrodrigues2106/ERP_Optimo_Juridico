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

export const createCaseMovement = (data: any) => {
  if (!data.case || typeof data.case !== 'string') {
    throw new Error('ID do processo inválido.')
  }
  if (data.event_date) {
    const d = new Date(data.event_date)
    if (isNaN(d.getTime())) throw new Error('Data do evento inválida.')
    data.event_date = d.toISOString()
  }
  if (pb.authStore.record?.active_organization) {
    data.organization = pb.authStore.record.active_organization
  }
  return pb.collection('case_movements').create(data)
}

export const deleteCaseMovement = (id: string) =>
  pb.collection('case_movements').update(id, { deleted_at: new Date().toISOString() })

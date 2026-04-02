import pb from '@/lib/pocketbase/client'

export const getCaseMovements = (caseId: string) =>
  pb.collection('case_movements').getFullList({ filter: `case = '${caseId}'`, sort: '-event_date' })

export const getPaginatedCaseMovements = async (
  caseId: string,
  page: number = 1,
  perPage: number = 20,
) => {
  return pb.collection('case_movements').getList(page, perPage, {
    filter: `case = '${caseId}'`,
    sort: '-event_date',
  })
}

export const createCaseMovement = (data: any) => {
  if (pb.authStore.record?.active_organization) {
    data.organization = pb.authStore.record.active_organization
  }
  return pb.collection('case_movements').create(data)
}

export const deleteCaseMovement = (id: string) => pb.collection('case_movements').delete(id)

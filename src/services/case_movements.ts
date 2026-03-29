import pb from '@/lib/pocketbase/client'

export const getCaseMovements = (caseId: string) =>
  pb.collection('case_movements').getFullList({ filter: `case = '${caseId}'`, sort: '-event_date' })

export const createCaseMovement = (data: any) => pb.collection('case_movements').create(data)

export const deleteCaseMovement = (id: string) => pb.collection('case_movements').delete(id)

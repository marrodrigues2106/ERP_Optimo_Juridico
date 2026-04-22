import pb from '@/lib/pocketbase/client'

export const getPaginatedCaseMovements = async (
  caseId: string,
  page: number = 1,
  perPage: number = 10,
) => {
  return await pb.collection('case_movements').getList(page, perPage, {
    filter: `case = "${caseId}" && deleted_at = ""`,
    sort: '-event_date',
    expand: 'case',
  })
}

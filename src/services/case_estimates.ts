import pb from '@/lib/pocketbase/client'

export const getCaseEstimates = (caseId: string) =>
  pb.collection('case_estimates').getFullList({ filter: `case = '${caseId}'`, sort: '-created' })

export const getCaseEstimatesAll = () =>
  pb.collection('case_estimates').getFullList({ sort: '-created' })

export const createCaseEstimate = (data: any) => pb.collection('case_estimates').create(data)

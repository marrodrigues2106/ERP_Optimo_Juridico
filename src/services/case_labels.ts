import pb from '@/lib/pocketbase/client'

export const getCaseLabels = async () => {
  const orgId = pb.authStore.record?.active_organization
  return pb.collection('case_labels').getFullList({
    filter: orgId ? `organization = "${orgId}"` : '',
    sort: 'name',
  })
}

export const createCaseLabel = async (data: { name: string; color?: string }) => {
  const orgId = pb.authStore.record?.active_organization
  return pb.collection('case_labels').create({ ...data, organization: orgId })
}

export const updateCaseLabel = async (id: string, data: { name?: string; color?: string }) => {
  return pb.collection('case_labels').update(id, data)
}

export const deleteCaseLabel = async (id: string) => {
  return pb.collection('case_labels').delete(id)
}

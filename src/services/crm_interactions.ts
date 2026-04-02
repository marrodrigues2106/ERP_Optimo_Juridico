import pb from '@/lib/pocketbase/client'

export const getClientInteractions = (clientId: string) =>
  pb.collection('crm_interactions').getFullList({
    filter: `client = '${clientId}'`,
    sort: '-date',
    expand: 'responsible,linked_case',
  })

export const createInteraction = (data: any) => {
  if (pb.authStore.record?.active_organization) {
    data.organization = pb.authStore.record.active_organization
  }
  return pb.collection('crm_interactions').create(data)
}
export const updateInteraction = (id: string, data: any) =>
  pb.collection('crm_interactions').update(id, data)
export const deleteInteraction = (id: string) => pb.collection('crm_interactions').delete(id)

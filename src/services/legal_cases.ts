import pb from '@/lib/pocketbase/client'

export const getLegalCases = () =>
  pb
    .collection('legal_cases')
    .getFullList({ expand: 'client,responsible_collaborator', sort: '-created' })

export const getLegalCase = (id: string) =>
  pb.collection('legal_cases').getOne(id, { expand: 'client,responsible_collaborator' })

export const createLegalCase = (data: any) => pb.collection('legal_cases').create(data)

export const updateLegalCase = (id: string, data: any) =>
  pb.collection('legal_cases').update(id, data)

export const deleteLegalCase = (id: string) => pb.collection('legal_cases').delete(id)

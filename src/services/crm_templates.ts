import pb from '@/lib/pocketbase/client'

export const getTemplates = () =>
  pb.collection('communication_templates').getFullList({ sort: '-created' })
export const createTemplate = (data: any) => pb.collection('communication_templates').create(data)
export const updateTemplate = (id: string, data: any) =>
  pb.collection('communication_templates').update(id, data)
export const deleteTemplate = (id: string) => pb.collection('communication_templates').delete(id)

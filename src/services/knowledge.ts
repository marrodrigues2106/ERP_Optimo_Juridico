import pb from '@/lib/pocketbase/client'

export const getKnowledgeItems = () =>
  pb.collection('knowledge_items').getFullList({ sort: '-created' })
export const createKnowledgeItem = (data: any) => pb.collection('knowledge_items').create(data)
export const updateKnowledgeItem = (id: string, data: any) =>
  pb.collection('knowledge_items').update(id, data)
export const deleteKnowledgeItem = (id: string) => pb.collection('knowledge_items').delete(id)

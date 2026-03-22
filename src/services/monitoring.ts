import pb from '@/lib/pocketbase/client'

export const getMonitoringConfig = async () => {
  const records = await pb.collection('monitoring_configs').getFullList()
  return records[0] || null
}

export const saveMonitoringConfig = async (id: string | null, data: any) => {
  if (id) {
    return pb.collection('monitoring_configs').update(id, data)
  }
  return pb.collection('monitoring_configs').create(data)
}

export const getMonitoringTerms = () => pb.collection('monitoring_terms').getFullList()
export const createMonitoringTerm = (data: any) => pb.collection('monitoring_terms').create(data)
export const updateMonitoringTerm = (id: string, data: any) =>
  pb.collection('monitoring_terms').update(id, data)
export const deleteMonitoringTerm = (id: string) => pb.collection('monitoring_terms').delete(id)

export const syncProcesses = () =>
  pb.send('/backend/v1/monitoring/sync-processes', { method: 'POST' })
export const syncTerms = () => pb.send('/backend/v1/monitoring/sync-terms', { method: 'POST' })

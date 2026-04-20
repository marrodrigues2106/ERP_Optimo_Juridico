import pb from '@/lib/pocketbase/client'

export const batchSyncDataJud = async (ids: string[]) => {
  return pb.send('/backend/v1/datajud/batch-sync', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

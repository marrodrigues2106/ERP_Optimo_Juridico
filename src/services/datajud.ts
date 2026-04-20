import pb from '@/lib/pocketbase/client'

export const syncDataJudCase = async (id: string) => {
  try {
    return await pb.send('/backend/v1/datajud/sync-case', {
      method: 'POST',
      body: JSON.stringify({ caseId: id, recordId: id }),
    })
  } catch (err: any) {
    if (err.status === 404 || err.status === 400) {
      // Fallback: Just update the record status to trigger standard hooks
      return await pb.collection('legal_cases').update(id, {
        datajud_sync_status: 'Pending',
        pje_sync_status: 'pending',
      })
    }
    throw err
  }
}

export const batchSyncDataJudCases = async (caseIds: string[]) => {
  return Promise.all(caseIds.map((id) => syncDataJudCase(id)))
}

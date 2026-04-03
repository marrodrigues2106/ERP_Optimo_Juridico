import pb from '@/lib/pocketbase/client'

export const getAuditLogs = () =>
  pb.collection('audit_logs').getFullList({ sort: '-created', expand: 'user' })

export const logAudit = async (
  collection_name: string,
  record_id: string,
  action: string,
  changes?: any,
) => {
  try {
    const user = pb.authStore.record?.id
    if (user) {
      await pb.collection('audit_logs').create({
        collection_name,
        record_id,
        action,
        user,
        changes,
      })
    }
  } catch (e) {
    console.error('Audit log failed', e)
  }
}

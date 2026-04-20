import pb from '@/lib/pocketbase/client'

export const getAuditLogs = () =>
  pb
    .collection('system_logs')
    .getFullList({ filter: 'module = "Audit"', sort: '-created', expand: 'user' })

export const logAudit = async (
  collection_name: string,
  record_id: string,
  action: string,
  changes?: any,
) => {
  try {
    const user = pb.authStore.record?.id
    const orgId = pb.authStore.record?.active_organization
    await pb.collection('system_logs').create({
      level: 'info',
      module: 'Audit',
      message: `Auditoria: ${action} em ${collection_name}`,
      details: { collection_name, record_id, action, changes },
      user: user || null,
      organization: orgId || null,
    })
  } catch (e) {
    console.error('Audit log failed', e)
  }
}

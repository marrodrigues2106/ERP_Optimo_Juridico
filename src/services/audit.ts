import pb from '@/lib/pocketbase/client'

export const getAuditLogs = () =>
  pb.collection('audit_logs').getFullList({ sort: '-created', expand: 'user' })

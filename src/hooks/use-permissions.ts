import { useAuth } from '@/hooks/use-auth'

export function usePermissions() {
  const { user } = useAuth()
  const role = user?.role || (user?.isAdmin ? 'admin' : 'none')
  const isAdmin = role === 'admin' || user?.isAdmin

  return {
    isAdmin,
    role,
    canViewCRM: isAdmin || role === 'legal_team',
    canViewFinances: isAdmin || role === 'financial_user',
    canViewTeam: isAdmin || role === 'admin_user' || role === 'financial_user',
    canViewBlog: isAdmin || role === 'admin_user',
    canViewUsers: isAdmin,
    canViewAudit: isAdmin,
    canViewProcesses:
      isAdmin || role === 'legal_team' || role === 'admin_user' || role === 'financial_user',
  }
}

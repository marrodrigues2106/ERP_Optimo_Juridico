import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  LogOut,
  LayoutDashboard,
  FileText,
  DollarSign,
  BookOpen,
  Users,
  Briefcase,
  User,
  Shield,
  Calendar,
  Activity,
  Menu,
} from 'lucide-react'

import BlogManager from '@/components/intranet/BlogManager'
import ProcessManager from '@/components/intranet/ProcessManager'
import FinanceManager from '@/components/intranet/FinanceManager'
import LibraryManager from '@/components/intranet/LibraryManager'
import CrmManager from '@/components/intranet/CrmManager'
import TeamManager from '@/components/intranet/TeamManager'
import UsersManager from '@/components/intranet/UsersManager'
import ProfileManager from '@/components/intranet/ProfileManager'
import AgendaManager from '@/components/intranet/AgendaManager'
import AuditLogs from '@/components/intranet/AuditLogs'

export default function Intranet() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const perms = usePermissions()
  const [activeView, setActiveView] = useState('processes')

  const handleLogout = () => {
    signOut()
    navigate('/')
  }

  const navItems = [
    {
      id: 'processes',
      label: 'Processos e Serviços',
      icon: Briefcase,
      show: perms.canViewProcesses,
    },
    { id: 'crm', label: 'CRM e Clientes', icon: Users, show: perms.canViewCRM },
    { id: 'agenda', label: 'Agenda', icon: Calendar, show: true },
    { id: 'finance', label: 'Financeiro', icon: DollarSign, show: perms.canViewFinances },
    { id: 'library', label: 'Biblioteca', icon: BookOpen, show: true },
    { id: 'blog', label: 'Blog', icon: FileText, show: perms.canViewBlog },
    { id: 'team', label: 'Equipe', icon: LayoutDashboard, show: perms.canViewTeam },
    { id: 'users', label: 'Usuários', icon: Shield, show: perms.canViewUsers },
    { id: 'audit', label: 'Auditoria', icon: Activity, show: perms.canViewAudit },
    { id: 'profile', label: 'Meu Perfil', icon: User, show: true },
  ]

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-slate-50 pt-[72px]">
        <Sidebar
          className="top-[72px] h-[calc(100svh-72px)] border-r bg-white hidden md:flex"
          collapsible="none"
        >
          <SidebarContent>
            <SidebarGroup>
              <div className="px-4 py-4 mb-2 border-b">
                <h2 className="text-lg font-serif font-bold text-primary tracking-tight">
                  Portal Interno
                </h2>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  Moraes Rodrigues Advocacia
                </p>
              </div>
              <SidebarGroupContent className="p-2">
                <SidebarMenu>
                  {navItems
                    .filter((i) => i.show)
                    .map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveView(item.id)}
                          isActive={activeView === item.id}
                          className="h-10 text-sm font-medium"
                        >
                          <item.icon className="w-4 h-4 mr-2" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  <SidebarMenuItem className="mt-6 border-t pt-4">
                    <SidebarMenuButton
                      onClick={handleLogout}
                      className="h-10 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      <span>Sair do Sistema</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
          <div className="md:hidden flex items-center mb-6 border-b pb-4">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-xl font-serif font-bold text-primary">Portal Interno</h1>
          </div>

          <div className="max-w-7xl mx-auto w-full">
            {activeView === 'processes' && <ProcessManager />}
            {activeView === 'crm' && <CrmManager />}
            {activeView === 'agenda' && <AgendaManager />}
            {activeView === 'finance' && <FinanceManager />}
            {activeView === 'library' && <LibraryManager />}
            {activeView === 'blog' && <BlogManager />}
            {activeView === 'team' && <TeamManager />}
            {activeView === 'users' && <UsersManager />}
            {activeView === 'audit' && <AuditLogs />}
            {activeView === 'profile' && <ProfileManager />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

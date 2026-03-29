import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
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
  BellRing,
  Search,
} from 'lucide-react'

export default function Intranet() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const perms = usePermissions()

  const handleLogout = () => {
    signOut()
    navigate('/')
  }

  const pathParts = location.pathname.split('/')
  const currentPath = pathParts[2] || 'dashboard'

  const navItems = [
    { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard, show: true },
    {
      id: 'publicacoes',
      label: 'Publicações & Mailbox',
      icon: BellRing,
      show: perms.canViewProcesses,
    },
    {
      id: 'diarios-oficiais',
      label: 'Diários Oficiais',
      icon: Search,
      show: perms.canViewProcesses,
    },
    {
      id: 'processos',
      label: 'Processos e Serviços',
      icon: Briefcase,
      show: perms.canViewProcesses,
    },
    { id: 'crm', label: 'CRM e Clientes', icon: Users, show: perms.canViewCRM },
    { id: 'agenda', label: 'Agenda da Equipe', icon: Calendar, show: true },
    { id: 'finance', label: 'Financeiro', icon: DollarSign, show: perms.canViewFinances },
    { id: 'library', label: 'Biblioteca', icon: BookOpen, show: true },
    { id: 'blog', label: 'Blog', icon: FileText, show: perms.canViewBlog },
    { id: 'team', label: 'Equipe', icon: Users, show: perms.canViewTeam },
    { id: 'users', label: 'Usuários', icon: Shield, show: perms.canViewUsers },
    { id: 'audit', label: 'Auditoria', icon: Activity, show: perms.canViewAudit },
    { id: 'profile', label: 'Meu Perfil', icon: User, show: true },
  ]

  const activeItem = navItems.find((i) => i.id === currentPath) || navItems[0]

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-slate-50 pt-[72px] md:pt-[80px]">
        <Sidebar
          className="top-[72px] md:top-[80px] h-[calc(100svh-72px)] md:h-[calc(100svh-80px)] border-r bg-white hidden md:flex"
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
                          onClick={() => navigate(`/intranet/${item.id}`)}
                          isActive={
                            currentPath === item.id ||
                            (item.id === 'dashboard' && currentPath === 'dashboard')
                          }
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
            <h1 className="text-xl font-serif font-bold text-primary">
              {activeItem ? activeItem.label : 'Portal Interno'}
            </h1>
          </div>

          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

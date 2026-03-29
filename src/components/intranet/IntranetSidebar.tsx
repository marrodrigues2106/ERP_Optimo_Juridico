import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Users,
  FileText,
  BookOpen,
  Settings,
  Shield,
  Activity,
  BellRing,
  Search,
  User,
  LogOut,
  DollarSign,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/hooks/use-auth'

export function IntranetSidebar() {
  const { pathname } = useLocation()
  const perms = usePermissions()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut()
    navigate('/')
  }

  const navGroups = [
    {
      label: 'Principal',
      items: [
        {
          title: 'Painel de Controle',
          url: '/intranet/dashboard',
          icon: LayoutDashboard,
          show: true,
        },
        { title: 'Agenda da Equipe', url: '/intranet/agenda', icon: Calendar, show: true },
      ],
    },
    {
      label: 'Jurídico',
      items: [
        {
          title: 'Processos e Serviços',
          url: '/intranet/processos',
          icon: Briefcase,
          show: perms.canViewProcesses,
        },
        {
          title: 'Publicações & Mailbox',
          url: '/intranet/publicacoes',
          icon: BellRing,
          show: perms.canViewProcesses,
        },
        {
          title: 'Diários Oficiais',
          url: '/intranet/diarios-oficiais',
          icon: Search,
          show: perms.canViewProcesses,
        },
      ],
    },
    {
      label: 'Gestão',
      items: [
        { title: 'CRM e Clientes', url: '/intranet/crm', icon: Users, show: perms.canViewCRM },
        {
          title: 'Financeiro',
          url: '/intranet/finance',
          icon: DollarSign,
          show: perms.canViewFinances,
        },
      ],
    },
    {
      label: 'Institucional',
      items: [
        { title: 'Biblioteca', url: '/intranet/library', icon: BookOpen, show: true },
        { title: 'Blog', url: '/intranet/blog', icon: FileText, show: perms.canViewBlog },
        { title: 'Equipe', url: '/intranet/team', icon: Users, show: perms.canViewTeam },
      ],
    },
    {
      label: 'Administração',
      items: [
        { title: 'Usuários', url: '/intranet/users', icon: Shield, show: perms.canViewUsers },
        { title: 'Auditoria', url: '/intranet/audit', icon: Activity, show: perms.canViewAudit },
      ],
    },
  ]

  return (
    <Sidebar variant="sidebar" className="border-r border-slate-200 bg-slate-50">
      <SidebarHeader className="p-4 border-b border-slate-200 bg-white">
        <Link to="/intranet/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-serif font-bold text-lg">
            MR
          </div>
          <span className="font-semibold text-slate-800 tracking-tight leading-none">
            Escritório
            <br />
            Online
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-3">
        {navGroups.map((group, index) => {
          const visibleItems = group.items.filter((i) => i.show)
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label}>
              <SidebarGroup>
                <SidebarGroupLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith(item.url)}
                          className="data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 data-[active=true]:font-medium hover:bg-slate-100"
                        >
                          <Link to={item.url}>
                            <item.icon className="w-4 h-4 mr-2" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {index < navGroups.length - 1 && <SidebarSeparator className="my-2 bg-slate-200" />}
            </div>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-200 bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-slate-500 hover:text-slate-800">
              <Link to="/intranet/profile">
                <User className="w-4 h-4 mr-2" />
                <span>Meu Perfil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Sair do Sistema</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

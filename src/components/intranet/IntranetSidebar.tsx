import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Users,
  FileText,
  BookOpen,
  Inbox,
  Settings,
  Scale,
  MessageSquare,
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

const mainNavItems = [
  { title: 'Dashboard', url: '/intranet/dashboard', icon: LayoutDashboard },
  { title: 'Processos', url: '/intranet/processos', icon: Briefcase },
  { title: 'Agenda', url: '/intranet/agenda', icon: Calendar },
  { title: 'Clientes', url: '/intranet/clientes', icon: Users },
  { title: 'Financeiro', url: '/intranet/finance', icon: FileText },
]

const monitoringNavItems = [
  { title: 'Diários Oficiais', url: '/intranet/diarios-oficiais', icon: BookOpen },
  { title: 'Caixa de Entrada', url: '/intranet/publicacoes', icon: Inbox },
]

export function IntranetSidebar() {
  const { pathname } = useLocation()

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
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Gestão Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
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

        <SidebarSeparator className="my-2 bg-slate-200" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Publicações & Alertas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {monitoringNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.url)}
                    className="data-[active=true]:bg-amber-50 data-[active=true]:text-amber-700 data-[active=true]:font-medium hover:bg-slate-100"
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
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-200 bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-slate-500 hover:text-slate-800">
              <Link to="/intranet/profile">
                <Settings className="w-4 h-4 mr-2" />
                <span>Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

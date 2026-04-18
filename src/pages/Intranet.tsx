import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  BookOpen,
  Search,
  Bell,
  Landmark,
  Activity,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Intranet() {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset" className="bg-slate-900 border-r-0">
        <SidebarHeader className="p-5 bg-slate-900">
          <h2 className="text-2xl font-bold tracking-tight text-white truncate group-data-[state=collapsed]/sidebar-wrapper:opacity-0 transition-opacity">
            MR Advocacia
          </h2>
          <p className="text-sm text-slate-400 truncate group-data-[state=collapsed]/sidebar-wrapper:opacity-0 transition-opacity">
            {user?.email}
          </p>
        </SidebarHeader>
        <SidebarContent className="bg-slate-900 py-2">
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400 uppercase text-xs tracking-wider font-bold mb-2">
              Gestão
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/dashboard'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white text-base py-5"
                >
                  <Link to="/intranet/dashboard">
                    <LayoutDashboard className="w-5 h-5" /> Visão Geral
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith('/intranet/processos')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white text-base py-5"
                >
                  <Link to="/intranet/processos">
                    <Briefcase className="w-5 h-5" /> Processos
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith('/intranet/crm')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white text-base py-5"
                >
                  <Link to="/intranet/crm">
                    <Users className="w-5 h-5" /> CRM & Clientes
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400 uppercase text-xs tracking-wider font-bold mt-4 mb-2">
              Comunicações
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/atualizacoes'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white text-base py-5"
                >
                  <Link to="/intranet/atualizacoes">
                    <Activity className="w-5 h-5" /> Atualizações
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/busca-dou'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white text-base py-5"
                >
                  <Link to="/intranet/busca-dou">
                    <Search className="w-5 h-5" /> Busca DOU
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith('/intranet/comunicacoes')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white text-base py-5"
                >
                  <Link to="/intranet/comunicacoes">
                    <Bell className="w-5 h-5" /> Comunica PJe
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/publicacoes'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white text-base py-5"
                >
                  <Link to="/intranet/publicacoes">
                    <BookOpen className="w-5 h-5" /> Publicações
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400 uppercase text-xs tracking-wider font-bold mt-4 mb-2">
              Administrativo
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/finance'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white text-base py-5"
                >
                  <Link to="/intranet/finance">
                    <Landmark className="w-5 h-5" /> Financeiro
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/profile'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white text-base py-5"
                >
                  <Link to="/intranet/profile">
                    <Settings className="w-5 h-5" /> Perfil & Config.
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-slate-50 flex flex-col min-h-screen w-full transition-all duration-200">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white px-6 sticky top-0 z-10 shadow-sm">
          <SidebarTrigger className="w-10 h-10" />
          <h1 className="text-xl font-semibold text-slate-800">Moraes Rodrigues Advocacia</h1>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

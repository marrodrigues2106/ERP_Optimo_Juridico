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
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Intranet() {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <SidebarProvider>
      <Sidebar variant="inset" className="bg-slate-900 border-r-0">
        <SidebarHeader className="p-4 bg-slate-900">
          <h2 className="text-xl font-bold tracking-tight text-white">MR Advocacia</h2>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </SidebarHeader>
        <SidebarContent className="bg-slate-900">
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              Gestão
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/dashboard'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white"
                >
                  <Link to="/intranet/dashboard">
                    <LayoutDashboard /> Visão Geral
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith('/intranet/processos')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white"
                >
                  <Link to="/intranet/processos">
                    <Briefcase /> Processos
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith('/intranet/crm')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white"
                >
                  <Link to="/intranet/crm">
                    <Users /> CRM & Clientes
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              Comunicações
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/busca-dou'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white"
                >
                  <Link to="/intranet/busca-dou">
                    <Search /> Busca DOU
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith('/intranet/comunicacoes')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white"
                >
                  <Link to="/intranet/comunicacoes">
                    <Bell /> Comunica PJe
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/publicacoes'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white"
                >
                  <Link to="/intranet/publicacoes">
                    <BookOpen /> Publicações
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              Administrativo
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/finance'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white"
                >
                  <Link to="/intranet/finance">
                    <Landmark /> Financeiro
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/intranet/profile'}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white"
                >
                  <Link to="/intranet/profile">
                    <Settings /> Configurações & Perfil
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-slate-50 flex flex-col min-h-screen w-full">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-white px-6 sticky top-0 z-10">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

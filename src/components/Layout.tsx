import { useEffect, useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import {
  Search,
  Sparkles,
  Bell,
  Plus,
  Activity,
  AlertTriangle,
  Briefcase,
  FileText,
  Menu,
  LogOut,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import WhatsAppFAB from './WhatsAppFAB'
import { Toaster } from '@/components/ui/toaster'
import pb from '@/lib/pocketbase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'error'>('loading')
  const { user, isAuthenticated, signOut } = useAuth()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    if (!isAuthenticated) return
    let mounted = true
    const checkHealth = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 20000)
        const res = await pb.send('/backend/v1/datajud/health', {
          method: 'GET',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (mounted) {
          setApiStatus(res?.status === 'online' ? 'online' : 'error')
        }
      } catch (error) {
        if (mounted) setApiStatus('error')
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 60000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isAuthenticated])

  const isIntranet = pathname.startsWith('/intranet')
  const isAdmin = user?.role === 'admin' || user?.isAdmin

  if (isIntranet) {
    const navCategories = [
      {
        label: 'Principal',
        items: [{ title: 'Dashboard', url: '/intranet/dashboard' }],
      },
      {
        label: 'Jurídico',
        items: [
          { title: 'Processos', url: '/intranet/processos' },
          { title: 'CRM', url: '/intranet/crm' },
          { title: 'Agenda', url: '/intranet/agenda' },
          { title: 'Diários Oficiais', url: '/intranet/diarios-oficiais' },
        ],
      },
      {
        label: 'Gestão',
        items: [
          { title: 'Equipe', url: '/intranet/team' },
          { title: 'Usuários', url: '/intranet/users', adminOnly: true },
        ],
      },
      {
        label: 'Institucional',
        items: [
          { title: 'Blog', url: '/intranet/blog' },
          { title: 'Biblioteca', url: '/intranet/library' },
        ],
      },
      {
        label: 'Administração',
        items: [
          { title: 'Financeiro', url: '/intranet/finance' },
          { title: 'Auditoria', url: '/intranet/audit', adminOnly: true },
        ],
      },
    ]

    return (
      <TooltipProvider>
        <div className="flex-1 flex flex-col min-h-screen bg-background w-full max-w-full overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-white px-4 z-10 sticky top-0 shadow-sm">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="w-5 h-5 text-primary" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] sm:w-[320px] bg-white p-0 overflow-y-auto"
              >
                <div className="flex flex-col py-6 gap-2">
                  <div className="px-6 pb-4 font-bold text-xl text-primary border-b mb-2">Menu</div>
                  {navCategories.map((cat) => {
                    const visibleItems = cat.items.filter((item) => !item.adminOnly || isAdmin)
                    if (visibleItems.length === 0) return null
                    return (
                      <div key={cat.label} className="mb-4">
                        <div className="px-6 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {cat.label}
                        </div>
                        {visibleItems.map((item) => (
                          <Link
                            key={item.url}
                            to={item.url}
                            className={cn(
                              'block px-6 py-2 text-sm font-medium transition-colors',
                              pathname.startsWith(item.url)
                                ? 'text-primary bg-secondary/50 border-r-2 border-primary'
                                : 'text-foreground hover:bg-slate-50 hover:text-primary',
                            )}
                          >
                            {item.title}
                          </Link>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mx-2">
              <span className="font-bold text-primary mr-4 text-lg">MRA</span>
            </div>

            <div className="flex-1 hidden md:flex items-center justify-center max-w-md mx-auto">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar..."
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden lg:flex bg-secondary text-primary hover:bg-secondary/80 border-secondary"
                      >
                        <Sparkles className="w-4 h-4 mr-2" /> Jus IA
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Assistente de IA Integrado</TooltipContent>
                </Tooltip>
                <SheetContent
                  side="right"
                  className="w-[400px] sm:w-[540px] flex flex-col bg-white"
                >
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-primary">
                      <Sparkles className="w-5 h-5" /> Jus IA Assistant
                    </SheetTitle>
                    <SheetDescription>
                      Seu assistente virtual com contexto sobre o sistema. Tire dúvidas operacionais
                      ou pesquise mais rápido.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto mt-6 border rounded-lg bg-slate-50 p-4 flex flex-col gap-4">
                    <div className="bg-white p-3 rounded-lg border shadow-sm text-sm text-slate-700 self-start max-w-[85%]">
                      Olá! Sou o Jus IA. Notei que você está navegando no Escritório Online. Como
                      posso ajudar? Posso sugerir ações baseadas na página atual.
                    </div>
                    <div className="flex gap-2 mt-auto pt-4">
                      <Input placeholder="Pergunte algo ao Jus IA..." className="bg-white" />
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Criar novo registro</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="bg-white">
                  <DropdownMenuItem asChild>
                    <Link to="/intranet/processos?new=processo" className="cursor-pointer">
                      <Briefcase className="w-4 h-4 mr-2" /> Adicionar Processo
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/intranet/processos?new=servico" className="cursor-pointer">
                      <FileText className="w-4 h-4 mr-2" /> Adicionar Serviço
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative text-foreground hover:text-primary shrink-0"
                      >
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-white"></span>
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Notificações</TooltipContent>
                </Tooltip>
                <SheetContent side="right" className="bg-white">
                  <SheetHeader>
                    <SheetTitle>Notificações Recentes</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Bell className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">Nenhuma notificação não lida.</p>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 shadow-sm hover:opacity-90 outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all">
                    MR
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white">
                  <div className="px-2 py-1.5 text-sm font-semibold border-b mb-1">Minha Conta</div>
                  <DropdownMenuItem asChild>
                    <Link to="/intranet/profile" className="cursor-pointer">
                      Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/intranet/profile" className="cursor-pointer">
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      signOut()
                      navigate('/login')
                    }}
                    className="cursor-pointer text-red-600 font-medium focus:text-red-700 focus:bg-red-50 mt-1"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>{' '}
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 w-full p-4 lg:p-6 overflow-auto">
            <Outlet />
          </main>

          <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border shadow-sm text-xs font-medium text-foreground">
            {apiStatus === 'online' ? (
              <Activity className="w-4 h-4 text-green-500" />
            ) : apiStatus === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
            )}
            <span>
              {apiStatus === 'online'
                ? 'Status DataJud: Operacional'
                : apiStatus === 'error'
                  ? 'Status DataJud: Serviço Indisponível'
                  : 'Verificando Status...'}
            </span>
          </div>
          <Toaster />
        </div>
      </TooltipProvider>
    )
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background relative">
      <Header />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFAB />
      <Toaster />
    </div>
  )
}

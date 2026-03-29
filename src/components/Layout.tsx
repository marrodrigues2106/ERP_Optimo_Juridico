import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { Link } from 'react-router-dom'
import {
  FileText,
  LayoutDashboard,
  Briefcase,
  Calendar,
  BookOpen,
  Users,
  Search,
  Sparkles,
  Bell,
  Plus,
} from 'lucide-react'
import WhatsAppFAB from './WhatsAppFAB'
import { Toaster } from '@/components/ui/toaster'
import pb from '@/lib/pocketbase/client'
import { Activity, AlertTriangle } from 'lucide-react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { IntranetSidebar } from '@/components/intranet/IntranetSidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Layout() {
  const { pathname } = useLocation()
  const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'error'>('loading')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    let mounted = true

    const checkHealth = async () => {
      try {
        const controller = new AbortController()
        // Allow up to 20 seconds for the frontend to wait, accommodating the 15s backend timeout
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

    // Initial non-blocking check
    checkHealth()

    // Automatic retry every 60 seconds
    const interval = setInterval(checkHealth, 60000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const isIntranet = pathname.startsWith('/intranet')

  if (isIntranet) {
    return (
      <SidebarProvider>
        <IntranetSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-screen bg-[#f8f9fa] w-full max-w-full overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-white px-4 z-10 sticky top-0 shadow-sm">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 max-w-2xl flex items-center gap-2">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar no Escritório Online..."
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-1"
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="hidden lg:flex bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Jus IA
              </Button>
              <Button size="sm" className="hidden sm:flex">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-slate-500 hover:text-slate-800 shrink-0"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                MR
              </div>
            </div>
          </header>
          <main className="flex-1 w-full p-4 lg:p-6 overflow-auto">
            <Outlet />
          </main>

          {/* Status API Indicator */}
          <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border shadow-sm text-xs font-medium text-slate-700">
            {apiStatus === 'online' ? (
              <Activity className="w-4 h-4 text-green-500" />
            ) : apiStatus === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
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
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
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

import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { Link } from 'react-router-dom'
import { FileText, LayoutDashboard, Briefcase, Calendar, BookOpen, Users } from 'lucide-react'
import WhatsAppFAB from './WhatsAppFAB'
import { Toaster } from '@/components/ui/toaster'
import pb from '@/lib/pocketbase/client'
import { Activity, AlertTriangle } from 'lucide-react'

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

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background relative">
      <Header />
      {isIntranet && (
        <div className="bg-slate-900 text-slate-200 overflow-x-auto border-b border-slate-800 shadow-inner sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 py-3 text-sm font-medium whitespace-nowrap">
            <Link
              to="/intranet/dashboard"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link
              to="/intranet/processos"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Briefcase className="w-4 h-4" /> Processos
            </Link>
            <Link
              to="/intranet/agenda"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Calendar className="w-4 h-4" /> Agenda
            </Link>
            <Link
              to="/intranet/clientes"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Users className="w-4 h-4" /> Clientes
            </Link>
            <Link
              to="/intranet/finance"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <FileText className="w-4 h-4" /> Financeiro
            </Link>
            <Link
              to="/intranet/diarios"
              className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Diários Oficiais
            </Link>
          </div>
        </div>
      )}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFAB />
      <Toaster />

      {/* Status API Indicator */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-sm text-xs font-medium text-slate-700 transition-all hover:bg-white hover:shadow-md">
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
              ? 'Status DataJud: Serviço Indisponível (Tentando reconectar...)'
              : 'Verificando Status DataJud...'}
        </span>
      </div>
    </div>
  )
}

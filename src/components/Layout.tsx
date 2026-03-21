import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import WhatsAppFAB from './WhatsAppFAB'
import { Toaster } from '@/components/ui/toaster'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import { Activity, AlertTriangle, WifiOff } from 'lucide-react'

export default function Layout() {
  const { pathname } = useLocation()
  const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'offline' | 'error'>('loading')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    let mounted = true

    const checkHealth = async () => {
      try {
        await pb.health.check()
        try {
          const res = await pb.send('/backend/v1/datajud/health', { method: 'GET' })
          if (mounted) {
            setApiStatus(res.status === 'online' ? 'online' : 'error')
          }
        } catch (e) {
          if (mounted) setApiStatus('error')
        }
      } catch (error) {
        if (mounted) setApiStatus('offline')
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background relative">
      <Header />
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
        ) : apiStatus === 'offline' ? (
          <WifiOff className="w-4 h-4 text-slate-500" />
        ) : apiStatus === 'error' ? (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        ) : (
          <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
        )}
        <span>
          Status DataJud:{' '}
          {apiStatus === 'online'
            ? 'Operacional'
            : apiStatus === 'error'
              ? 'Serviço Indisponível'
              : apiStatus === 'offline'
                ? 'Problema de Conexão'
                : 'Verificando...'}
        </span>
      </div>
    </div>
  )
}

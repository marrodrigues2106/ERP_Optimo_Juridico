import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import WhatsAppFAB from './WhatsAppFAB'
import { Toaster } from '@/components/ui/toaster'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import { Activity } from 'lucide-react'

export default function Layout() {
  const { pathname } = useLocation()
  const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'offline'>('loading')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    let mounted = true

    const checkHealth = async () => {
      try {
        await pb.health.check()
        if (mounted) setApiStatus('online')
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
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-sm text-xs font-medium text-slate-600 transition-all hover:bg-white">
        <Activity
          className={cn(
            'w-3.5 h-3.5',
            apiStatus === 'online'
              ? 'text-green-500'
              : apiStatus === 'offline'
                ? 'text-red-500'
                : 'text-amber-500 animate-pulse',
          )}
        />
        <span>
          Status API:{' '}
          {apiStatus === 'online'
            ? 'Operacional'
            : apiStatus === 'offline'
              ? 'Offline'
              : 'Verificando...'}
        </span>
      </div>
    </div>
  )
}

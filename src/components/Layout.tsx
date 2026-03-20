import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { WhatsAppFAB } from '@/components/WhatsAppFAB'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Small timeout to ensure layout updates before scrolling
    setTimeout(() => {
      window.scrollTo(0, 0)
    }, 0)
  }, [pathname])

  return null
}

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen selection:bg-accent selection:text-primary bg-background">
      <ScrollToTop />
      <Header />
      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFAB />
    </div>
  )
}

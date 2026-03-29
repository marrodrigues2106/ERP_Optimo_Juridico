import { Outlet } from 'react-router-dom'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { IntranetSidebar } from '@/components/intranet/IntranetSidebar'

export default function Intranet() {
  return (
    <SidebarProvider>
      <IntranetSidebar />
      <SidebarInset className="bg-slate-50 overflow-x-hidden pt-16 lg:pt-0">
        <div className="lg:hidden p-4 border-b bg-white flex items-center">
          <SidebarTrigger />
        </div>
        <div className="p-4 md:p-6 h-full">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

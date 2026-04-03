import { Outlet } from 'react-router-dom'
import { IAChatSidebar } from '@/components/intranet/IAChatSidebar'

export default function Intranet() {
  return (
    <div className="bg-background overflow-x-hidden w-full min-h-[calc(100vh-3.5rem)] flex relative">
      <div className="p-4 md:p-6 h-full w-full max-w-[100vw] flex-1">
        <Outlet />
      </div>
      <IAChatSidebar />
    </div>
  )
}

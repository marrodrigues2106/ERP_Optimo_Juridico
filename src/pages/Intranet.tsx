import { Outlet } from 'react-router-dom'

export default function Intranet() {
  return (
    <div className="bg-background overflow-x-hidden w-full min-h-[calc(100vh-3.5rem)]">
      <div className="p-4 md:p-6 h-full w-full max-w-[100vw]">
        <Outlet />
      </div>
    </div>
  )
}

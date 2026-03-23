import { PushAlertsWidget } from './dashboard/PushAlertsWidget'

export default function Dashboard() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-primary tracking-tight">
          Painel de Controle
        </h2>
      </div>
      <div className="flex-1 w-full max-w-5xl mx-auto h-full flex flex-col">
        <PushAlertsWidget />
      </div>
    </div>
  )
}

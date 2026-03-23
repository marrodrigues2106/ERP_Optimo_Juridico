import { AgendaWidget } from './dashboard/AgendaWidget'
import { TasksWidget } from './dashboard/TasksWidget'
import { PushAlertsWidget } from './dashboard/PushAlertsWidget'

export default function Dashboard() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-primary tracking-tight">
          Painel de Controle
        </h2>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
        <div className="xl:col-span-2 space-y-6 flex flex-col h-full">
          <PushAlertsWidget />
        </div>
        <div className="xl:col-span-1 space-y-6 flex flex-col">
          <AgendaWidget />
          <TasksWidget />
        </div>
      </div>
    </div>
  )
}

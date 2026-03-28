import { PushAlertsWidget } from './dashboard/PushAlertsWidget'
import { TasksWidget } from './dashboard/TasksWidget'
import { AgendaWidget } from './dashboard/AgendaWidget'

export default function Dashboard() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-primary tracking-tight">
          Painel de Controle
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 w-full mx-auto h-full">
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <div className="h-[400px]">
            <PushAlertsWidget />
          </div>
          <div className="flex-1 min-h-[300px]">
            <TasksWidget />
          </div>
        </div>
        <div className="lg:col-span-1 h-full">
          <AgendaWidget />
        </div>
      </div>
    </div>
  )
}

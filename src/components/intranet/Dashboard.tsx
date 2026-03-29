import { PushAlertsWidget } from './dashboard/PushAlertsWidget'
import { TasksWidget } from './dashboard/TasksWidget'
import { AgendaWidget } from './dashboard/AgendaWidget'

export default function Dashboard() {
  return (
    <div className="space-y-6 h-full flex flex-col pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800 tracking-tight">
            Painel de Controle
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe suas publicações, andamentos e compromissos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 w-full mx-auto h-full">
        {/* Left Column - Feeds & Tasks */}
        <div className="xl:col-span-2 space-y-6 flex flex-col">
          <div className="h-[450px]">
            <PushAlertsWidget />
          </div>
          <div className="flex-1 min-h-[350px]">
            <TasksWidget />
          </div>
        </div>

        {/* Right Column - Agenda */}
        <div className="xl:col-span-1 h-full min-h-[450px]">
          <AgendaWidget />
        </div>
      </div>
    </div>
  )
}

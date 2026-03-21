import { UpdatesWidget } from './dashboard/UpdatesWidget'
import { AgendaWidget } from './dashboard/AgendaWidget'
import { TasksWidget } from './dashboard/TasksWidget'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-primary tracking-tight">
          Painel de Controle
        </h2>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6 flex flex-col">
          <UpdatesWidget />
          <TasksWidget />
        </div>
        <div className="xl:col-span-1 space-y-6">
          <AgendaWidget />
        </div>
      </div>
    </div>
  )
}

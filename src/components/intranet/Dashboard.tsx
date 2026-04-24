import { DashboardProductivity } from './dashboard/DashboardProductivity'
import { DashboardCommunications } from './dashboard/DashboardCommunications'
import { DashboardAgenda } from './dashboard/DashboardAgenda'

export default function Dashboard() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in-up px-4 md:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Dashboard de Produtividade
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão centralizada e projeção de demandas do seu escritório.
          </p>
        </div>
      </div>

      <DashboardProductivity />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[600px]">
        <div className="lg:col-span-8 flex flex-col min-h-0">
          <DashboardCommunications />
        </div>
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <DashboardAgenda />
        </div>
      </div>
    </div>
  )
}

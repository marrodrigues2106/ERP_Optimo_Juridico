import { useState, useEffect, useMemo, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart2,
  LineChart as LineChartIcon,
  Loader2,
  Users,
  PieChart as PieChartIcon,
} from 'lucide-react'
import { DashboardActivities } from './dashboard/DashboardActivities'
import { DashboardFinance } from './dashboard/DashboardFinance'
import { DashboardMovements } from './dashboard/DashboardMovements'
import { DashboardCrm } from './dashboard/DashboardCrm'
import { DashboardKanban } from './dashboard/DashboardKanban'
import { getTaskStatus, getEventStatus } from './dashboard/utils'
import { useRealtime } from '@/hooks/use-realtime'

export default function Productivity() {
  const [data, setData] = useState({
    tasks: [] as any[],
    events: [] as any[],
    movements: [] as any[],
    finances: [] as any[],
    interactions: [] as any[],
    kanbanColumns: [] as any[],
  })
  const [allCollabs, setAllCollabs] = useState<any[]>([])
  const [selectedCollabFilter, setSelectedCollabFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [collabId, setCollabId] = useState<string | null>(null)
  const [role, setRole] = useState({ isAdmin: false, isFinancial: false, canViewCRM: false })
  const [chartType, setChartType] = useState('bar')
  const [activeTab, setActiveTab] = useState('')

  const load = useCallback(async () => {
    try {
      const user = pb.authStore.record
      if (!user) return

      const isAdmin = user.isAdmin || user.role === 'admin'
      const isFinancial = user.role === 'financial_user'
      const canViewCRM = isAdmin || user.role === 'legal_team'
      setRole({ isAdmin, isFinancial, canViewCRM })

      let currentCollab = null
      try {
        const c = await pb
          .collection('collaborators')
          .getFirstListItem(`user="${user.id}" && deleted_at=""`)
        currentCollab = c.id
        setCollabId(c.id)
      } catch {
        /* intentionally ignored */
      }

      const orgId = user.active_organization
      const filter = orgId ? `organization="${orgId}" && deleted_at=""` : 'deleted_at=""'

      const [tasksRes, eventsRes, moveRes, finRes, interactionsRes, columnsRes] = await Promise.all(
        [
          pb.collection('tasks').getFullList({ filter, expand: 'collaborator' }),
          pb.collection('agenda_events').getFullList({ filter }),
          pb.collection('case_movements').getFullList({ filter, expand: 'case' }),
          pb.collection('finances').getFullList({ filter, expand: 'linked_lawsuit' }),
          canViewCRM
            ? pb.collection('crm_interactions').getFullList({ filter, expand: 'responsible' })
            : Promise.resolve([]),
          pb.collection('kanban_columns').getFullList({ filter, sort: 'order_index' }),
        ],
      )

      if (isAdmin) {
        const collabs = await pb.collection('collaborators').getFullList({ filter, sort: 'name' })
        setAllCollabs(collabs)
      }

      setData({
        tasks: tasksRes,
        events: eventsRes,
        movements: moveRes,
        finances: finRes,
        interactions: interactionsRes,
        kanbanColumns: columnsRes,
      })

      setActiveTab((prev) => {
        if (!prev) return isFinancial ? 'finance' : 'activities'
        return prev
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('tasks', () => load())
  useRealtime('crm_interactions', () => load())
  useRealtime('agenda_events', () => load())

  const activities = useMemo(() => {
    const list: any[] = []
    data.tasks.forEach((t) => {
      if (!role.isAdmin && t.collaborator !== collabId) return
      if (role.isAdmin && selectedCollabFilter !== 'all' && t.collaborator !== selectedCollabFilter)
        return
      list.push({ type: 'task', date: t.due_date || t.created, status: getTaskStatus(t), item: t })
    })
    data.events.forEach((e) => {
      const isParticipant =
        role.isAdmin || e.collaborator === collabId || e.participants?.includes(collabId)
      if (!isParticipant) return

      if (role.isAdmin && selectedCollabFilter !== 'all') {
        if (
          e.collaborator !== selectedCollabFilter &&
          !e.participants?.includes(selectedCollabFilter)
        )
          return
      }

      list.push({
        type: 'event',
        date: e.start_date || e.created,
        status: getEventStatus(e),
        item: e,
      })
    })
    return list
  }, [data.tasks, data.events, role.isAdmin, collabId, selectedCollabFilter])

  const myMovements = useMemo(() => {
    return data.movements.filter((m: any) => m.expand?.case?.responsible_collaborator === collabId)
  }, [data.movements, collabId])

  const filteredOfficeMovements = useMemo(() => {
    if (!role.isAdmin || selectedCollabFilter === 'all') return data.movements
    return data.movements.filter(
      (m: any) => m.expand?.case?.responsible_collaborator === selectedCollabFilter,
    )
  }, [data.movements, role.isAdmin, selectedCollabFilter])

  const filteredInteractions = useMemo(() => {
    if (!role.isAdmin || selectedCollabFilter === 'all') return data.interactions
    return data.interactions.filter((i) => i.responsible === selectedCollabFilter)
  }, [data.interactions, role.isAdmin, selectedCollabFilter])

  const filteredTasks = useMemo(() => {
    if (!role.isAdmin || selectedCollabFilter === 'all') return data.tasks
    return data.tasks.filter((t) => t.collaborator === selectedCollabFilter)
  }, [data.tasks, role.isAdmin, selectedCollabFilter])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const tabs = []
  if (role.isFinancial) tabs.push({ id: 'finance', label: 'Atividades Financeiras' })
  else tabs.push({ id: 'activities', label: 'Painel de Atividades' })

  if (role.canViewCRM) tabs.push({ id: 'crm', label: 'Atendimentos (CRM)' })
  tabs.push({ id: 'kanban', label: 'Atividades & Kanban' })

  if (role.isAdmin) tabs.push({ id: 'office_movements', label: 'Movimentação do Escritório' })
  tabs.push({ id: 'my_movements', label: 'Minhas Movimentações' })

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <BarChart2 className="w-8 h-8" /> Produtividade
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de performance e indicadores do módulo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {role.isAdmin && (
            <Select value={selectedCollabFilter} onValueChange={setSelectedCollabFilter}>
              <SelectTrigger className="w-48 bg-white">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {selectedCollabFilter === 'all'
                      ? 'Todo o Escritório'
                      : allCollabs.find((c) => c.id === selectedCollabFilter)?.name || 'Filtrar...'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Escritório</SelectItem>
                {allCollabs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="Tipo de Gráfico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" /> Barras Verticais
                </div>
              </SelectItem>
              <SelectItem value="horizontal">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 rotate-90" /> Barras Horiz.
                </div>
              </SelectItem>
              <SelectItem value="line">
                <div className="flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4" /> Linha
                </div>
              </SelectItem>
              <SelectItem value="pie">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4" /> Pizza / Circular
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl h-auto flex flex-wrap gap-1">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.some((t) => t.id === 'activities') && (
          <TabsContent value="activities">
            <DashboardActivities activities={activities} chartType={chartType} />
          </TabsContent>
        )}

        {tabs.some((t) => t.id === 'finance') && (
          <TabsContent value="finance">
            <DashboardFinance finances={data.finances} chartType={chartType} />
          </TabsContent>
        )}

        {tabs.some((t) => t.id === 'crm') && (
          <TabsContent value="crm">
            <DashboardCrm interactions={filteredInteractions} chartType={chartType} />
          </TabsContent>
        )}

        <TabsContent value="kanban">
          <DashboardKanban
            tasks={filteredTasks}
            kanbanColumns={data.kanbanColumns}
            chartType={chartType}
          />
        </TabsContent>

        {role.isAdmin && (
          <TabsContent value="office_movements">
            <DashboardMovements
              movements={filteredOfficeMovements}
              chartType={chartType}
              title={
                selectedCollabFilter === 'all'
                  ? 'Evolução de Movimentações (Geral)'
                  : 'Evolução de Movimentações (Filtrado)'
              }
            />
          </TabsContent>
        )}

        <TabsContent value="my_movements">
          <DashboardMovements
            movements={myMovements}
            chartType={chartType}
            title="Evolução de Movimentações (Minhas)"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

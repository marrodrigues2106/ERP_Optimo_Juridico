import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Scale, Users, Bell, Clock, BarChart2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AgendaWidget } from './dashboard/AgendaWidget'
import { TasksWidget } from './dashboard/TasksWidget'

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeCases: 0,
    totalClients: 0,
    unreadAlerts: 0,
    upcomingDeadlines: 0,
  })
  const [communications, setCommunications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const orgId = pb.authStore.record?.active_organization
        const baseFilter = orgId ? `organization="${orgId}" && deleted_at=""` : 'deleted_at=""'

        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const maxDateStr = format(addDays(new Date(), 2), 'yyyy-MM-dd')

        const [cases, clients, pje, dou, tasks, movements] = await Promise.all([
          pb
            .collection('legal_cases')
            .getList(1, 1, { filter: `${baseFilter} && lifecycle_status="Ativo"` }),
          pb
            .collection('clients')
            .getList(1, 1, { filter: `${baseFilter} && classification="Ativo"` }),
          pb.collection('pje_communications').getList(1, 15, {
            filter: baseFilter,
            sort: '-dataDisponibilizacao',
            expand: 'linked_case',
          }),
          pb
            .collection('gazette_publications')
            .getList(1, 1, { filter: `${baseFilter} && is_read=false` }),
          pb.collection('tasks').getList(1, 1, {
            filter: `${baseFilter} && status!="completed" && due_date >= "${todayStr} 00:00:00" && due_date <= "${maxDateStr} 23:59:59"`,
          }),
          pb.collection('case_movements').getList(1, 15, {
            filter: baseFilter,
            sort: '-event_date',
            expand: 'case',
          }),
        ])

        setStats({
          activeCases: cases.totalItems,
          totalClients: clients.totalItems,
          unreadAlerts: pje.items.filter((i: any) => !i.is_read).length + dou.totalItems,
          upcomingDeadlines: tasks.totalItems,
        })

        const combined = [
          ...movements.items.map((m: any) => ({
            id: m.id,
            date: m.event_date,
            description: m.description,
            case_number: m.expand?.case?.case_number || m.expand?.case?.parties || 'Sem processo',
            case_id: m.case,
            source: m.source,
          })),
          ...pje.items.map((p: any) => ({
            id: p.id,
            date: p.dataDisponibilizacao,
            description: p.texto || p.tipoComunicacao,
            case_number: p.numeroProcesso || p.expand?.linked_case?.case_number || 'Sem processo',
            case_id: p.linked_case,
            source: p.siglaTribunal || 'PJe',
          })),
        ]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 15)

        setCommunications(combined)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral e rápida do seu escritório.</p>
        </div>
        <Link
          to="/intranet/productivity"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <BarChart2 className="w-4 h-4 mr-2" />
          Análise de Produtividade
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">{stats.activeCases}</h3>
            <p className="text-sm text-muted-foreground font-medium">Processos Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">{stats.upcomingDeadlines}</h3>
            <p className="text-sm text-muted-foreground font-medium">Prazos (Próx. 48h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">{stats.totalClients}</h3>
            <p className="text-sm text-muted-foreground font-medium">Clientes Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-red-50 text-red-600 rounded-full">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">{stats.unreadAlerts}</h3>
            <p className="text-sm text-muted-foreground font-medium">Alertas Não Lidos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col h-[600px]">
          <Card className="flex-1 flex flex-col bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b py-3 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg text-slate-800">Comunicações Processuais</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {communications.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                  <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Nenhuma comunicação recente.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {communications.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => c.case_id && navigate(`/intranet/processos/${c.case_id}`)}
                      className={`p-4 transition-colors hover:bg-slate-50 ${c.case_id ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {c.source}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {c.date ? format(new Date(c.date), 'dd/MM/yyyy', { locale: ptBR }) : ''}
                        </span>
                      </div>
                      <p
                        className="text-sm font-bold text-slate-800 mt-2 line-clamp-1"
                        title={c.case_number}
                      >
                        {c.case_number}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col h-[600px]">
          <AgendaWidget />
        </div>

        <div className="lg:col-span-1 flex flex-col h-[600px]">
          <TasksWidget />
        </div>
      </div>
    </div>
  )
}

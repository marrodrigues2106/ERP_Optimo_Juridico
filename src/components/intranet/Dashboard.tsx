import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Loader2,
  Scale,
  Users,
  Bell,
  Clock,
  Calendar as CalendarIcon,
  ArrowRight,
  AlertTriangle,
  BarChart2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeCases: 0,
    totalClients: 0,
    unreadAlerts: 0,
    upcomingDeadlines: 0,
  })
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const orgId = pb.authStore.record?.active_organization
        const baseFilter = orgId ? `organization="${orgId}" && deleted_at=""` : 'deleted_at=""'

        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const maxDateStr = format(addDays(new Date(), 2), 'yyyy-MM-dd')

        const [cases, clients, pje, dou, tasks] = await Promise.all([
          pb
            .collection('legal_cases')
            .getList(1, 1, { filter: `${baseFilter} && lifecycle_status="Ativo"` }),
          pb
            .collection('clients')
            .getList(1, 1, { filter: `${baseFilter} && classification="Ativo"` }),
          pb
            .collection('pje_communications')
            .getList(1, 5, {
              filter: `${baseFilter} && is_read=false`,
              sort: '-dataDisponibilizacao',
            }),
          pb
            .collection('gazette_publications')
            .getList(1, 5, { filter: `${baseFilter} && is_read=false`, sort: '-data_publicacao' }),
          pb.collection('tasks').getList(1, 5, {
            filter: `${baseFilter} && status!="completed" && due_date >= "${todayStr} 00:00:00" && due_date <= "${maxDateStr} 23:59:59"`,
            sort: 'due_date',
          }),
        ])

        setStats({
          activeCases: cases.totalItems,
          totalClients: clients.totalItems,
          unreadAlerts: pje.totalItems + dou.totalItems,
          upcomingDeadlines: tasks.totalItems,
        })
        setDeadlines(tasks.items)

        const combinedAlerts = [
          ...pje.items.map((i) => ({
            ...i,
            source: 'PJe',
            date: i.dataDisponibilizacao,
            text: i.texto || i.tipoComunicacao,
            id: i.id,
          })),
          ...dou.items.map((i) => ({
            ...i,
            source: 'DOU',
            date: i.data_publicacao,
            text: i.texto_normalizado || i.resumo,
            id: i.id,
          })),
        ]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)

        setAlerts(combinedAlerts)
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-500" /> Prazos Urgentes
              </CardTitle>
              <CardDescription>Vencendo nas próximas 48 horas.</CardDescription>
            </div>
            <Link
              to="/intranet/agenda"
              className="text-sm text-primary hover:underline flex items-center"
            >
              Agenda <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            {deadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum prazo urgente no momento.
              </p>
            ) : (
              <div className="space-y-4">
                {deadlines.map((d) => (
                  <div
                    key={d.id}
                    className="flex justify-between items-start border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm text-slate-800">{d.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {d.description || 'Sem descrição'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap">
                      {d.due_date
                        ? format(new Date(d.due_date), 'dd/MM HH:mm', { locale: ptBR })
                        : 'S/ Data'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Alertas Recentes
              </CardTitle>
              <CardDescription>Últimas publicações e intimações.</CardDescription>
            </div>
            <Link
              to="/intranet/atualizacoes"
              className="text-sm text-primary hover:underline flex items-center"
            >
              Central <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Tudo em dia! Nenhum alerta pendente.
              </p>
            ) : (
              <div className="space-y-4">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {a.source}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {a.date ? format(new Date(a.date), 'dd/MM/yyyy', { locale: ptBR }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{a.text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

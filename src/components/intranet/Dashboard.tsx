import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Loader2,
  Scale,
  Bell,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  AlertCircle,
  PlayCircle,
  BarChart2,
  MailOpen,
  Mail,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    delayed: 0,
    inProgress: 0,
    completed: 0,
    activeCases: 0,
    unreadAlerts: 0,
  })

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [pendingTasks, setPendingTasks] = useState<any[]>([])

  const [communications, setCommunications] = useState<any[]>([])
  const [commsTotal, setCommsTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [readFilter, setReadFilter] = useState<'unread' | 'read'>('unread')
  const [loadingComms, setLoadingComms] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)

  const loadStatsAndRightPanel = async () => {
    try {
      const orgId = pb.authStore.record?.active_organization
      const baseFilter = orgId ? `organization="${orgId}" && deleted_at=""` : 'deleted_at=""'

      const [cases, allTasks, pjeUnread, events] = await Promise.all([
        pb
          .collection('legal_cases')
          .getList(1, 1, { filter: `${baseFilter} && lifecycle_status="Ativo"` }),
        pb.collection('tasks').getFullList({ filter: baseFilter, expand: 'linked_lawsuit' }),
        pb
          .collection('pje_communications')
          .getList(1, 1, {
            filter: orgId ? `organization="${orgId}" && is_read=false` : `is_read=false`,
          }),
        pb
          .collection('agenda_events')
          .getFullList({ filter: baseFilter, expand: 'linked_lawsuit' }),
      ])

      const now = new Date()
      let delayed = 0
      let inProgress = 0
      let completed = 0

      const pTasks = allTasks
        .filter((t) => {
          if (t.status === 'completed') {
            completed++
            return false
          }
          if (t.due_date && isBefore(new Date(t.due_date), startOfDay(now))) {
            delayed++
          } else {
            inProgress++
          }
          return true
        })
        .sort((a, b) => {
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        })

      setStats({
        activeCases: cases.totalItems,
        unreadAlerts: pjeUnread.totalItems,
        delayed,
        inProgress,
        completed,
      })

      setPendingTasks(pTasks)

      const uEvents = events
        .filter((e) => {
          const compareDate = e.end_date ? new Date(e.end_date) : new Date(e.start_date)
          return compareDate >= now
        })
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

      setUpcomingEvents(uEvents)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }

  const loadComms = async () => {
    setLoadingComms(true)
    try {
      const orgId = pb.authStore.record?.active_organization
      const isReadVal = readFilter === 'read' ? 'true' : 'false'
      const filter = orgId
        ? `organization="${orgId}" && is_read=${isReadVal}`
        : `is_read=${isReadVal}`

      const res = await pb.collection('pje_communications').getList(page, perPage, {
        filter,
        sort: '-dataDisponibilizacao',
        expand: 'linked_case',
      })
      setCommunications(res.items)
      setCommsTotal(res.totalItems)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingComms(false)
    }
  }

  useEffect(() => {
    loadStatsAndRightPanel()
  }, [])

  useEffect(() => {
    loadComms()
  }, [page, perPage, readFilter])

  useRealtime('pje_communications', loadComms)
  useRealtime('tasks', loadStatsAndRightPanel)
  useRealtime('agenda_events', loadStatsAndRightPanel)

  const toggleReadStatus = async (e: React.MouseEvent, c: any) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await pb.collection('pje_communications').update(c.id, { is_read: !c.is_read })
      loadComms()
      loadStatsAndRightPanel()
    } catch (err) {
      console.error(err)
    }
  }

  if (loadingStats) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in-up px-4 md:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Gestão centralizada do seu escritório.</p>
        </div>
        <Link
          to="/intranet/productivity"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <BarChart2 className="w-4 h-4 mr-2" />
          Análise de Produtividade
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[750px]">
        {/* LEFT COLUMN: Productivity Stats */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card className="flex-shrink-0 border-slate-200 shadow-sm">
            <CardHeader className="pb-2 bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4" /> Desempenho de Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-slate-700">Em andamento</span>
                </div>
                <span className="text-2xl font-bold">{stats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-slate-700">Atrasadas</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{stats.delayed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium text-slate-700">Concluídas</span>
                </div>
                <span className="text-2xl font-bold">{stats.completed}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-shrink-0 border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full shrink-0">
                <Scale className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Processos Ativos</p>
                <h3 className="text-3xl font-bold text-slate-800">{stats.activeCases}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-shrink-0 border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-full shrink-0">
                <Bell className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">
                  Alertas PJe Não Lidos
                </p>
                <h3 className="text-3xl font-bold text-slate-800">{stats.unreadAlerts}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER COLUMN: Communications Console */}
        <div className="lg:col-span-6 flex flex-col min-h-[500px] h-full">
          <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="pb-3 border-b bg-white flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                <Bell className="w-5 h-5 text-primary" />
                Comunicações Processuais
              </CardTitle>
              <div className="flex items-center gap-3">
                <Select
                  value={readFilter}
                  onValueChange={(v: any) => {
                    setReadFilter(v)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unread">Não Lidos</SelectItem>
                    <SelectItem value="read">Lidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden bg-slate-50/30">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loadingComms ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="animate-spin w-8 h-8 text-primary/50" />
                  </div>
                ) : communications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                    <Bell className="w-10 h-10 opacity-20" />
                    <p className="text-sm font-medium">Nenhuma comunicação encontrada.</p>
                  </div>
                ) : (
                  communications.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        'p-4 border rounded-lg transition-colors bg-white relative group',
                        c.is_read ? 'border-slate-200 opacity-75' : 'border-primary/30 shadow-sm',
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {c.siglaTribunal || 'PJe'}
                          </span>
                          {!c.is_read && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground font-medium">
                            {c.dataDisponibilizacao
                              ? format(new Date(c.dataDisponibilizacao), 'dd/MM/yyyy HH:mm')
                              : ''}
                          </span>
                          <button
                            onClick={(e) => toggleReadStatus(e, c)}
                            className="text-slate-400 hover:text-primary transition-colors"
                            title={c.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                          >
                            {c.is_read ? (
                              <MailOpen className="w-4 h-4" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p
                        className="text-sm font-bold text-slate-800 mb-1 hover:text-primary cursor-pointer transition-colors"
                        onClick={() =>
                          c.linked_case && navigate(`/intranet/processos/${c.linked_case}`)
                        }
                      >
                        {c.numeroProcesso}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {c.texto || c.tipoComunicacao}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination Footer */}
              <div className="p-3 border-t bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Itens por página:</span>
                  <Select
                    value={perPage.toString()}
                    onValueChange={(v) => {
                      setPerPage(Number(v))
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Pagination className="justify-end w-auto mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setPage((p) => Math.max(1, p - 1))
                        }}
                        className={cn(
                          'h-8 px-3 text-xs',
                          page === 1 ? 'pointer-events-none opacity-50' : '',
                        )}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-xs font-medium text-slate-600 px-3">
                        Pág. {page} {commsTotal > 0 && `de ${Math.ceil(commsTotal / perPage)}`}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setPage((p) => p + 1)
                        }}
                        className={cn(
                          'h-8 px-3 text-xs',
                          page * perPage >= commsTotal ? 'pointer-events-none opacity-50' : '',
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Agenda & Tasks */}
        <div className="lg:col-span-3 flex flex-col min-h-[500px] h-full">
          <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="pb-3 border-b bg-white shrink-0">
              <CardTitle className="text-lg flex items-center justify-between text-slate-800">
                <span className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" /> Agenda e Tarefas
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
              <div className="p-4 space-y-8">
                {/* Agenda Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" /> Próximos Compromissos
                    </h4>
                    <Link
                      to="/intranet/agenda"
                      className="text-[10px] font-medium text-indigo-600 hover:underline"
                    >
                      Ver tudo
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {upcomingEvents.length === 0 ? (
                      <p className="text-xs text-slate-500 italic bg-white p-3 rounded border border-dashed border-slate-200 text-center">
                        Nenhum compromisso futuro.
                      </p>
                    ) : (
                      upcomingEvents.map((e) => (
                        <div
                          key={e.id}
                          className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm flex gap-3 relative overflow-hidden group hover:border-indigo-200 transition-colors"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-bold text-slate-800 truncate mb-1"
                              title={e.title}
                            >
                              {e.title}
                            </p>
                            <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                              <span className="font-semibold text-indigo-600">
                                {format(new Date(e.start_date), "dd/MM 'às' HH:mm")}
                              </span>
                              {e.expand?.linked_lawsuit && (
                                <span className="truncate text-slate-400">
                                  Processo: {e.expand.linked_lawsuit.case_number || 'S/N'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Tasks Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tarefas Pendentes
                    </h4>
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {pendingTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pendingTasks.length === 0 ? (
                      <p className="text-xs text-slate-500 italic bg-white p-3 rounded border border-dashed border-slate-200 text-center">
                        Nenhuma tarefa pendente.
                      </p>
                    ) : (
                      pendingTasks.map((t) => {
                        const isDelayed =
                          t.due_date && isBefore(new Date(t.due_date), startOfDay(new Date()))
                        return (
                          <div
                            key={t.id}
                            className={cn(
                              'bg-white p-3 border rounded-lg shadow-sm flex gap-3 relative overflow-hidden group transition-colors',
                              isDelayed
                                ? 'border-red-200'
                                : 'border-slate-200 hover:border-emerald-200',
                            )}
                          >
                            <div
                              className={cn(
                                'absolute left-0 top-0 bottom-0 w-1',
                                isDelayed ? 'bg-red-500' : 'bg-emerald-500',
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  'text-sm font-bold truncate mb-1',
                                  isDelayed ? 'text-red-700' : 'text-slate-800',
                                )}
                                title={t.title}
                              >
                                {t.title}
                              </p>
                              {t.due_date && (
                                <div
                                  className={cn(
                                    'text-[11px] font-semibold',
                                    isDelayed ? 'text-red-600' : 'text-slate-500',
                                  )}
                                >
                                  Prazo: {format(new Date(t.due_date), 'dd/MM/yyyy')}
                                </div>
                              )}
                              {t.expand?.linked_lawsuit && (
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  Processo: {t.expand.linked_lawsuit.case_number || 'S/N'}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

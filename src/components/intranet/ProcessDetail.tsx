import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegalCase, updateLegalCase, getLegalCases } from '@/services/legal_cases'
import { getFinancesByLawsuit } from '@/services/finances'
import { getPaginatedCaseMovements, createCaseMovement } from '@/services/case_movements'
import { getAgendaEventsByLawsuit } from '@/services/agenda'
import { getTasksByLawsuit, createTask, updateTask } from '@/services/tasks'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft,
  Briefcase,
  User,
  Plus,
  RefreshCw,
  Clock,
  Bell,
  Link as LinkIcon,
  X,
  FileText,
  MessageSquare,
  Scale,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  Check,
} from 'lucide-react'

const renderMovementText = (text: string) => {
  if (!text) return text
  const keywords = [
    'NÚMERO ÚNICO:',
    'POLO ATIVO',
    'POLO PASSIVO',
    'ADVOGADO \\(A/S\\)',
    'DATA DE DISPONIBILIZAÇÃO:',
    'DATA DE PUBLICAÇÃO:',
  ]

  const regex = new RegExp(`(${keywords.join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) => {
    if (keywords.some((k) => new RegExp(`^${k}$`, 'i').test(part))) {
      return (
        <strong key={i} className="font-bold text-slate-800 bg-yellow-100/50 px-1 rounded">
          {part}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}
import { EventFormModal } from './cases/EventFormModal'
import { runDatajudSync } from '@/lib/datajud/sync'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export default function ProcessDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [legalCase, setLegalCase] = useState<any>(null)

  // Pagination State
  const [movements, setMovements] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalMovements, setTotalMovements] = useState(0)

  const [events, setEvents] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [processFinances, setProcessFinances] = useState<any[]>([])
  const [allCases, setAllCases] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [prefilledDescription, setPrefilledDescription] = useState('')
  const [selectedRelatedCase, setSelectedRelatedCase] = useState<string>('')
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const loadBaseData = async () => {
    if (!id) return
    try {
      setLegalCase(await getLegalCase(id))
      setEvents(await getAgendaEventsByLawsuit(id))
      setTasks(await getTasksByLawsuit(id))
      setProcessFinances(await getFinancesByLawsuit(id))
      const all = await getLegalCases()
      setAllCases(all.filter((c) => c.id !== id))
    } catch (e) {
      toast({ title: 'Registro não encontrado', variant: 'destructive' })
      navigate('/intranet/processos')
    } finally {
      setLoading(false)
    }
  }

  const loadMovements = async () => {
    if (!id) return
    try {
      const res = await getPaginatedCaseMovements(id, page, perPage)
      setMovements(res.items)
      setTotalMovements(res.totalItems)
    } catch (e) {
      console.error('Error loading movements', e)
    }
  }

  useEffect(() => {
    loadBaseData()
  }, [id])

  useEffect(() => {
    loadMovements()
  }, [id, page, perPage])

  useRealtime('legal_cases', loadBaseData)
  useRealtime('case_movements', loadMovements)
  useRealtime('agenda_events', loadBaseData)
  useRealtime('tasks', loadBaseData)
  useRealtime('finances', loadBaseData)

  const handleAddManualMovement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const desc = fd.get('description') as string

    try {
      await createCaseMovement({
        case: id,
        event_date: new Date().toISOString(),
        description: desc,
        source: 'Manual',
        external_id: `manual_${Date.now()}`,
      })
      toast({ title: 'Andamento registrado' })
      e.currentTarget.reset()
      setPage(1) // Go to first page to see the new movement
    } catch (err) {
      toast({ title: 'Erro ao registrar andamento', variant: 'destructive' })
    }
  }

  const handleSyncDatajud = async () => {
    if (!legalCase?.case_number) {
      toast({ title: 'Número CNJ não informado.', variant: 'destructive' })
      return
    }
    setIsSyncing(true)
    try {
      await runDatajudSync(legalCase, (msg) => {
        toast({ title: 'Sincronização', description: msg })
      })
      await loadBaseData()
      await loadMovements()
    } catch (err: any) {
      let errorMsg = err?.message || 'Erro desconhecido'
      toast({ title: 'Erro na Sincronização', description: errorMsg, variant: 'destructive' })
    } finally {
      setIsSyncing(false)
    }
  }

  const openEventModal = (desc = '') => {
    setPrefilledDescription(desc)
    setEventModalOpen(true)
  }

  const handleLinkCase = async () => {
    if (!selectedRelatedCase) return
    const currentRelated = legalCase.related_cases || []
    if (currentRelated.includes(selectedRelatedCase)) {
      toast({ title: 'Caso já vinculado.', variant: 'destructive' })
      return
    }
    try {
      await updateLegalCase(id!, { related_cases: [...currentRelated, selectedRelatedCase] })
      toast({ title: 'Caso vinculado com sucesso' })
      setSelectedRelatedCase('')
      loadBaseData()
    } catch (err) {
      toast({ title: 'Erro ao vincular', variant: 'destructive' })
    }
  }

  const handleUnlinkCase = async (caseIdToUnlink: string) => {
    const currentRelated = legalCase.related_cases || []
    const updated = currentRelated.filter((cid: string) => cid !== caseIdToUnlink)
    try {
      await updateLegalCase(id!, { related_cases: updated })
      toast({ title: 'Vínculo removido' })
      loadBaseData()
    } catch (err) {
      toast({ title: 'Erro ao remover vínculo', variant: 'destructive' })
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle) return
    try {
      await createTask({
        title: newTaskTitle,
        priority: 'medium',
        status: 'todo',
        linked_lawsuit: id,
      })
      setNewTaskTitle('')
      toast({ title: 'Tarefa adicionada' })
      loadBaseData()
    } catch (err) {
      toast({ title: 'Erro ao adicionar tarefa', variant: 'destructive' })
    }
  }

  const toggleTask = async (t: any) => {
    await updateTask(t.id, { status: t.status === 'todo' ? 'completed' : 'todo' })
    loadBaseData()
  }

  const totalPages = Math.max(1, Math.ceil(totalMovements / perPage))

  const formatMovementDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading || !legalCase)
    return (
      <div className="p-8 animate-pulse text-center text-slate-500">Carregando processo...</div>
    )

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 pb-12">
      {/* Left Column: Main Timeline & Details */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Header Block */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/intranet/processos')}
              className="shrink-0 text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800 leading-tight mb-1">
                {legalCase.parties}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                {legalCase.case_number && (
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">
                    {legalCase.case_number}
                  </span>
                )}
                {legalCase.court && (
                  <span className="uppercase font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                    {legalCase.court}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge
                variant={legalCase.lifecycle_status === 'Ativo' ? 'default' : 'secondary'}
                className="uppercase"
              >
                {legalCase.lifecycle_status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncDatajud}
                disabled={isSyncing}
                className="h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />{' '}
                Sincronizar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600 border-t pt-3 mt-1 border-slate-100">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">Cliente:</span>{' '}
              {legalCase.expand?.client?.name || 'Não vinculado'}
            </div>
            <div className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">Responsável:</span>{' '}
              {legalCase.expand?.responsible_collaborator?.name || 'Não atribuído'}
            </div>
            {legalCase.metadata?.action_class && (
              <div className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">Classe:</span>{' '}
                {legalCase.metadata.action_class}
              </div>
            )}
          </div>
        </div>

        {/* Action Input Block */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Tabs defaultValue="andamento" className="w-full">
            <div className="bg-slate-50 px-4 border-b border-slate-200 flex items-center justify-between">
              <TabsList className="bg-transparent h-12 p-0 gap-6">
                <TabsTrigger
                  value="andamento"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 text-sm font-medium text-slate-600 data-[state=active]:text-primary"
                >
                  Novo andamento
                </TabsTrigger>
                <TabsTrigger
                  value="tarefa"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 text-sm font-medium text-slate-600 data-[state=active]:text-primary"
                >
                  Nova tarefa
                </TabsTrigger>
                <TabsTrigger
                  value="evento"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 text-sm font-medium text-slate-600 data-[state=active]:text-primary"
                >
                  Ocorrência Processual
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="andamento" className="p-4 m-0">
              <form onSubmit={handleAddManualMovement} className="flex gap-3">
                <Input
                  name="description"
                  placeholder="Comece a digitar para adicionar um andamento manual..."
                  required
                  className="flex-1 bg-slate-50 border-slate-200"
                />
                <Button type="submit">Salvar</Button>
              </form>
            </TabsContent>

            <TabsContent value="tarefa" className="p-4 m-0">
              <form onSubmit={handleAddTask} className="flex gap-3">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Título da nova tarefa para este caso..."
                  className="flex-1 bg-slate-50 border-slate-200"
                />
                <Button type="submit">Adicionar</Button>
              </form>
            </TabsContent>

            <TabsContent value="evento" className="p-4 m-0">
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const tipo = fd.get('tipo') as string
                  const desc = fd.get('description') as string
                  try {
                    await createCaseMovement({
                      case: id,
                      event_date: new Date().toISOString(),
                      description: `[${tipo}] ${desc}`,
                      source: 'Manual',
                      external_id: `evento_${Date.now()}`,
                    })
                    toast({ title: 'Ocorrência registrada no processo' })
                    e.currentTarget.reset()
                    setPage(1)
                  } catch (err) {
                    toast({ title: 'Erro ao registrar ocorrência', variant: 'destructive' })
                  }
                }}
                className="flex gap-3 flex-wrap sm:flex-nowrap"
              >
                <Select name="tipo" defaultValue="Audiência">
                  <SelectTrigger className="w-[150px] bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Audiência">Audiência</SelectItem>
                    <SelectItem value="Despacho">Despacho</SelectItem>
                    <SelectItem value="Juntada">Juntada</SelectItem>
                    <SelectItem value="Sentença">Sentença</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  name="description"
                  placeholder="Detalhes da ocorrência..."
                  required
                  className="flex-1 bg-slate-50 border-slate-200"
                />
                <Button type="submit" className="w-full sm:w-auto">
                  Registrar
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Movements Table Block */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
              Histórico de Andamentos
              <Badge variant="secondary" className="font-normal text-xs">
                {totalMovements}
              </Badge>
            </h3>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Itens por página:</span>
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  setPerPage(Number(v))
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[70px] h-8 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {movements.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-slate-500 border rounded-lg bg-slate-50">
                Nenhum andamento encontrado.
              </div>
            ) : (
              movements.map((mov) => {
                let organName = '-'
                let complements = ''

                if (mov.movement_details) {
                  const detailsObj =
                    typeof mov.movement_details === 'string'
                      ? JSON.parse(mov.movement_details)
                      : mov.movement_details
                  organName = detailsObj.orgaoJulgador || '-'
                  if (detailsObj.texto_publicacao) {
                    complements = detailsObj.texto_publicacao
                  } else if (
                    detailsObj.complementosTabelados &&
                    Array.isArray(detailsObj.complementosTabelados)
                  ) {
                    complements = detailsObj.complementosTabelados
                      .map((c: any) => `${c.nome}: ${c.valor}`)
                      .join(' • ')
                  }
                } else if (mov.details) {
                  complements = mov.details
                }

                const matchedTerms =
                  typeof mov.movement_details === 'object' &&
                  mov.movement_details?.termos_encontrados
                    ? mov.movement_details.termos_encontrados.join(' • ')
                    : mov.matched_term || ''

                return (
                  <div
                    key={mov.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-medium text-slate-700 leading-tight">
                          {mov.source} &gt; {mov.description}
                          {organName !== '-' && ` - ${organName}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-slate-500 font-mono">
                      {formatMovementDate(mov.event_date)}
                    </div>

                    <div className="text-sm text-slate-600 leading-relaxed uppercase whitespace-pre-wrap">
                      {renderMovementText(complements || mov.description)}
                    </div>

                    {matchedTerms && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                        <Bell className="w-4 h-4" />
                        Termos encontrados: {matchedTerms}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium px-2"
                        onClick={() => openEventModal(`Ref: ${mov.description}`)}
                      >
                        <Calendar className="w-4 h-4 mr-2" /> Adicionar compromisso
                      </Button>
                      <div className="flex items-center gap-5 flex-1 justify-end">
                        <div className="text-sm text-slate-500 flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                          <MessageSquare className="w-4 h-4" /> Comentar
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-600 text-sm font-medium cursor-pointer hover:underline">
                          <Check className="w-4 h-4" /> 1 marcou como lido
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalMovements > 0 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (page > 1) setPage(page - 1)
                      }}
                      className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-sm font-medium text-slate-600 px-4">
                      Página {page} de {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (page < totalPages) setPage(page + 1)
                      }}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Widgets */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-6">
        {/* Linked Cases */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
              <LinkIcon className="w-4 h-4 text-slate-400" /> Vinculados (
              {legalCase.expand?.related_cases?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3 mt-3">
              {legalCase.expand?.related_cases?.length > 0 ? (
                legalCase.expand.related_cases.map((rc: any) => (
                  <div
                    key={rc.id}
                    className="flex flex-col p-2 bg-slate-50 rounded border border-slate-100 relative group"
                  >
                    <span
                      className="text-xs font-semibold text-slate-700 truncate pr-6 cursor-pointer hover:underline"
                      onClick={() => navigate(`/intranet/processos/${rc.id}`)}
                    >
                      {rc.parties}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {rc.case_number || 'Sem número'}
                    </span>
                    <button
                      onClick={() => handleUnlinkCase(rc.id)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhum processo vinculado.
                </p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Select value={selectedRelatedCase} onValueChange={setSelectedRelatedCase}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Vincular processo..." />
                </SelectTrigger>
                <SelectContent>
                  {allCases.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.case_number || c.parties}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleLinkCase}
                size="sm"
                disabled={!selectedRelatedCase}
                className="h-8 px-2"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
              <MessageSquare className="w-4 h-4 text-slate-400" /> Tarefas (
              {tasks.filter((t) => t.status !== 'completed').length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma tarefa criada.
              </p>
            ) : (
              <div className="space-y-2 mt-2">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-start gap-2 p-2 rounded text-sm ${t.status === 'completed' ? 'opacity-50' : 'hover:bg-slate-50'}`}
                  >
                    <Checkbox
                      className="mt-0.5 h-3.5 w-3.5"
                      checked={t.status === 'completed'}
                      onCheckedChange={() => toggleTask(t)}
                    />
                    <span
                      className={`leading-tight ${t.status === 'completed' ? 'line-through' : ''}`}
                    >
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events / Commitments */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
              <Calendar className="w-4 h-4 text-slate-400" /> Compromissos ({events.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => openEventModal()}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum evento agendado.
              </p>
            ) : (
              <div className="space-y-3 mt-2">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex gap-3 bg-white border border-slate-100 p-2.5 rounded shadow-sm"
                  >
                    <div className="flex flex-col items-center justify-center bg-slate-50 rounded px-2 py-1 min-w-[45px]">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {new Date(evt.start_date).toLocaleString('pt-BR', { month: 'short' })}
                      </span>
                      <span className="text-sm font-black text-slate-800">
                        {new Date(evt.start_date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-semibold text-slate-800 line-clamp-1"
                        title={evt.title}
                      >
                        {evt.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />{' '}
                        {new Date(evt.start_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        <span className="ml-1 px-1 bg-slate-100 rounded text-slate-600">
                          {evt.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Simple Finance Summary */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
              <DollarSign className="w-4 h-4 text-slate-400" /> Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-500 text-xs">Custo Previsto</span>
              <span className="font-medium text-slate-700">
                R$ {legalCase.estimated_total_cost?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">Registros ({processFinances.length})</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => navigate('/intranet/finance')}
              >
                Ver detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <EventFormModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        lawsuitId={id!}
        prefilledDescription={prefilledDescription}
        onSuccess={() => loadBaseData()}
      />
    </div>
  )
}

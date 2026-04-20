import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegalCase } from '@/services/legal_cases'
import { getPaginatedCaseMovements } from '@/services/case_movements'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  ArrowLeft,
  RefreshCw,
  User,
  Briefcase,
  Info,
  Link as LinkIcon,
  Calendar,
  CheckSquare,
  Plus,
  Scale,
  FileText,
  Tags,
  Hash,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

export default function ProcessDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [legalCase, setLegalCase] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [movementsPage, setMovementsPage] = useState(1)
  const [movementsTotalPages, setMovementsTotalPages] = useState(1)

  const [tasks, setTasks] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [finances, setFinances] = useState<any[]>([])
  const [newMovement, setNewMovement] = useState('')
  const [activeTab, setActiveTab] = useState('andamento')

  useEffect(() => {
    if (id) {
      loadData()
      loadMovements(1)
    }
  }, [id])

  useRealtime('legal_cases', (e) => {
    if (e.record.id === id) {
      setLegalCase((prev: any) => {
        if (!prev) return prev
        const wasNotIdle = prev.pje_sync_status === 'syncing' || prev.pje_sync_status === 'pending'
        const isIdleNow =
          e.record.pje_sync_status === 'idle' ||
          e.record.pje_sync_status === 'success' ||
          e.record.pje_sync_status === 'error'
        if (wasNotIdle && isIdleNow) {
          loadMovements(1)
          loadData()
        }
        return { ...prev, ...e.record }
      })
    }
  })

  useRealtime('case_movements', (e) => {
    if (e.record.case === id) {
      loadMovements(movementsPage)
      loadData()
    }
  })

  const loadData = async () => {
    try {
      const c = await getLegalCase(id!)
      setLegalCase(c)
      const tks = await pb
        .collection('tasks')
        .getFullList({ filter: `linked_lawsuit = "${id}" && deleted_at = ""`, sort: '-created' })
      setTasks(tks)
      const evs = await pb
        .collection('agenda_events')
        .getFullList({ filter: `linked_lawsuit = "${id}" && deleted_at = ""`, sort: '-start_date' })
      setEvents(evs)
      const fins = await pb
        .collection('finances')
        .getFullList({ filter: `linked_lawsuit = "${id}" && deleted_at = ""`, sort: '-created' })
      setFinances(fins)
    } catch (err) {
      toast({ title: 'Erro ao carregar processo', variant: 'destructive' })
    }
  }

  const loadMovements = async (page: number) => {
    try {
      const res = await getPaginatedCaseMovements(id!, page, 10)
      setMovements(res.items)
      setMovementsTotalPages(res.totalPages)
      setMovementsPage(page)
    } catch (err) {
      toast({ title: 'Erro ao carregar andamentos', variant: 'destructive' })
    }
  }

  const handleSync = async () => {
    try {
      setLegalCase((prev: any) => ({ ...prev, pje_sync_status: 'syncing' }))

      const res = await pb.send(`/backend/v1/processos/${id}/sync-pje`, {
        method: 'GET',
      })

      toast({
        title: 'Sincronização iniciada',
        description: res?.message || 'Processo atualizado com o PJe com sucesso.',
      })

      loadData()
      loadMovements(1)
    } catch (error: any) {
      let userMessage =
        'O tribunal está indisponível ou rejeitou a requisição. Tente novamente mais tarde.'

      const status = error?.status || error?.response?.status || 500
      const errorMsg = String(error?.response?.message || error?.message || '')
      const isForbidden = status === 403 || errorMsg.includes('PJE_FORBIDDEN')

      if (isForbidden) {
        userMessage =
          'Erro 403: Acesso bloqueado pelo CloudFront do Tribunal. A sincronização foi interrompida devido a restrições regionais do servidor de destino.'
      } else if (status === 401 || errorMsg.includes('PJE_UNAUTHORIZED')) {
        userMessage = 'Não autorizado (401). A chave de API do tribunal pode estar expirada.'
      } else if (status === 400 || errorMsg.includes('PJE_BAD_REQUEST')) {
        userMessage = 'Requisição inválida (400) ou processo não encontrado no tribunal.'
      } else if (errorMsg.includes('PJE_TIMEOUT') || status === 503 || status === 504) {
        userMessage =
          'O sistema do tribunal (PJe) está indisponível no momento. A sincronização foi agendada para segundo plano.'
      } else if (errorMsg && errorMsg !== 'undefined' && errorMsg !== 'null') {
        userMessage = errorMsg
      }

      if (!isForbidden) {
        try {
          const currentRecord = await getLegalCase(id!)
          if (
            currentRecord.pje_sync_status === 'pending' ||
            currentRecord.pje_sync_status === 'syncing'
          ) {
            toast({
              title: 'Sincronização em andamento',
              description: 'A sincronização foi enviada para processamento em segundo plano.',
            })
            setLegalCase(currentRecord)
            return
          }
        } catch (err) {
          /* ignore error */
        }
      }

      toast({
        title: 'Aviso de Sincronização',
        description: userMessage,
        variant: 'destructive',
      })

      setLegalCase((prev: any) => {
        if (!prev) return prev
        return { ...prev, pje_sync_status: 'error' }
      })
      loadData()
    }
  }

  const handleAddMovement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newMovement.trim()) return
    try {
      await pb.collection('case_movements').create({
        case: id,
        event_date: new Date().toISOString(),
        description: newMovement,
        source: 'Manual',
        organization: pb.authStore.record?.active_organization,
      })
      setNewMovement('')
      toast({ title: 'Ocorrência processual registrada.' })
      loadMovements(1)
      setActiveTab('andamento')
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', variant: 'destructive' })
    }
  }

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('tasks').create({
        title: fd.get('title'),
        due_date: fd.get('due_date')
          ? new Date(`${fd.get('due_date')}T12:00:00Z`).toISOString()
          : '',
        priority: fd.get('priority'),
        status: 'todo',
        linked_lawsuit: id,
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Tarefa criada' })
      loadData()
      ;(e.target as HTMLFormElement).reset()
      setActiveTab('andamento')
    } catch (err: any) {
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' })
    }
  }

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('agenda_events').create({
        title: fd.get('title'),
        start_date: fd.get('start_date')
          ? new Date(`${fd.get('start_date')}T12:00:00Z`).toISOString()
          : '',
        type: fd.get('type'),
        linked_lawsuit: id,
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Compromisso criado' })
      loadData()
      ;(e.target as HTMLFormElement).reset()
      setActiveTab('andamento')
    } catch (err: any) {
      toast({ title: 'Erro ao criar compromisso', variant: 'destructive' })
    }
  }

  if (!legalCase)
    return <div className="p-8 text-center text-slate-500">Carregando processo...</div>

  const totalFinance = finances.reduce((acc, curr) => acc + (curr.amount || 0), 0)

  return (
    <div className="bg-[#f0f2f5] min-h-screen -m-6 p-6 animate-fade-in-up">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="rounded-xl border-none shadow-sm overflow-hidden">
          <CardContent className="p-6 bg-white">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <div className="flex items-start gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1">
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                      [{legalCase.parties}]
                    </h1>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium py-1 px-3"
                    >
                      {legalCase.case_number || 'Sem número'}
                    </Badge>
                    <Badge variant="outline" className="text-slate-500">
                      {legalCase.court || 'Tribunal não informado'}
                    </Badge>
                    {legalCase.pje_last_sync && (
                      <Badge variant="outline" className="text-slate-500 font-normal">
                        Última sync: {new Date(legalCase.pje_last_sync).toLocaleString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-slate-600 hover:bg-slate-700 text-white font-medium uppercase px-3 py-1">
                  {legalCase.lifecycle_status || 'ATIVO'}
                </Badge>
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={
                    legalCase?.pje_sync_status === 'pending' ||
                    legalCase?.pje_sync_status === 'syncing'
                  }
                  className={cn(
                    'shadow-sm',
                    legalCase?.pje_sync_status === 'error' &&
                      'border-red-300 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700',
                  )}
                  title={
                    legalCase?.pje_sync_status === 'error' ? 'Falha na última sincronização' : ''
                  }
                >
                  <RefreshCw
                    className={cn(
                      'w-4 h-4 mr-2',
                      (legalCase?.pje_sync_status === 'pending' ||
                        legalCase?.pje_sync_status === 'syncing') &&
                        'animate-spin',
                    )}
                  />
                  {legalCase?.pje_sync_status === 'pending' ||
                  legalCase?.pje_sync_status === 'syncing'
                    ? 'Sincronizando...'
                    : 'Atualizar via PJe'}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-500">Cliente:</span>
                <span
                  className="font-semibold text-slate-800 truncate"
                  title={legalCase.expand?.client?.name}
                >
                  {legalCase.expand?.client?.name || 'Não informado'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-500">Responsável:</span>
                <span
                  className="font-semibold text-slate-800 truncate"
                  title={legalCase.expand?.responsible_collaborator?.name}
                >
                  {legalCase.expand?.responsible_collaborator?.name || 'Não informado'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-500">Classe:</span>
                <span className="font-semibold text-slate-800">
                  {legalCase.type || 'Não informado'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full bg-white border-b rounded-none justify-start px-4 h-auto pt-2 pb-0 flex-wrap">
                  <TabsTrigger
                    value="andamento"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 whitespace-nowrap"
                  >
                    Ocorrência Processual
                  </TabsTrigger>
                  <TabsTrigger
                    value="detalhes"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 whitespace-nowrap"
                  >
                    Metadados (DataJud/MNI)
                  </TabsTrigger>
                  <TabsTrigger
                    value="tarefa"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3"
                  >
                    Nova tarefa
                  </TabsTrigger>
                  <TabsTrigger
                    value="compromisso"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3"
                  >
                    Novo Compromisso
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="andamento" className="p-6 pt-6">
                  <form onSubmit={handleAddMovement} className="flex gap-4">
                    <Input
                      placeholder="Descreva o andamento ou ocorrência manual..."
                      className="flex-1 bg-slate-50 border-slate-200"
                      value={newMovement}
                      onChange={(e) => setNewMovement(e.target.value)}
                    />
                    <Button type="submit" className="bg-slate-600 hover:bg-slate-700">
                      Salvar
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="detalhes" className="p-6 pt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" /> Metadados Estruturados
                    </h3>
                    {legalCase.metadata && Object.keys(legalCase.metadata).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="shadow-sm border-slate-200">
                          <CardHeader className="py-3 px-4 border-b bg-slate-50">
                            <div className="text-sm font-semibold flex items-center gap-2">
                              <Scale className="w-4 h-4 text-slate-500" /> Informações do Processo
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 space-y-3 text-sm text-slate-600">
                            {legalCase.metadata.classe?.nome && (
                              <div>
                                <span className="font-semibold block text-slate-800">Classe:</span>{' '}
                                {legalCase.metadata.classe.nome}
                              </div>
                            )}
                            {legalCase.metadata.orgaoJulgador?.nome && (
                              <div>
                                <span className="font-semibold block text-slate-800">
                                  Órgão Julgador:
                                </span>{' '}
                                {legalCase.metadata.orgaoJulgador.nome}
                              </div>
                            )}
                            {legalCase.metadata.valorCausa?.valor !== undefined && (
                              <div>
                                <span className="font-semibold block text-slate-800">
                                  Valor da Causa:
                                </span>{' '}
                                R$ {legalCase.metadata.valorCausa.valor}
                              </div>
                            )}
                            {legalCase.metadata.nivelSigilo !== undefined && (
                              <div>
                                <span className="font-semibold block text-slate-800">
                                  Nível de Sigilo:
                                </span>{' '}
                                {legalCase.metadata.nivelSigilo}
                              </div>
                            )}
                            {legalCase.metadata.hash && (
                              <div className="break-all">
                                <span className="font-semibold block text-slate-800">
                                  Hash (MNI):
                                </span>{' '}
                                {legalCase.metadata.hash}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-200">
                          <CardHeader className="py-3 px-4 border-b bg-slate-50">
                            <div className="text-sm font-semibold flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-500" /> Partes (Polos)
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 space-y-3 text-sm text-slate-600">
                            {legalCase.metadata.polos && legalCase.metadata.polos.length > 0 ? (
                              legalCase.metadata.polos.map((polo: any, idx: number) => (
                                <div key={idx} className="pb-2 border-b last:border-0 last:pb-0">
                                  <span className="font-semibold text-slate-800 capitalize">
                                    {polo.polo}
                                  </span>
                                  <ul className="list-disc pl-4 mt-1">
                                    {polo.partes?.map((parte: any, pIdx: number) => (
                                      <li key={pIdx}>
                                        {parte.pessoa?.nome || 'Não informado'}
                                        {parte.representantes &&
                                          parte.representantes.length > 0 && (
                                            <div className="text-xs text-slate-500 mt-1">
                                              Rep:{' '}
                                              {parte.representantes
                                                .map((r: any) => r.pessoa?.nome || '')
                                                .join(', ')}
                                            </div>
                                          )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400">Nenhuma parte detalhada.</span>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-200 md:col-span-2">
                          <CardHeader className="py-3 px-4 border-b bg-slate-50">
                            <div className="text-sm font-semibold flex items-center gap-2">
                              <Tags className="w-4 h-4 text-slate-500" /> Assuntos
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 text-sm text-slate-600">
                            {legalCase.metadata.assuntos &&
                            legalCase.metadata.assuntos.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {legalCase.metadata.assuntos.map((assunto: any, idx: number) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="font-normal bg-slate-100 text-slate-700"
                                  >
                                    {assunto.nome || assunto.codigo}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">Nenhum assunto detalhado.</span>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-sm bg-slate-50 p-6 rounded-lg border border-dashed text-center">
                        Os metadados detalhados ainda não foram sincronizados ou não estão
                        disponíveis no tribunal.
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="tarefa" className="p-6 pt-6">
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                      <Label>Título da Tarefa</Label>
                      <Input name="title" placeholder="Ex: Preparar contestação..." required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data de Vencimento</Label>
                        <Input name="due_date" type="date" required />
                      </div>
                      <div>
                        <Label>Prioridade</Label>
                        <Select name="priority" defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit">Criar Tarefa</Button>
                  </form>
                </TabsContent>
                <TabsContent value="compromisso" className="p-6 pt-6">
                  <form onSubmit={handleAddEvent} className="space-y-4">
                    <div>
                      <Label>Título do Compromisso</Label>
                      <Input name="title" placeholder="Ex: Audiência de Conciliação..." required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data / Hora</Label>
                        <Input name="start_date" type="datetime-local" required />
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <Select name="type" defaultValue="Hearing">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hearing">Audiência</SelectItem>
                            <SelectItem value="Meeting">Reunião</SelectItem>
                            <SelectItem value="Call">Ligação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit">Criar Compromisso</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-800 text-lg">Histórico de Andamentos</h3>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {movements.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 border border-dashed m-6 rounded-lg bg-slate-50/50">
                    Nenhum andamento encontrado.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {movements.map((mov) => {
                      const movDate = new Date(mov.created).getTime()
                      const isNew = movDate > Date.now() - 86400000 * 2
                      const isUpdated = new Date(mov.updated).getTime() - movDate > 2000

                      return (
                        <div key={mov.id} className="p-6 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-700">
                              {new Date(mov.event_date).toLocaleDateString('pt-BR')}
                            </span>
                            <Badge variant="outline" className="text-xs text-slate-500 bg-white">
                              {mov.source}
                            </Badge>
                            {isNew && (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none text-[10px] px-2 py-0">
                                Novo
                              </Badge>
                            )}
                            {isUpdated && !isNew && (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none text-[10px] px-2 py-0">
                                Atualizado
                              </Badge>
                            )}
                          </div>
                          <div className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed break-words overflow-hidden w-full">
                            {mov.description}
                          </div>

                          {(mov.details ||
                            (mov.movement_details &&
                              Object.keys(mov.movement_details).length > 0)) && (
                            <div className="mt-4">
                              <Accordion type="single" collapsible className="w-full">
                                <AccordionItem
                                  value="details"
                                  className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm"
                                >
                                  <AccordionTrigger className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 hover:no-underline transition-colors">
                                    Detalhes e Metadados Técnicos (MNI)
                                  </AccordionTrigger>
                                  <AccordionContent className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50">
                                    {mov.movement_details &&
                                      Object.keys(mov.movement_details).length > 0 && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3 text-xs text-slate-600 mb-3">
                                          {mov.movement_details.orgaoJulgador && (
                                            <div>
                                              <span className="font-semibold text-slate-800">
                                                Órgão Julgador:
                                              </span>{' '}
                                              {mov.movement_details.orgaoJulgador}
                                            </div>
                                          )}
                                          {mov.movement_details.hash && (
                                            <div className="break-all flex gap-1">
                                              <Hash className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                                              <span className="font-semibold text-slate-800">
                                                Hash:
                                              </span>{' '}
                                              {mov.movement_details.hash}
                                            </div>
                                          )}
                                          {mov.movement_details.protocolo && (
                                            <div>
                                              <span className="font-semibold text-slate-800">
                                                Protocolo:
                                              </span>{' '}
                                              {mov.movement_details.protocolo}
                                            </div>
                                          )}
                                          {mov.movement_details.recibo && (
                                            <div>
                                              <span className="font-semibold text-slate-800">
                                                Recibo:
                                              </span>{' '}
                                              {mov.movement_details.recibo}
                                            </div>
                                          )}
                                          {mov.movement_details.ciencia && (
                                            <div className="col-span-1 lg:col-span-2">
                                              <span className="font-semibold text-slate-800">
                                                Ciência (Awareness):
                                              </span>
                                              <pre className="mt-1 bg-white p-2 rounded border border-slate-200 text-[10px] overflow-x-auto">
                                                {JSON.stringify(
                                                  mov.movement_details.ciencia,
                                                  null,
                                                  2,
                                                )}
                                              </pre>
                                            </div>
                                          )}
                                          {mov.movement_details.tipoDocumento && (
                                            <div>
                                              <span className="font-semibold text-slate-800">
                                                Tipo Documento:
                                              </span>{' '}
                                              {mov.movement_details.tipoDocumento}
                                            </div>
                                          )}
                                          {mov.movement_details.link && (
                                            <div>
                                              <span className="font-semibold text-slate-800">
                                                Link Documento:
                                              </span>{' '}
                                              <a
                                                href={mov.movement_details.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:underline font-medium"
                                              >
                                                Acessar Anexo ↗
                                              </a>
                                            </div>
                                          )}
                                          {mov.movement_details.destinatarios &&
                                            mov.movement_details.destinatarios.length > 0 && (
                                              <div className="col-span-1 lg:col-span-2">
                                                <span className="font-semibold text-slate-800 block mb-1">
                                                  Destinatários da Comunicação:
                                                </span>
                                                <ul className="list-disc pl-4 space-y-0.5">
                                                  {mov.movement_details.destinatarios.map(
                                                    (d: any, i: number) => (
                                                      <li key={i}>
                                                        {d.nome || 'Não identificado'}
                                                      </li>
                                                    ),
                                                  )}
                                                </ul>
                                              </div>
                                            )}
                                          {mov.movement_details.documentos &&
                                            mov.movement_details.documentos.length > 0 && (
                                              <div className="col-span-1 lg:col-span-2">
                                                <span className="font-semibold text-slate-800 block mb-1">
                                                  Documentos Vinculados (MNI):
                                                </span>
                                                <div className="bg-white rounded border border-slate-200 overflow-hidden">
                                                  <table className="min-w-full divide-y divide-slate-200">
                                                    <thead className="bg-slate-50">
                                                      <tr>
                                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                                          Tipo
                                                        </th>
                                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                                          ID / Hash
                                                        </th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-slate-200">
                                                      {mov.movement_details.documentos.map(
                                                        (doc: any, i: number) => (
                                                          <tr key={i}>
                                                            <td className="px-3 py-1.5 whitespace-nowrap text-slate-600">
                                                              {doc.tipoDocumento || 'Documento'}
                                                            </td>
                                                            <td className="px-3 py-1.5 whitespace-nowrap text-slate-500 font-mono">
                                                              {doc.idDocumento || doc.hash}
                                                            </td>
                                                          </tr>
                                                        ),
                                                      )}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      )}
                                    {mov.details && (
                                      <div className="mt-2 p-3 bg-white rounded-md text-xs text-slate-700 whitespace-pre-wrap border border-slate-200 shadow-sm font-mono leading-relaxed">
                                        <span className="font-semibold text-slate-800 block mb-1 font-sans">
                                          Teor / Complementos:
                                        </span>
                                        {mov.details}
                                      </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {movementsTotalPages > 1 && (
                  <div className="p-4 border-t border-slate-100 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => loadMovements(Math.max(1, movementsPage - 1))}
                            className={
                              movementsPage === 1
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>
                        <span className="text-sm text-slate-500 mx-4 flex items-center font-medium">
                          Página {movementsPage} de {movementsTotalPages}
                        </span>
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              loadMovements(Math.min(movementsTotalPages, movementsPage + 1))
                            }
                            className={
                              movementsPage === movementsTotalPages
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="py-4 px-5 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <CheckSquare className="w-4 h-4 text-slate-400" /> Tarefas ({tasks.length})
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {tasks.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">
                    Nenhuma tarefa criada.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        className="text-sm p-3 bg-slate-50 border rounded flex justify-between"
                      >
                        <span className="font-medium text-slate-700 truncate pr-2">{t.title}</span>
                        <span className="text-slate-400 shrink-0">
                          {t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-slate-400" /> Compromissos ({events.length})
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {events.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">
                    Nenhum evento agendado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((e) => (
                      <div
                        key={e.id}
                        className="text-sm p-3 bg-slate-50 border rounded flex justify-between"
                      >
                        <span className="font-medium text-slate-700 truncate pr-2">{e.title}</span>
                        <span className="text-slate-400 shrink-0">
                          {new Date(e.start_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="py-4 px-5 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span className="text-slate-400 text-lg">$</span> Resumo Financeiro
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 rounded-lg border">
                  <span className="text-sm text-slate-500">Custo Previsto</span>
                  <span className="text-base font-semibold text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      totalFinance,
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Registros ({finances.length})</span>
                  <button
                    onClick={() => navigate(`/intranet/finance?caseId=${id}`)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Ver detalhes
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

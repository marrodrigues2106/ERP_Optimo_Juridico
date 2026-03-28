import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getLawsuit, updateLawsuit } from '@/services/lawsuits'
import { getAgendaEventsByLawsuit, createAgendaEvent } from '@/services/agenda'
import { getLawsuitMovements, createLawsuitMovement } from '@/services/lawsuit_movements'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  Briefcase,
  User,
  RefreshCw,
  Scale,
  Landmark,
  BookOpen,
  AlertCircle,
  Edit3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProcessDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [lawsuit, setLawsuit] = useState<any>(null)
  const [agenda, setAgenda] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [openEvent, setOpenEvent] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      const data = await getLawsuit(id)
      setLawsuit(data)
      const evs = await getAgendaEventsByLawsuit(id)
      setAgenda(evs)
      const movs = await getLawsuitMovements(id)
      setMovements(movs)
    } catch (e) {
      toast({ title: 'Processo não encontrado', variant: 'destructive' })
      navigate('/intranet/processos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('lawsuits', () => loadData())
  useRealtime('agenda_events', () => loadData())
  useRealtime('lawsuit_movements', () => loadData())

  const handleToggleNotify = async (checked: boolean) => {
    try {
      await updateLawsuit(lawsuit.id, { notifyClient: checked })
      toast({ title: checked ? 'Notificações ativadas' : 'Notificações desativadas' })
    } catch (e) {
      toast({ title: 'Erro ao atualizar notificações', variant: 'destructive' })
    }
  }

  const handleSyncDatajud = async () => {
    try {
      await updateLawsuit(lawsuit.id, { datajudStatus: 'Sync Requested' })
      // Fire and forget orchestrator trigger
      pb.send(`/backend/v1/datajud/background-sync/${lawsuit.id}`, {
        method: 'POST',
        body: JSON.stringify({ secret: 'internal-async-trigger' }),
      }).catch(() => {})

      toast({ title: 'Sincronização com Múltiplas Fontes solicitada. Processando...' })
    } catch (e) {
      toast({
        title: 'Erro ao solicitar sincronização',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const handleAddLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const desc = fd.get('description') as string

    try {
      await createLawsuitMovement({
        lawsuit: lawsuit.id,
        event_date: new Date().toISOString(),
        description: desc,
        source: 'Manual',
        hash: `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      })
      toast({ title: 'Andamento registrado com sucesso na linha do tempo' })
      e.currentTarget.reset()
    } catch (err) {
      toast({ title: 'Erro ao registrar andamento', variant: 'destructive' })
    }
  }

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())

    data.linked_lawsuit = id
    data.collaborator = lawsuit.collaborator || null
    if (data.start_date) data.start_date = new Date(data.start_date as string).toISOString()
    if (data.end_date) data.end_date = new Date(data.end_date as string).toISOString()

    try {
      await createAgendaEvent(data)
      toast({ title: 'Evento adicionado e sincronizado com a agenda' })
      setOpenEvent(false)
    } catch (err) {
      toast({ title: 'Erro ao adicionar evento', variant: 'destructive' })
    }
  }

  const getSourceDetails = (source: string) => {
    switch (source) {
      case 'DataJud':
        return {
          color: 'bg-blue-500',
          text: 'text-blue-700 bg-blue-50 border-blue-200',
          icon: Scale,
        }
      case 'Tribunal':
        return {
          color: 'bg-indigo-500',
          text: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          icon: Landmark,
        }
      case 'Diario':
        return {
          color: 'bg-amber-500',
          text: 'text-amber-700 bg-amber-50 border-amber-200',
          icon: BookOpen,
        }
      case 'Manual':
        return {
          color: 'bg-slate-500',
          text: 'text-slate-700 bg-slate-50 border-slate-200',
          icon: Edit3,
        }
      case 'Sistema':
        return {
          color: 'bg-red-500',
          text: 'text-red-700 bg-red-50 border-red-200',
          icon: AlertCircle,
        }
      default:
        return {
          color: 'bg-primary',
          text: 'text-primary bg-primary/10 border-primary/20',
          icon: Edit3,
        }
    }
  }

  if (loading || !lawsuit) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Carregando detalhes do processo...
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/intranet/processos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">{lawsuit.parties}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {lawsuit.number ? `Processo nº ${lawsuit.number}` : 'Sem número cadastrado'}
          </p>
        </div>
        <div className="ml-auto flex items-center">
          <span className="px-4 py-1.5 bg-secondary/10 text-secondary rounded-full text-sm font-semibold tracking-wide uppercase">
            {lawsuit.status || 'Em Andamento'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Metadata */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4 border-b bg-slate-50/50">
              <CardTitle className="text-lg">Detalhes Gerais</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Tipo de Registro
                </span>
                <p className="font-medium text-sm mt-0.5">{lawsuit.entryType}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Tribunal/Órgão
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="font-medium text-sm">{lawsuit.court || 'Não especificado'}</p>
                  {lawsuit.number && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSyncDatajud}
                      disabled={lawsuit.datajudStatus === 'Sync Requested'}
                      className="h-6 text-[10px] px-2 py-0"
                    >
                      <RefreshCw
                        className={cn(
                          'w-3 h-3 mr-1',
                          lawsuit.datajudStatus === 'Sync Requested' && 'animate-spin',
                        )}
                      />
                      Sincronizar
                    </Button>
                  )}
                </div>
                {lawsuit.datajudStatus && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center">
                    Integração:
                    <span
                      className={cn(
                        'ml-1 font-medium',
                        lawsuit.datajudStatus === 'Success'
                          ? 'text-green-600'
                          : lawsuit.datajudStatus === 'Partial Success (Fallback)'
                            ? 'text-amber-600'
                            : lawsuit.datajudStatus === 'Sync Requested'
                              ? 'text-blue-600 animate-pulse'
                              : lawsuit.datajudStatus === 'Not Found'
                                ? 'text-slate-500'
                                : 'text-red-600 font-bold',
                      )}
                    >
                      {lawsuit.datajudStatus}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Próximo Prazo
                </span>
                <p className="font-medium text-sm mt-0.5 text-destructive flex items-center">
                  {lawsuit.deadline ? (
                    <>
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      {new Date(lawsuit.deadline).toLocaleDateString()}
                    </>
                  ) : (
                    'Não definido'
                  )}
                </p>
              </div>

              <div className="pt-4 border-t border-dashed">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center mb-2">
                  Configuração de Monitoramento
                </span>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-md border text-sm font-medium">
                  <span>{lawsuit.trackingSource || 'Ambos'}</span>
                  <Badge
                    variant="outline"
                    className={
                      lawsuit.lifecycle_status === 'Arquivado'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-emerald-50 text-emerald-600'
                    }
                  >
                    {lawsuit.lifecycle_status || 'Acompanhado'}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center mb-2">
                  <User className="w-3.5 h-3.5 mr-1" /> Cliente Vinculado
                </span>
                {lawsuit.expand?.client ? (
                  <div className="flex flex-col bg-slate-50 p-3 rounded-md border">
                    <Link
                      to={`/intranet/clientes/${lawsuit.client}`}
                      className="font-medium text-sm text-primary hover:text-secondary hover:underline transition-colors"
                    >
                      {lawsuit.expand.client.fullName || lawsuit.expand.client.name}
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-md border border-dashed">
                    Nenhum cliente vinculado
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-dashed">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center mb-2">
                  <Briefcase className="w-3.5 h-3.5 mr-1" /> Membro Responsável
                </span>
                {lawsuit.expand?.collaborator ? (
                  <div className="flex flex-col bg-slate-50 p-3 rounded-md border">
                    <Link
                      to={`/intranet/equipe/${lawsuit.collaborator}`}
                      className="font-medium text-sm text-primary hover:text-secondary hover:underline transition-colors"
                    >
                      {lawsuit.expand.collaborator.fullName || lawsuit.expand.collaborator.name}
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-md border border-dashed">
                    Não atribuído
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-dashed">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="notifyClient"
                      className="cursor-pointer text-sm font-semibold flex-1 pr-4"
                    >
                      Notificações Automáticas
                    </Label>
                    <Switch
                      id="notifyClient"
                      checked={lawsuit.notifyClient}
                      onCheckedChange={handleToggleNotify}
                      disabled={!lawsuit.expand?.client}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="historico" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-slate-100/50 p-1">
              <TabsTrigger
                value="historico"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Linha do Tempo (Unificada)
              </TabsTrigger>
              <TabsTrigger
                value="agenda"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Agenda & Tarefas
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="historico"
              className="space-y-6 focus-visible:outline-none focus-visible:ring-0"
            >
              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4 bg-slate-50/50">
                  <CardTitle className="text-lg">Movimentações do Processo</CardTitle>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="relative border-l-2 border-slate-200 ml-3 md:ml-4 space-y-8 mb-8 pb-4">
                    {movements.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8 ml-[-1rem]">
                        Nenhuma movimentação sincronizada ainda.
                      </p>
                    ) : (
                      movements.map((mov: any) => {
                        const style = getSourceDetails(mov.source)
                        const Icon = style.icon

                        return (
                          <div key={mov.id} className="relative pl-6 md:pl-8 group">
                            <span
                              className={cn(
                                'absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white transition-transform group-hover:scale-110',
                                style.color,
                              )}
                            ></span>
                            <div className="flex flex-col">
                              <div className="flex items-center flex-wrap gap-2 mb-2">
                                <span className="text-sm font-bold text-slate-800">
                                  {new Date(mov.event_date).toLocaleString('pt-BR', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] uppercase font-bold flex items-center gap-1',
                                    style.text,
                                  )}
                                >
                                  <Icon className="w-3 h-3" /> {mov.source}
                                </Badge>
                              </div>
                              <div
                                className={cn(
                                  'bg-white p-4 rounded-lg border shadow-sm text-sm leading-relaxed text-slate-700',
                                  mov.source === 'Sistema' &&
                                    'border-red-200 text-red-900 bg-red-50',
                                )}
                              >
                                <p
                                  className={cn(
                                    'font-medium',
                                    mov.source === 'Sistema' && 'font-bold',
                                  )}
                                >
                                  {mov.description}
                                </p>

                                {mov.metadata?.sources && mov.metadata.sources.length > 1 && (
                                  <div className="mt-2 text-[10px] text-slate-500 font-medium flex gap-1">
                                    <span className="text-slate-400">Confirmado também por:</span>
                                    <span className="uppercase text-slate-600">
                                      {mov.metadata.sources
                                        .filter((s: string) => s !== mov.source)
                                        .join(', ')}
                                    </span>
                                  </div>
                                )}

                                {mov.metadata?.complementos &&
                                  mov.metadata.complementos.length > 0 && (
                                    <div className="mt-3 space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-dashed">
                                      {mov.metadata.complementos.map((comp: any, cIdx: number) => (
                                        <div
                                          key={cIdx}
                                          className="grid grid-cols-[100px_1fr] gap-2"
                                        >
                                          <span className="font-semibold text-slate-700">
                                            {comp.nome || 'Detalhe'}:
                                          </span>
                                          <span className="break-words">
                                            {comp.valor || comp.descricao}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <form
                    onSubmit={handleAddLog}
                    className="mt-6 bg-slate-50 p-4 rounded-lg border border-dashed"
                  >
                    <h4 className="text-sm font-bold mb-3 text-slate-800 flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-slate-500" /> Adicionar Andamento Manual
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        name="description"
                        placeholder="Ex: Audiência de conciliação realizada..."
                        required
                        className="flex-1 bg-white"
                      />
                      <Button type="submit" className="shrink-0">
                        <Plus className="w-4 h-4 mr-2" /> Registrar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="agenda"
              className="space-y-6 focus-visible:outline-none focus-visible:ring-0"
            >
              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4 bg-slate-50/50">
                  <CardTitle className="text-lg">Eventos Relacionados</CardTitle>
                  <Dialog open={openEvent} onOpenChange={setOpenEvent}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Novo Evento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Agendar Evento</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddEvent} className="space-y-4">
                        <div>
                          <Label>Título do Evento</Label>
                          <Input name="title" required placeholder="Ex: Reunião" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Início</Label>
                            <Input type="datetime-local" name="start_date" required />
                          </div>
                          <div>
                            <Label>Fim (Opcional)</Label>
                            <Input type="datetime-local" name="end_date" />
                          </div>
                        </div>
                        <div className="pt-2 border-t mt-4">
                          <Button type="submit" className="w-full">
                            Salvar
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-6">
                  {agenda.length === 0 ? (
                    <div className="text-center py-12 px-4 border-2 border-dashed rounded-lg bg-slate-50">
                      <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                      <p className="text-muted-foreground font-medium">Nenhum evento agendado.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {agenda.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-start p-5 border rounded-xl bg-white shadow-sm gap-4"
                        >
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-base">{ev.title}</h4>
                            <span className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md mt-2 w-max">
                              <Clock className="w-3 h-3 mr-1.5" />
                              {new Date(ev.start_date).toLocaleString('pt-BR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

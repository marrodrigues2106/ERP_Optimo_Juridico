import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getLawsuit, updateLawsuit } from '@/services/lawsuits'
import { getAgendaEventsByLawsuit, createAgendaEvent } from '@/services/agenda'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  AlertTriangle,
  Users,
  Phone,
  Briefcase,
  User,
  Mail,
} from 'lucide-react'

export default function ProcessDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [lawsuit, setLawsuit] = useState<any>(null)
  const [agenda, setAgenda] = useState<any[]>([])
  const [openEvent, setOpenEvent] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      const data = await getLawsuit(id)
      setLawsuit(data)
      const evs = await getAgendaEventsByLawsuit(id)
      setAgenda(evs)
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
  useRealtime('lawsuits', () => {
    loadData()
  })
  useRealtime('agenda_events', () => {
    loadData()
  })

  const handleToggleNotify = async (checked: boolean) => {
    try {
      await updateLawsuit(lawsuit.id, { notifyClient: checked })
      toast({ title: checked ? 'Notificações ativadas' : 'Notificações desativadas' })
    } catch (e) {
      toast({ title: 'Erro ao atualizar notificações', variant: 'destructive' })
    }
  }

  const handleAddLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const desc = fd.get('description') as string
    const newLog = { date: new Date().toISOString(), description: desc }
    const updatedLogs = [...(lawsuit.trackingLogs || []), newLog]

    try {
      await updateLawsuit(lawsuit.id, { trackingLogs: updatedLogs })
      toast({ title: 'Andamento registrado com sucesso' })
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
                <p className="font-medium text-sm mt-0.5">{lawsuit.court || 'Não especificado'}</p>
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
                    <span className="text-xs text-muted-foreground flex items-center mt-1">
                      <Mail className="w-3 h-3 mr-1" />{' '}
                      {lawsuit.expand.client.email || 'Sem e-mail'}
                    </span>
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
                    <span className="text-xs text-secondary mt-1 font-medium">
                      {lawsuit.expand.collaborator.role}
                    </span>
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
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ative para enviar atualizações de histórico e eventos da agenda automaticamente
                    para o e-mail do cliente.
                  </p>
                  {!lawsuit.expand?.client && (
                    <p className="text-xs text-amber-600 font-medium bg-amber-50 p-2 rounded border border-amber-100">
                      Vincule um cliente para habilitar esta função.
                    </p>
                  )}
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
                Histórico & Movimentações
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
                  <CardTitle className="text-lg">Linha do Tempo</CardTitle>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="relative border-l-2 border-slate-200 ml-3 md:ml-4 space-y-8 mb-8 pb-4">
                    {!lawsuit.trackingLogs || lawsuit.trackingLogs.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8 ml-[-1rem]">
                        Nenhuma movimentação registrada no sistema.
                      </p>
                    ) : (
                      [...lawsuit.trackingLogs].reverse().map((log: any, idx: number) => (
                        <div key={idx} className="relative pl-6 md:pl-8">
                          <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-primary"></span>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 mb-2 flex items-center">
                              {new Date(log.date).toLocaleString('pt-BR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                            <div className="text-slate-700 bg-white p-4 rounded-lg border shadow-sm text-sm leading-relaxed">
                              {log.description}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddLog} className="mt-6 bg-slate-50 p-4 rounded-lg border">
                    <h4 className="text-sm font-bold mb-3 text-slate-800">
                      Adicionar Andamento Manual
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
                          <Input name="title" required placeholder="Ex: Reunião com cliente" />
                        </div>
                        <div>
                          <Label>Tipo</Label>
                          <Select name="type" defaultValue="Meeting">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Meeting">Reunião</SelectItem>
                              <SelectItem value="Call">Ligação</SelectItem>
                              <SelectItem value="Deadline">Prazo</SelectItem>
                              <SelectItem value="Reminder">Lembrete</SelectItem>
                              <SelectItem value="Alert">Alerta</SelectItem>
                            </SelectContent>
                          </Select>
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
                        <div>
                          <Label>Descrição / Notas</Label>
                          <Input name="description" placeholder="Observações adicionais..." />
                        </div>
                        <div className="pt-2 border-t mt-4">
                          <Button type="submit" className="w-full">
                            Sincronizar com Agenda
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
                      <p className="text-sm text-slate-500 mt-1">
                        Crie um evento para acompanhar compromissos deste processo.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {agenda.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-start p-5 border rounded-xl bg-white shadow-sm gap-4 hover:border-primary/20 transition-colors"
                        >
                          <div className="bg-slate-50 p-3.5 rounded-full shrink-0 border">
                            {ev.type === 'Meeting' ? (
                              <Users className="w-5 h-5 text-blue-600" />
                            ) : ev.type === 'Call' ? (
                              <Phone className="w-5 h-5 text-green-600" />
                            ) : ev.type === 'Deadline' ? (
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Calendar className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-base">{ev.title}</h4>
                            <div className="flex flex-wrap gap-3 mt-2">
                              <span className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                <Clock className="w-3 h-3 mr-1.5" />
                                {new Date(ev.start_date).toLocaleString('pt-BR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                              <span className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                {ev.type}
                              </span>
                            </div>
                            {ev.description && (
                              <p className="text-sm mt-3 text-slate-600 border-l-2 border-slate-200 pl-3 py-0.5">
                                {ev.description}
                              </p>
                            )}
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

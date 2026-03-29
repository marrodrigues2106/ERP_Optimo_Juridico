import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegalCase } from '@/services/legal_cases'
import { getCaseMovements, createCaseMovement } from '@/services/case_movements'
import { getAgendaEventsByLawsuit } from '@/services/agenda'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Briefcase,
  User,
  Edit3,
  Plus,
  RefreshCw,
  Clock,
  Calendar,
  Bell,
  AlignLeft,
} from 'lucide-react'
import { EventFormModal } from './cases/EventFormModal'
import { runDatajudSync } from '@/lib/datajud/sync'

export default function ProcessDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [legalCase, setLegalCase] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [prefilledDescription, setPrefilledDescription] = useState('')

  const loadData = async () => {
    if (!id) return
    try {
      setLegalCase(await getLegalCase(id))
      setMovements(await getCaseMovements(id))
      setEvents(await getAgendaEventsByLawsuit(id))
    } catch (e) {
      toast({ title: 'Registro não encontrado', variant: 'destructive' })
      navigate('/intranet/processos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('legal_cases', loadData)
  useRealtime('case_movements', loadData)
  useRealtime('agenda_events', loadData)

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
      await loadData()
    } catch (err: any) {
      let errorMsg = err?.message || 'Erro desconhecido'
      if (
        errorMsg.includes('permissão de leitura') ||
        errorMsg.includes('unauthorized') ||
        errorMsg.includes('403')
      ) {
        errorMsg = `A chave de API do DataJud não possui permissão de leitura para o tribunal selecionado (ex: ${legalCase.court_alias || 'tjrj'}). Verifique as permissões no portal do CNJ.`
      }
      toast({ title: 'Erro na Sincronização', description: errorMsg, variant: 'destructive' })
    } finally {
      setIsSyncing(false)
    }
  }

  const openEventModal = (desc = '') => {
    setPrefilledDescription(desc)
    setEventModalOpen(true)
  }

  if (loading || !legalCase)
    return <div className="p-8 animate-pulse text-center">Carregando Detalhes...</div>

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b pb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/intranet/processos')}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">{legalCase.parties}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {legalCase.type} {legalCase.case_number ? `nº ${legalCase.case_number}` : ''}
          </p>
        </div>
        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-slate-100 uppercase">
            {legalCase.lifecycle_status}
          </Badge>
          <Button variant="secondary" size="sm" onClick={() => openEventModal()}>
            <Plus className="w-4 h-4 mr-2" /> Novo Alerta
          </Button>
          <Button variant="default" size="sm" onClick={handleSyncDatajud} disabled={isSyncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="details">Metadados</TabsTrigger>
          <TabsTrigger value="events">Alertas ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Linha do Tempo Estruturada</CardTitle>
                <CardDescription>Histórico de movimentos do processo</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="relative border-l-2 border-slate-200 ml-3 md:ml-4 space-y-8 mb-8 pb-4">
                {movements.length === 0 ? (
                  <p className="text-muted-foreground ml-[-1rem] text-sm text-center">
                    Nenhum andamento registrado. Sincronize com o DataJud ou insira manualmente.
                  </p>
                ) : (
                  movements.map((mov) => (
                    <div key={mov.id} className="relative pl-6 md:pl-8 group">
                      <span
                        className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-${mov.source === 'DataJud' ? 'blue' : 'slate'}-500 transition-transform group-hover:scale-110`}
                      ></span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-slate-800">
                            {new Date(mov.event_date).toLocaleString('pt-BR')}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {mov.source}
                          </Badge>
                        </div>
                        <div className="bg-white p-4 rounded-lg border shadow-sm text-sm text-slate-700 flex flex-col sm:flex-row justify-between items-start gap-4">
                          <p className="flex-1">{mov.description}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-8 text-slate-500 hover:text-primary"
                            onClick={() =>
                              openEventModal(`Ref: ${mov.description.substring(0, 50)}...`)
                            }
                          >
                            <Bell className="w-4 h-4 mr-1" /> Criar Evento
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleAddManualMovement}
                className="mt-6 bg-slate-50 p-4 rounded-lg border border-dashed"
              >
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800">
                  <Edit3 className="w-4 h-4" /> Inserir Movimento Manual
                </h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    name="description"
                    placeholder="Ex: Audiência agendada..."
                    required
                    className="flex-1 bg-white"
                  />
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" /> Salvar Andamento
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-slate-50/50 pb-4 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlignLeft className="w-5 h-5 text-primary" /> Metadados DataJud
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 gap-5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Tribunal / Órgão
                  </span>
                  <p className="font-medium text-sm mt-1">{legalCase.court || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Classe / Espécie da Ação
                  </span>
                  <p className="font-medium text-sm mt-1">
                    {legalCase.metadata?.action_class || 'Não informada'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Assunto Principal
                  </span>
                  <p className="font-medium text-sm mt-1">
                    {legalCase.metadata?.subject || 'Não informado'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Data de Distribuição
                  </span>
                  <p className="font-medium text-sm mt-1">
                    {legalCase.metadata?.distribution_date
                      ? new Date(legalCase.metadata.distribution_date).toLocaleDateString('pt-BR')
                      : 'Não informada'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Tipo de Processo
                  </span>
                  <p className="font-medium text-sm mt-1">
                    {legalCase.metadata?.process_type || 'Não informado'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Status Sincronização
                  </span>
                  <p className="font-medium text-sm mt-1">
                    {legalCase.datajud_sync_status || 'Pendente'}
                  </p>
                  {legalCase.datajud_last_sync && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Última sync: {new Date(legalCase.datajud_last_sync).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="bg-slate-50/50 pb-4 border-b">
                <CardTitle className="text-lg">Gestão Interna</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Fase Atual</span>
                  <p className="font-medium text-sm mt-1">{legalCase.status || 'Não informada'}</p>
                </div>
                <div className="pt-4 border-t border-dashed">
                  <span className="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-2">
                    <User className="w-3.5 h-3.5 mr-1" /> Cliente Relacionado
                  </span>
                  <p className="text-sm font-medium">
                    {legalCase.expand?.client?.name || 'Nenhum'}
                  </p>
                </div>
                <div className="pt-4 border-t border-dashed">
                  <span className="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-2">
                    <Briefcase className="w-3.5 h-3.5 mr-1" /> Colaborador Responsável
                  </span>
                  <p className="text-sm font-medium">
                    {legalCase.expand?.responsible_collaborator?.name || 'Nenhum'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b flex flex-row justify-between items-center">
              <CardTitle className="text-lg">Alertas e Eventos</CardTitle>
              <Button size="sm" onClick={() => openEventModal()}>
                Novo Evento
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {events.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Nenhum evento registrado para este caso.
                </p>
              ) : (
                <div className="space-y-4">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-lg border bg-white shadow-sm"
                    >
                      <div className="p-2 bg-slate-100 rounded-md shrink-0 self-start">
                        {evt.type === 'Deadline' ? (
                          <Clock className="w-5 h-5 text-red-500" />
                        ) : evt.type === 'Meeting' ? (
                          <Briefcase className="w-5 h-5 text-blue-500" />
                        ) : evt.type === 'Hearing' ? (
                          <Bell className="w-5 h-5 text-purple-500" />
                        ) : (
                          <Calendar className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{evt.title}</h4>
                          <Badge variant="secondary" className="text-[10px]">
                            {evt.type}
                          </Badge>
                        </div>
                        {evt.description && (
                          <p className="text-xs text-slate-600 mb-2 truncate">{evt.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{' '}
                            {new Date(evt.start_date).toLocaleString('pt-BR')}
                          </span>
                          {evt.expand?.collaborator && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {evt.expand.collaborator.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EventFormModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        lawsuitId={id!}
        prefilledDescription={prefilledDescription}
        onSuccess={() => loadData()}
      />
    </div>
  )
}

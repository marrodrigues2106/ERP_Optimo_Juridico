import { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import {
  Activity,
  BookOpen,
  Landmark,
  CheckCircle2,
  Archive,
  Calendar as CalendarIcon,
  CheckSquare,
  Eye,
  FileText,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

type UnifiedItem = {
  id: string
  collection: 'results' | 'gazette_publications' | 'ocorrencias_dou' | 'legal_cases'
  type: 'PJe' | 'DOU' | 'Processo'
  title: string
  description: string
  date: string
  isRead: boolean
  isArchived: boolean
  raw: any
}

export default function CentralAtualizacoes() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [items, setItems] = useState<UnifiedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('inbox')

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [pjeRes, douPub, douOcc, cases] = await Promise.all([
        pb.collection('results').getList(1, 100, { sort: '-created' }),
        pb.collection('gazette_publications').getList(1, 100, { sort: '-created' }),
        pb.collection('ocorrencias_dou').getList(1, 100, { sort: '-created' }),
        pb
          .collection('legal_cases')
          .getList(1, 50, { filter: 'type="Processo"', sort: '-created' }),
      ])

      const mappedPje: UnifiedItem[] = pjeRes.items.map((i) => ({
        id: i.id,
        collection: 'results',
        type: 'PJe',
        title: `Processo: ${i.numero_processo || 'N/A'} - ${i.sigla_tribunal || ''}`,
        description: i.texto || '',
        date: i.data_disponibilizacao || i.created,
        isRead: !!i.is_read,
        isArchived: !!i.is_archived,
        raw: i,
      }))

      const mappedDouPub: UnifiedItem[] = douPub.items.map((i) => ({
        id: i.id,
        collection: 'gazette_publications',
        type: 'DOU',
        title: `Publicação DOU: ${i.orgao || 'Órgão Desconhecido'}`,
        description: i.texto_normalizado || '',
        date: i.data_publicacao || i.created,
        isRead: !!i.is_read,
        isArchived: !!i.is_archived,
        raw: i,
      }))

      const mappedDouOcc: UnifiedItem[] = douOcc.items.map((i) => ({
        id: i.id,
        collection: 'ocorrencias_dou',
        type: 'DOU',
        title: `Ocorrência DOU - Termo encontrado`,
        description: i.trecho_encontrado || '',
        date: i.data_deteccao || i.created,
        isRead: i.status_alerta === 'visualizado',
        isArchived: !!i.is_archived,
        raw: i,
      }))

      const mappedCases: UnifiedItem[] = cases.items.map((i) => ({
        id: i.id,
        collection: 'legal_cases',
        type: 'Processo',
        title: `${i.parties} - ${i.case_number || 'Sem número'}`,
        description: `Novo processo cadastrado. Status: ${i.lifecycle_status}`,
        date: i.created,
        isRead: true,
        isArchived: i.lifecycle_status === 'Arquivado',
        raw: i,
      }))

      const all = [...mappedPje, ...mappedDouPub, ...mappedDouOcc, ...mappedCases]
      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setItems(all)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleMarkAsRead = async (item: UnifiedItem) => {
    try {
      if (item.collection === 'results') {
        await pb.collection('results').update(item.id, { is_read: true })
      } else if (item.collection === 'gazette_publications') {
        await pb.collection('gazette_publications').update(item.id, { is_read: true })
      } else if (item.collection === 'ocorrencias_dou') {
        await pb.collection('ocorrencias_dou').update(item.id, { status_alerta: 'visualizado' })
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)))
      toast({ title: 'Marcado como lido' })
    } catch (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  const handleArchive = async (item: UnifiedItem) => {
    try {
      await pb.collection(item.collection).update(item.id, { is_archived: true })
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isArchived: true } : i)))
      toast({ title: 'Movido para Arquivados' })
    } catch (error) {
      toast({ title: 'Erro ao arquivar', variant: 'destructive' })
    }
  }

  const handleCreateTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('tasks').create({
        title: fd.get('title'),
        priority: fd.get('priority'),
        due_date: fd.get('due_date')
          ? new Date(`${fd.get('due_date')}T12:00:00Z`).toISOString()
          : null,
        status: 'todo',
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Tarefa criada com sucesso!' })
      setTaskDialogOpen(false)
    } catch (err) {
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' })
    }
  }

  const handleCreateEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('agenda_events').create({
        title: fd.get('title'),
        type: fd.get('type'),
        start_date: fd.get('start_date')
          ? new Date(`${fd.get('start_date')}T12:00:00Z`).toISOString()
          : null,
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Evento criado com sucesso!' })
      setEventDialogOpen(false)
    } catch (err) {
      toast({ title: 'Erro ao criar evento', variant: 'destructive' })
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === 'inbox') return !item.isRead && !item.isArchived && item.type !== 'Processo'
      if (activeTab === 'pje') return item.isRead && !item.isArchived && item.type === 'PJe'
      if (activeTab === 'dou') return item.isRead && !item.isArchived && item.type === 'DOU'
      if (activeTab === 'novos') return item.type === 'Processo' && !item.isArchived
      if (activeTab === 'arquivados') return item.isArchived
      return true
    })
  }, [items, activeTab])

  const renderItemCard = (item: UnifiedItem) => (
    <Card
      key={item.id}
      className={cn(
        'overflow-hidden border-slate-200 transition-all hover:shadow-md',
        !item.isRead ? 'bg-blue-50/30 border-blue-100' : 'bg-white',
      )}
    >
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold tracking-wider uppercase text-slate-500">
            {item.type === 'DOU' && <Landmark className="w-4 h-4 text-emerald-500" />}
            {item.type === 'PJe' && <Activity className="w-4 h-4 text-blue-500" />}
            {item.type === 'Processo' && <FileText className="w-4 h-4 text-primary" />}
            {item.type}
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
            {item.date ? format(new Date(item.date), 'dd/MM/yyyy HH:mm') : '-'}
          </span>
        </div>

        <div>
          <h3
            className={cn(
              'text-lg font-bold mb-2',
              item.isRead ? 'text-slate-800' : 'text-slate-900',
            )}
          >
            {item.title}
          </h3>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-32 overflow-hidden relative">
            <p
              className="text-sm text-slate-600 line-clamp-3 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: item.description }}
            ></p>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2 pt-4 border-t border-slate-100">
          {!item.isRead && item.type !== 'Processo' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleMarkAsRead(item)}
              className="bg-primary text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Lido
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedItem(item)
              setTaskDialogOpen(true)
            }}
          >
            <CheckSquare className="w-4 h-4 mr-2 text-slate-500" /> Tarefa
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedItem(item)
              setEventDialogOpen(true)
            }}
          >
            <CalendarIcon className="w-4 h-4 mr-2 text-slate-500" /> Evento
          </Button>

          {item.type === 'PJe' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/intranet/comunicacoes/${item.id}`)}
            >
              <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
            </Button>
          )}

          {item.type === 'Processo' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/intranet/processos/${item.id}`)}
            >
              <Eye className="w-4 h-4 mr-2" /> Acessar Processo
            </Button>
          )}

          {!item.isArchived && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-slate-400 hover:text-slate-600"
              onClick={() => handleArchive(item)}
            >
              <Archive className="w-4 h-4 mr-2" /> Arquivar
            </Button>
          )}
        </div>
      </div>
    </Card>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-primary">
          Central de Atualizações
        </h1>
        <p className="text-base text-slate-500 mt-1">
          Inbox inteligente para gerenciar intimações do PJe, publicações do DOU e novos processos.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-64 shrink-0 bg-slate-50/50 p-2 rounded-xl border border-slate-200">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            orientation="vertical"
            className="w-full"
          >
            <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-1">
              <TabsTrigger
                value="inbox"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <BookOpen className="w-4 h-4 mr-3 text-slate-400 data-[state=active]:text-primary" />
                Caixa de Entrada
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                  {items.filter((i) => !i.isRead && !i.isArchived && i.type !== 'Processo').length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="pje"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Activity className="w-4 h-4 mr-3 text-blue-500" />
                Lidos - PJe
              </TabsTrigger>
              <TabsTrigger
                value="dou"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Landmark className="w-4 h-4 mr-3 text-emerald-500" />
                Lidos - DOU
              </TabsTrigger>
              <TabsTrigger
                value="novos"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <FileText className="w-4 h-4 mr-3 text-primary" />
                Novos Processos
              </TabsTrigger>
              <TabsTrigger
                value="arquivados"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Archive className="w-4 h-4 mr-3 text-slate-500" />
                Arquivados
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 w-full min-w-0">
          <div className="bg-slate-50/50 rounded-xl p-1 border border-slate-200 mb-6 flex justify-between items-center px-4 py-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize">
              {activeTab === 'inbox'
                ? 'Caixa de Entrada (Não Lidos)'
                : activeTab === 'novos'
                  ? 'Novos Processos'
                  : activeTab}
            </h2>
            <span className="text-sm text-slate-500 font-medium">{filteredItems.length} itens</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">Carregando atualizações...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600">Nenhum item nesta pasta.</p>
              <p className="text-sm text-slate-400 mt-1">
                Você está em dia com as atualizações desta categoria.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">{filteredItems.map(renderItemCard)}</div>
          )}
        </div>
      </div>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incluir Tarefa</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateTaskSubmit}>
            <div>
              <Label>Título da Tarefa</Label>
              <Input name="title" defaultValue={`Acompanhar: ${selectedItem?.title}`} required />
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
            <div className="pt-4 flex justify-end">
              <Button type="submit">Criar Tarefa</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incluir Evento na Agenda</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateEventSubmit}>
            <div>
              <Label>Título do Evento</Label>
              <Input
                name="title"
                defaultValue={`Prazo/Audiência: ${selectedItem?.title}`}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select name="type" defaultValue="Deadline">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Deadline">Prazo</SelectItem>
                    <SelectItem value="Hearing">Audiência</SelectItem>
                    <SelectItem value="Meeting">Reunião</SelectItem>
                    <SelectItem value="Task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit">Criar Evento</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

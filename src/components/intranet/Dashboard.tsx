import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Bell,
  UserPlus,
  CheckCircle2,
  Plus,
  Activity,
  BookOpen,
  Landmark,
  Archive,
  Check,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { isBefore, startOfDay } from 'date-fns'
import { CaseFormModal } from './cases/CaseFormModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { AgendaWidget } from './dashboard/AgendaWidget'

type FeedItem = {
  id: string
  source: 'gazette' | 'dou' | 'movement' | 'pje'
  title: string
  description: string
  date: string
  isRead: boolean
  tags: string[]
  raw: any
  lawsuitId?: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { isAdmin } = usePermissions()

  const [tasks, setTasks] = useState<any[]>([])
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)

  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('unread')
  const [selectedFeedItems, setSelectedFeedItems] = useState<string[]>([])
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null)
  const [myCollaboratorId, setMyCollaboratorId] = useState<string | null>(null)
  const [caseCount, setCaseCount] = useState(0)
  const [recentCases, setRecentCases] = useState<any[]>([])

  const [isSyncingAll, setIsSyncingAll] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentCase: '' })

  const [feedPage, setFeedPage] = useState(1)
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [feedPerPage, setFeedPerPage] = useState(() => {
    const stored = sessionStorage.getItem('dashboard_feed_per_page')
    return stored ? Number(stored) : 10
  })

  const canFilterOthers =
    isAdmin || user?.role === 'manager' || user?.role === 'admin' || user?.isAdmin

  useEffect(() => {
    sessionStorage.setItem('dashboard_feed_per_page', feedPerPage.toString())
  }, [feedPerPage])

  const loadTasks = async () => {
    let filter = 'status = "todo" && deleted_at = ""'
    if (selectedCollaboratorId) filter += ` && collaborator = "${selectedCollaboratorId}"`
    const fetchedTasks = await pb.collection('tasks').getFullList({ filter, sort: 'due_date' })
    setTasks(fetchedTasks)
  }

  const loadCaseCount = async () => {
    let filter = 'lifecycle_status = "Ativo" && type = "Processo" && deleted_at = ""'
    if (selectedCollaboratorId)
      filter += ` && responsible_collaborator = "${selectedCollaboratorId}"`
    try {
      const records = await pb.collection('legal_cases').getList(1, 5, { filter, sort: '-created' })
      setCaseCount(records.totalItems)
      setRecentCases(records.items)
    } catch (e) {
      console.error('Failed to load case count', e)
    }
  }

  const loadFeed = async () => {
    const orgId = pb.authStore.record?.active_organization
    const [gUnread, gRead, dUnread, dRead, mUnread, mRead, pUnread, pRead] = await Promise.all([
      pb
        .collection('gazette_publications')
        .getFullList({ filter: 'is_read = false', sort: '-created' }),
      pb
        .collection('gazette_publications')
        .getList(1, 20, { filter: 'is_read = true', sort: '-updated' }),
      pb
        .collection('ocorrencias_dou')
        .getFullList({ filter: 'status_alerta = "pendente"', sort: '-created' }),
      pb
        .collection('ocorrencias_dou')
        .getList(1, 20, { filter: 'status_alerta != "pendente"', sort: '-updated' }),
      pb.collection('case_movements').getFullList({
        filter: `notified_client = false && deleted_at = ""${orgId ? ` && organization = "${orgId}"` : ''}`,
        sort: '-event_date',
        expand: 'case',
      }),
      pb.collection('case_movements').getList(1, 20, {
        filter: `notified_client = true && deleted_at = ""${orgId ? ` && organization = "${orgId}"` : ''}`,
        sort: '-event_date',
        expand: 'case',
      }),
      pb.collection('pje_communications').getFullList({
        filter: `is_read = false${orgId ? ` && organization = "${orgId}"` : ''}`,
        sort: '-created',
        expand: 'linked_case',
      }),
      pb.collection('pje_communications').getList(1, 20, {
        filter: `is_read = true${orgId ? ` && organization = "${orgId}"` : ''}`,
        sort: '-updated',
        expand: 'linked_case',
      }),
    ])

    const mapItems = (items: any[], source: any, isRead: boolean): FeedItem[] =>
      items.map((i) => {
        const tags = [i.orgao || i.sigla_tribunal || i.siglaTribunal || i.source || 'Tribunal']
        if (source === 'movement') {
          if (i.movement_details?.avisosPendentes) tags.push('Aviso Pendente')
          if (i.movement_details?.teorComunicacao || i.movement_details?.ciencia)
            tags.push('Comunicação')
        } else if (source === 'pje' && i.tipoComunicacao) {
          tags.push(i.tipoComunicacao)
        }

        return {
          id: i.id,
          source,
          title:
            source === 'gazette'
              ? 'Diário Oficial'
              : source === 'dou'
                ? 'Ocorrência DOU'
                : source === 'pje'
                  ? `PJe: ${i.numeroProcesso}`
                  : `Movimentação: ${i.expand?.case?.case_number || 'Processo'}`,
          description: i.texto_normalizado || i.trecho_encontrado || i.texto || i.description || '',
          date:
            i.data_publicacao ||
            i.data_deteccao ||
            i.dataDisponibilizacao ||
            i.event_date ||
            i.created,
          isRead,
          tags,
          raw: i,
          lawsuitId: source === 'movement' ? i.case : source === 'pje' ? i.linked_case : undefined,
        }
      })

    const all = [
      ...mapItems(gUnread, 'gazette', false),
      ...mapItems(gRead.items, 'gazette', true),
      ...mapItems(dUnread, 'dou', false),
      ...mapItems(dRead.items, 'dou', true),
      ...mapItems(mUnread, 'movement', false),
      ...mapItems(mRead.items, 'movement', true),
      ...mapItems(pUnread, 'pje', false),
      ...mapItems(pRead.items, 'pje', true),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setFeedItems(all)
  }

  useEffect(() => {
    Promise.allSettled([loadTasks(), loadFeed(), loadCaseCount()]).catch(console.error)
  }, [selectedCollaboratorId])

  useEffect(() => {
    Promise.allSettled([
      pb
        .collection('clients')
        .getFullList({
          filter: `deleted_at = ""${pb.authStore.record?.active_organization ? ` && organization = "${pb.authStore.record.active_organization}"` : ''}`,
        })
        .then(setClients),
      pb
        .collection('collaborators')
        .getFullList({
          filter: `deleted_at = "" && user != ""${pb.authStore.record?.active_organization ? ` && organization = "${pb.authStore.record.active_organization}"` : ''}`,
          expand: 'user',
        })
        .then((collabs) => {
          const activeCollabs = collabs.filter((c) => c.expand?.user)
          setCollaborators(activeCollabs)
          if (user?.id) {
            const mine = activeCollabs.find((c) => c.user === user.id)
            if (mine) {
              setMyCollaboratorId(mine.id)
              if (!canFilterOthers) setSelectedCollaboratorId(mine.id)
            }
          }
        }),
    ]).catch(console.error)
  }, [user, canFilterOthers])

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const createDebouncedLoader = useCallback(
    (key: string, loader: () => Promise<void>) => () => {
      if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key])
      debounceTimers.current[key] = setTimeout(() => {
        loader().catch(console.error)
      }, 500)
    },
    [],
  )

  const debouncedLoadTasks = useMemo(
    () => createDebouncedLoader('tasks', loadTasks),
    [createDebouncedLoader, selectedCollaboratorId],
  )
  const debouncedLoadFeed = useMemo(
    () => createDebouncedLoader('feed', loadFeed),
    [createDebouncedLoader],
  )
  const debouncedLoadCaseCount = useMemo(
    () => createDebouncedLoader('caseCount', loadCaseCount),
    [createDebouncedLoader, selectedCollaboratorId],
  )

  useRealtime('tasks', debouncedLoadTasks, !isProcessingBatch)
  useRealtime('legal_cases', debouncedLoadCaseCount, !isProcessingBatch)
  useRealtime('gazette_publications', debouncedLoadFeed, !isProcessingBatch)
  useRealtime('ocorrencias_dou', debouncedLoadFeed, !isProcessingBatch)
  useRealtime('case_movements', debouncedLoadFeed, !isProcessingBatch)
  useRealtime('pje_communications', debouncedLoadFeed, !isProcessingBatch)

  const toggleTask = async (id: string, currentStatus: string) => {
    try {
      await pb
        .collection('tasks')
        .update(id, { status: currentStatus === 'todo' ? 'completed' : 'todo' })
    } catch (error) {
      toast({
        title: 'Erro ao atualizar tarefa',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await pb.collection('tasks').update(id, { deleted_at: new Date().toISOString() })
      toast({ title: 'Tarefa removida' })
    } catch (error) {
      toast({
        title: 'Erro ao excluir tarefa',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleEditTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingTask) return
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('tasks').update(editingTask.id, {
        title: fd.get('title'),
        priority: fd.get('priority'),
        status: fd.get('status'),
        due_date: fd.get('due_date')
          ? new Date(`${fd.get('due_date')}T12:00:00Z`).toISOString()
          : null,
      })
      setEditingTask(null)
      toast({ title: 'Tarefa atualizada' })
    } catch (err) {
      toast({ title: 'Erro ao editar', variant: 'destructive' })
    }
  }

  const toggleRead = async (item: FeedItem) => {
    try {
      if (item.source === 'gazette')
        await pb.collection('gazette_publications').update(item.id, { is_read: !item.isRead })
      else if (item.source === 'dou')
        await pb
          .collection('ocorrencias_dou')
          .update(item.id, { status_alerta: item.isRead ? 'pendente' : 'visualizado' })
      else if (item.source === 'movement')
        await pb.collection('case_movements').update(item.id, { notified_client: !item.isRead })
      else if (item.source === 'pje')
        await pb.collection('pje_communications').update(item.id, { is_read: !item.isRead })

      toast({ title: item.isRead ? 'Marcado como não lido' : 'Marcado como lido' })
      debouncedLoadFeed()
    } catch (e) {
      toast({ title: 'Erro ao atualizar item', variant: 'destructive' })
    }
  }

  const visibleFeed = useMemo(
    () => feedItems.filter((i) => (activeTab === 'unread' ? !i.isRead : i.isRead)),
    [feedItems, activeTab],
  )

  const paginatedFeed = useMemo(() => {
    const start = (feedPage - 1) * feedPerPage
    return visibleFeed.slice(start, start + feedPerPage)
  }, [visibleFeed, feedPage, feedPerPage])

  useEffect(() => {
    setSelectedFeedItems([])
    setFeedPage(1)
  }, [activeTab])

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedFeedItems(paginatedFeed.map((i) => i.id))
    else setSelectedFeedItems([])
  }

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) setSelectedFeedItems((prev) => [...prev, id])
    else setSelectedFeedItems((prev) => prev.filter((i) => i !== id))
  }

  const handleSyncAllPje = async () => {
    try {
      setIsSyncingAll(true)

      const orgId = pb.authStore.record?.active_organization
      let filter = 'lifecycle_status = "Ativo" && case_number != "" && deleted_at = ""'
      if (orgId) filter += ` && organization = "${orgId}"`

      const cases = await pb.collection('legal_cases').getFullList({ filter })

      if (cases.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Nenhum processo ativo com número preenchido encontrado.',
        })
        return
      }

      setSyncProgress({ current: 0, total: cases.length, currentCase: '' })

      let successCount = 0
      let newComms = 0
      let failCount = 0

      for (let i = 0; i < cases.length; i++) {
        const c = cases[i]
        setSyncProgress({
          current: i + 1,
          total: cases.length,
          currentCase: c.case_number || 'Sem número',
        })

        try {
          const res = await pb.send(`/backend/v1/sync/case/${c.id}`, { method: 'GET' })
          successCount++
          if (res.new_communications) newComms += res.new_communications
        } catch (err: any) {
          console.error(`Error syncing case ${c.case_number}:`, err)
          failCount++
        }
      }

      toast({
        title: 'Sincronização Concluída',
        description: `${successCount} processos verificados. ${newComms} novas comunicações.${failCount > 0 ? ` (${failCount} falhas)` : ''}`,
      })
      debouncedLoadCaseCount()
      debouncedLoadFeed()
    } catch (err) {
      toast({
        title: 'Erro na Sincronização',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsSyncingAll(false)
      setSyncProgress({ current: 0, total: 0, currentCase: '' })
    }
  }

  const handleBulkAction = async (markAsRead: boolean) => {
    if (selectedFeedItems.length === 0) return
    setIsProcessingBatch(true)

    // Optimistic UI update
    setFeedItems((prev) =>
      prev.map((i) => (selectedFeedItems.includes(i.id) ? { ...i, isRead: markAsRead } : i)),
    )
    const itemsToUpdate = feedItems.filter((i) => selectedFeedItems.includes(i.id))
    setSelectedFeedItems([])

    const CHUNK_SIZE = 10
    const chunks = []
    for (let i = 0; i < itemsToUpdate.length; i += CHUNK_SIZE) {
      chunks.push(itemsToUpdate.slice(i, i + CHUNK_SIZE))
    }

    let hasErrors = false

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (item) => {
          let success = false
          let attempts = 0
          let lastError = null

          while (!success && attempts < 3) {
            try {
              if (item.source === 'gazette')
                await pb.collection('gazette_publications').update(item.id, { is_read: markAsRead })
              else if (item.source === 'dou')
                await pb
                  .collection('ocorrencias_dou')
                  .update(item.id, { status_alerta: markAsRead ? 'visualizado' : 'pendente' })
              else if (item.source === 'movement')
                await pb
                  .collection('case_movements')
                  .update(item.id, { notified_client: markAsRead })
              else if (item.source === 'pje')
                await pb.collection('pje_communications').update(item.id, { is_read: markAsRead })

              success = true
            } catch (err) {
              lastError = err
              attempts++
              if (attempts < 3) {
                await new Promise((r) => setTimeout(r, 500 * attempts))
              }
            }
          }

          if (!success) {
            hasErrors = true
            try {
              await pb.collection('system_logs').create({
                level: 'error',
                module: 'Dashboard',
                message: `Falha ao processar item em lote (ID: ${item.id}) após 3 tentativas.`,
                details: { item, error: lastError },
                organization: pb.authStore.record?.active_organization || null,
                user: pb.authStore.record?.id || null,
              })
            } catch (logErr) {
              console.error('Failed to write audit log', logErr)
            }
          }
        }),
      )
    }

    if (hasErrors) {
      toast({ title: 'Alguns itens falharam e foram registrados no log', variant: 'destructive' })
    } else {
      toast({ title: `Itens marcados como ${markAsRead ? 'lidos' : 'não lidos'}` })
    }

    debouncedLoadFeed()
    setIsProcessingBatch(false)
  }

  return (
    <div className="flex h-[calc(100vh-80px)] -m-4 lg:-m-8 bg-white text-slate-800 font-sans shadow-sm rounded-xl overflow-hidden border border-slate-200/60">
      <div className="w-72 border-r border-slate-200 p-8 flex flex-col gap-8 shrink-0 hidden xl:flex bg-slate-50/50">
        <h2 className="text-lg font-bold tracking-tight text-slate-800 uppercase">VISÃO GERAL</h2>
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-wider">
            Filtros
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-800 mb-3">
                <div className="flex items-center">
                  <UserPlus className="w-4 h-4 mr-2" /> Por colaborador
                </div>
                {canFilterOthers && (
                  <button
                    onClick={() => navigate('/intranet/team')}
                    className="text-primary text-[10px] font-bold hover:underline uppercase tracking-wide"
                    title="Convidar Colaborador"
                  >
                    + Convidar
                  </button>
                )}
              </div>
              <ul className="space-y-3 pl-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {canFilterOthers && (
                  <li
                    className={cn(
                      'text-sm flex items-center gap-2 cursor-pointer transition-colors',
                      selectedCollaboratorId === null
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                    onClick={() => setSelectedCollaboratorId(null)}
                  >
                    {selectedCollaboratorId === null && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                    <span className={selectedCollaboratorId === null ? '' : 'ml-6'}>
                      Todos do escritório
                    </span>
                  </li>
                )}
                {collaborators
                  .filter((c) => canFilterOthers || c.id === myCollaboratorId)
                  .map((c) => (
                    <li
                      key={c.id}
                      className={cn(
                        'text-sm flex items-center gap-2 cursor-pointer transition-colors',
                        selectedCollaboratorId === c.id
                          ? 'font-semibold text-slate-900'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                      onClick={() => {
                        if (canFilterOthers) setSelectedCollaboratorId(c.id)
                      }}
                    >
                      {selectedCollaboratorId === c.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                      <span className={selectedCollaboratorId === c.id ? '' : 'ml-6'}>
                        {c.name}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200/60">
            <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-wider">
              Estatísticas
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Processos Ativos</span>
                <span className="font-bold text-slate-800">{caseCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Tarefas Pendentes</span>
                <span className="font-bold text-slate-800">{tasks.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 md:p-12 overflow-auto bg-white flex flex-col">
        <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight text-primary">Visão Geral</h2>
            <p className="text-sm text-slate-500 mt-1">
              Resumo do seu dia e atualizações recentes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isSyncingAll ? (
              <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                <div className="text-xs">
                  <div className="font-semibold text-slate-700">
                    Sincronizando PJe ({syncProgress.current}/{syncProgress.total})
                  </div>
                  <div className="text-slate-500 truncate max-w-[150px]">
                    {syncProgress.currentCase}
                  </div>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAllPje}
                className="hidden sm:flex shadow-sm bg-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar PJe
              </Button>
            )}
            <Button
              onClick={() => setCaseModalOpen(true)}
              size="sm"
              className="hidden sm:flex shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Processo ou Serviço
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full max-w-4xl mx-auto flex flex-col flex-1"
        >
          <TabsList className="bg-slate-100/50 p-1 mb-6 rounded-lg inline-flex self-start">
            <TabsTrigger
              value="unread"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2"
            >
              Não Lidos
              {feedItems.filter((i) => !i.isRead).length > 0 && (
                <span className="ml-2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {feedItems.filter((i) => !i.isRead).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="read"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2"
            >
              Arquivados
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value={activeTab}
            className="outline-none flex flex-col flex-1 animate-in fade-in duration-300"
          >
            <div className="flex items-center justify-between bg-slate-50/50 p-3 rounded-lg border border-slate-200 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-feed"
                  checked={
                    paginatedFeed.length > 0 && selectedFeedItems.length === paginatedFeed.length
                  }
                  onCheckedChange={handleSelectAll}
                  disabled={paginatedFeed.length === 0 || isProcessingBatch}
                />
                <Label
                  htmlFor="select-all-feed"
                  className="text-sm cursor-pointer text-slate-700 font-medium"
                >
                  Selecionar Página
                </Label>
              </div>
              {selectedFeedItems.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                  <span className="text-xs text-muted-foreground mr-2 font-medium">
                    {selectedFeedItems.length} selecionados
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs bg-white"
                    onClick={() => handleBulkAction(true)}
                    disabled={isProcessingBatch}
                  >
                    {isProcessingBatch && <RefreshCw className="w-3 h-3 mr-2 animate-spin" />}
                    Marcar como Lido
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs bg-white"
                    onClick={() => handleBulkAction(false)}
                    disabled={isProcessingBatch}
                  >
                    {isProcessingBatch && <RefreshCw className="w-3 h-3 mr-2 animate-spin" />}
                    Marcar como Não Lido
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
              {paginatedFeed.length === 0 ? (
                <div className="text-center py-16 text-slate-400 border border-dashed rounded-xl bg-slate-50/50">
                  <Archive className="w-10 h-10 mx-auto mb-4 opacity-50 text-slate-300" />
                  <p className="text-sm font-medium">Nenhum item nesta lista.</p>
                </div>
              ) : (
                paginatedFeed.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'p-5 border rounded-xl flex gap-4 transition-all hover:shadow-md group',
                      item.isRead ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-blue-100',
                      selectedFeedItems.includes(item.id) && 'border-primary/40 bg-primary/5',
                    )}
                  >
                    <div className="pt-1 flex flex-col items-center gap-3">
                      <Checkbox
                        checked={selectedFeedItems.includes(item.id)}
                        onCheckedChange={(c) => handleSelect(item.id, !!c)}
                        disabled={isProcessingBatch}
                      />
                      {item.source === 'gazette' ? (
                        <BookOpen
                          className={cn(
                            'w-5 h-5',
                            item.isRead ? 'text-slate-400' : 'text-amber-500',
                          )}
                        />
                      ) : item.source === 'dou' ? (
                        <Landmark
                          className={cn(
                            'w-5 h-5',
                            item.isRead ? 'text-slate-400' : 'text-emerald-500',
                          )}
                        />
                      ) : item.source === 'pje' ? (
                        <Scale
                          className={cn(
                            'w-5 h-5',
                            item.isRead ? 'text-slate-400' : 'text-indigo-500',
                          )}
                        />
                      ) : (
                        <Activity
                          className={cn(
                            'w-5 h-5',
                            item.isRead ? 'text-slate-400' : 'text-blue-500',
                          )}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4
                          className={cn(
                            'font-bold text-sm',
                            item.isRead ? 'text-slate-600' : 'text-slate-900',
                          )}
                        >
                          {item.lawsuitId ? (
                            <Link
                              to={`/intranet/processos/${item.lawsuitId}`}
                              className="text-primary hover:underline"
                            >
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}{' '}
                        </h4>
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {new Date(item.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-sm leading-relaxed mb-3 line-clamp-3',
                          item.isRead ? 'text-slate-500' : 'text-slate-700',
                        )}
                      >
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-auto">
                        {item.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded"
                          >
                            {t}
                          </span>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'ml-auto h-8 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity',
                            item.isRead
                              ? 'text-slate-500 hover:text-slate-700'
                              : 'text-primary hover:text-primary/80',
                          )}
                          onClick={() => toggleRead(item)}
                          disabled={isProcessingBatch}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {item.isRead ? 'Mover para Não Lidos' : 'Marcar como Lido'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {visibleFeed.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 border rounded-xl mt-4 gap-4 shrink-0">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>Mostrar</span>
                  <Select
                    value={feedPerPage.toString()}
                    onValueChange={(v) => {
                      setFeedPerPage(Number(v))
                      setFeedPage(1)
                    }}
                  >
                    <SelectTrigger className="w-20 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>por página</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
                    disabled={feedPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-slate-600 font-medium px-2">
                    Página {feedPage} de {Math.ceil(visibleFeed.length / feedPerPage) || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFeedPage((p) =>
                        Math.min(Math.ceil(visibleFeed.length / feedPerPage), p + 1),
                      )
                    }
                    disabled={
                      feedPage === Math.ceil(visibleFeed.length / feedPerPage) ||
                      visibleFeed.length === 0
                    }
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="w-96 border-l border-slate-200 p-8 flex flex-col gap-8 shrink-0 bg-slate-50/50 overflow-y-auto hidden lg:flex">
        <div className="h-[380px] shrink-0">
          <AgendaWidget />
        </div>
        <div className="flex-1 flex flex-col min-h-[250px]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Tarefas ({tasks.length})
            </div>
            <button
              onClick={() => setTaskModalOpen(true)}
              className="p-1.5 bg-white shadow-sm border hover:bg-slate-50 rounded transition-colors text-slate-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 overflow-y-auto pr-2">
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma tarefa pendente.</p>
            ) : (
              tasks.map((task) => {
                const isOverdue =
                  task.due_date && isBefore(new Date(task.due_date), startOfDay(new Date()))
                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 group bg-white p-3 rounded-lg border shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => setEditingTask(task)}
                  >
                    <Checkbox
                      className="mt-0.5 border-slate-300"
                      checked={task.status === 'completed'}
                      onCheckedChange={() => toggleTask(task.id, task.status)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium text-slate-800 leading-snug',
                          task.status === 'completed' && 'line-through text-slate-400',
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        {task.due_date && (
                          <p
                            className={cn(
                              'text-xs font-semibold',
                              isOverdue && task.status !== 'completed'
                                ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded'
                                : 'text-slate-400',
                            )}
                          >
                            {new Date(task.due_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              task.priority === 'high'
                                ? 'bg-red-500'
                                : task.priority === 'medium'
                                  ? 'bg-amber-400'
                                  : 'bg-slate-300',
                            )}
                            title={`Prioridade: ${task.priority}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTask(task.id)
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <CaseFormModal
        open={caseModalOpen}
        onOpenChange={setCaseModalOpen}
        editingCase={null}
        clients={clients}
        collaborators={collaborators}
        onSuccess={() => {
          debouncedLoadCaseCount()
          debouncedLoadFeed()
        }}
      />

      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const title = fd.get('title')?.toString() || ''
              if (!title.trim())
                return toast({
                  title: 'Erro',
                  description: 'O título é obrigatório.',
                  variant: 'destructive',
                })
              try {
                await pb.collection('tasks').create({
                  title: title.trim(),
                  status: 'todo',
                  priority: fd.get('priority'),
                  organization: pb.authStore.record?.active_organization,
                })
                toast({ title: 'Sucesso', description: 'Tarefa criada.' })
                setTaskModalOpen(false)
                debouncedLoadTasks()
              } catch (error) {
                toast({
                  title: 'Erro ao criar tarefa',
                  description: getErrorMessage(error),
                  variant: 'destructive',
                })
              }
            }}
          >
            <Input name="title" placeholder="Descreva a tarefa..." required autoFocus />
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
            <Button type="submit" className="w-full">
              Criar Tarefa
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <form className="space-y-4" onSubmit={handleEditTaskSubmit}>
              <div>
                <Label>Título</Label>
                <Input name="title" defaultValue={editingTask.title} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Vencimento</Label>
                  <Input
                    name="due_date"
                    type="date"
                    defaultValue={editingTask.due_date ? editingTask.due_date.slice(0, 10) : ''}
                  />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select name="priority" defaultValue={editingTask.priority || 'medium'}>
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
              <div>
                <Label>Status</Label>
                <Select name="status" defaultValue={editingTask.status || 'todo'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Pendente</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Salvar Alterações
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

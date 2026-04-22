import { useState, useEffect, useMemo, useRef } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
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
import { useRealtime } from '@/hooks/use-realtime'

type UnifiedItem = {
  id: string
  collection: 'pje_communications' | 'results' | 'gazette_publications' | 'ocorrencias_dou'
  type: 'PJe' | 'DOU' | 'Processo Novo' | 'Ocorrência'
  title: string
  description: string
  date: string
  isRead: boolean
  isArchived: boolean
  caseNumber?: string
  caseId?: string
  raw: any
}

export default function CentralAtualizacoes() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [items, setItems] = useState<UnifiedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('inbox')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)

  const isProcessingBatchRef = useRef(isProcessingBatch)
  useEffect(() => {
    isProcessingBatchRef.current = isProcessingBatch
  }, [isProcessingBatch])

  useRealtime('pje_communications', () => {
    if (!isProcessingBatchRef.current) loadData()
  })
  useRealtime('gazette_publications', () => {
    if (!isProcessingBatchRef.current) loadData()
  })
  useRealtime('ocorrencias_dou', () => {
    if (!isProcessingBatchRef.current) loadData()
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [pjeRes, douPub, douOcc, casesRes] = await Promise.all([
        pb
          .collection('pje_communications')
          .getList(1, 500, { sort: '-created', expand: 'linked_case' }),
        pb.collection('gazette_publications').getList(1, 500, { sort: '-created' }),
        pb.collection('ocorrencias_dou').getList(1, 500, { sort: '-created' }),
        pb.collection('legal_cases').getFullList({ fields: 'id,case_number' }),
      ])

      const casesMap = new Map()
      casesRes.forEach((c) => {
        if (c.case_number) casesMap.set(c.case_number.replace(/\D/g, ''), c)
      })

      const mappedPje: UnifiedItem[] = pjeRes.items.map((i) => {
        const numClean = i.numeroProcesso ? i.numeroProcesso.replace(/\D/g, '') : ''
        const isNew = numClean && !casesMap.has(numClean)
        const linkedCaseId = i.linked_case || casesMap.get(numClean)?.id
        return {
          id: i.id,
          collection: 'pje_communications',
          type: isNew ? 'Processo Novo' : 'PJe',
          title: `Processo: ${i.numeroProcesso || 'N/A'} - ${i.siglaTribunal || ''}`,
          description: `${i.tipoComunicacao ? `[${i.tipoComunicacao}] ` : ''}${i.texto || ''}`,
          date: i.dataDisponibilizacao || i.created,
          isRead: !!i.is_read,
          isArchived: false,
          caseNumber: i.numeroProcesso,
          caseId: linkedCaseId,
          raw: i,
        }
      })

      const mappedDouPub: UnifiedItem[] = douPub.items.map((i) => {
        let numList: string[] = []
        if (typeof i.numero_processo === 'string') numList.push(i.numero_processo)
        else if (Array.isArray(i.numero_processo)) numList.push(...i.numero_processo)

        let primaryNum = numList[0] || ''
        let numClean = primaryNum.replace(/\D/g, '')
        const isNew = numClean && !casesMap.has(numClean)
        const linkedCase = casesMap.get(numClean)

        return {
          id: i.id,
          collection: 'gazette_publications',
          type: isNew ? 'Processo Novo' : 'DOU',
          title: `Publicação DOU: ${i.orgao || 'Órgão Desconhecido'}`,
          description: i.texto_normalizado || '',
          date: i.data_publicacao || i.created,
          isRead: !!i.is_read,
          isArchived: !!i.is_archived,
          caseNumber: primaryNum,
          caseId: linkedCase ? linkedCase.id : undefined,
          raw: i,
        }
      })

      const mappedDouOcc: UnifiedItem[] = douOcc.items.map((i) => ({
        id: i.id,
        collection: 'ocorrencias_dou',
        type: 'Ocorrência',
        title: `Ocorrência DOU - Termo encontrado`,
        description: i.trecho_encontrado || '',
        date: i.data_deteccao || i.created,
        isRead: i.status_alerta === 'visualizado',
        isArchived: !!i.is_archived,
        raw: i,
      }))

      const all = [...mappedPje, ...mappedDouPub, ...mappedDouOcc]
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

  const processBatch = async (action: 'read' | 'archive', idsToProcess?: Set<string>) => {
    const targetIds = idsToProcess || selectedIds
    const itemsToProcess = items.filter((i) => targetIds.has(`${i.collection}-${i.id}`))
    if (itemsToProcess.length === 0) return

    setIsProcessingBatch(true)
    setBatchProgress(0)
    setBatchTotal(itemsToProcess.length)

    let successCount = 0
    let hasError = false

    // Optimistic update
    setItems((prev) =>
      prev.map((item) => {
        if (targetIds.has(`${item.collection}-${item.id}`)) {
          return {
            ...item,
            isRead: action === 'read' ? true : item.isRead,
            isArchived: action === 'archive' ? true : item.isArchived,
          }
        }
        return item
      }),
    )

    // Sequential batches of 10 to avoid SQLite locked errors
    const chunkSize = 10
    for (let i = 0; i < itemsToProcess.length; i += chunkSize) {
      const chunk = itemsToProcess.slice(i, i + chunkSize)
      try {
        await Promise.all(
          chunk.map(async (item) => {
            if (action === 'read') {
              if (item.collection === 'pje_communications')
                await pb.collection('pje_communications').update(item.id, { is_read: true })
              else if (item.collection === 'gazette_publications')
                await pb.collection('gazette_publications').update(item.id, { is_read: true })
              else if (item.collection === 'ocorrencias_dou')
                await pb
                  .collection('ocorrencias_dou')
                  .update(item.id, { status_alerta: 'visualizado' })
            } else if (action === 'archive') {
              if (item.collection !== 'pje_communications') {
                await pb.collection(item.collection).update(item.id, { is_archived: true })
              } else {
                await pb.collection('pje_communications').update(item.id, { is_read: true })
              }
            }
          }),
        )
        successCount += chunk.length
        setBatchProgress(successCount)
      } catch (err) {
        console.error(err)
        hasError = true
        toast({
          title: 'Erro ao processar lote',
          description: `Operação interrompida após ${successCount} itens.`,
          variant: 'destructive',
        })
        break
      }
    }

    if (!hasError && targetIds.size > 1) {
      toast({ title: `Sucesso`, description: `${successCount} itens atualizados com sucesso.` })
    } else if (!hasError && targetIds.size === 1) {
      toast({ title: action === 'read' ? 'Marcado como lido' : 'Movido para Arquivados' })
    }

    if (!idsToProcess) {
      setSelectedIds(new Set())
    }

    setTimeout(async () => {
      setIsProcessingBatch(false)
      await loadData()
    }, 500)
  }

  const handleMarkAsRead = (item: UnifiedItem) => {
    processBatch('read', new Set([`${item.collection}-${item.id}`]))
  }

  const handleArchive = (item: UnifiedItem) => {
    processBatch('archive', new Set([`${item.collection}-${item.id}`]))
  }

  const handleMarkAllAsRead = () => {
    const unreadIds = new Set(
      filteredItems.filter((i) => !i.isRead).map((i) => `${i.collection}-${i.id}`),
    )
    if (unreadIds.size > 0) {
      processBatch('read', unreadIds)
    }
  }

  const handleCreateTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('tasks').create({
        title: fd.get('title'),
        description: fd.get('description'),
        priority: fd.get('priority'),
        due_date: fd.get('due_date')
          ? new Date(`${fd.get('due_date')}T12:00:00Z`).toISOString()
          : null,
        status: 'todo',
        linked_lawsuit: selectedItem?.caseId || null,
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
        description: fd.get('description'),
        type: fd.get('type'),
        start_date: fd.get('start_date')
          ? new Date(`${fd.get('start_date')}T12:00:00Z`).toISOString()
          : null,
        linked_lawsuit: selectedItem?.caseId || null,
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Evento criado com sucesso!' })
      setEventDialogOpen(false)
    } catch (err) {
      toast({ title: 'Erro ao criar evento', variant: 'destructive' })
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [activeTab, itemsPerPage])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === 'inbox')
        return !item.isRead && !item.isArchived && item.type !== 'Processo Novo'
      if (activeTab === 'pje') return item.isRead && !item.isArchived && item.type === 'PJe'
      if (activeTab === 'dou') return item.isRead && !item.isArchived && item.type === 'DOU'
      if (activeTab === 'novos') return item.type === 'Processo Novo' && !item.isArchived
      if (activeTab === 'arquivados') return item.isArchived
      return true
    })
  }, [items, activeTab])

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(start, start + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  const renderItemCard = (item: UnifiedItem) => {
    const itemKey = `${item.collection}-${item.id}`
    const isSelected = selectedIds.has(itemKey)

    return (
      <Card
        key={itemKey}
        className={cn(
          'overflow-hidden border-slate-200 transition-all hover:shadow-md relative',
          !item.isRead ? 'bg-blue-50/30 border-blue-100' : 'bg-white',
          isSelected && 'ring-2 ring-primary border-primary bg-primary/5',
        )}
      >
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold tracking-wider uppercase text-slate-500">
              {item.type === 'DOU' && <Landmark className="w-4 h-4 text-emerald-500" />}
              {item.type === 'PJe' && <Activity className="w-4 h-4 text-blue-500" />}
              {item.type === 'Processo Novo' && <FileText className="w-4 h-4 text-primary" />}
              {item.type === 'Ocorrência' && <Activity className="w-4 h-4 text-amber-500" />}
              {item.type}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                {item.date ? format(new Date(item.date), 'dd/MM/yyyy HH:mm') : '-'}
              </span>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => {
                  const newSet = new Set(selectedIds)
                  if (checked) newSet.add(itemKey)
                  else newSet.delete(itemKey)
                  setSelectedIds(newSet)
                }}
              />
            </div>
          </div>

          <div>
            <h3
              className={cn(
                'text-lg font-bold mb-2 flex items-center flex-wrap gap-2',
                item.isRead ? 'text-slate-800' : 'text-slate-900',
              )}
            >
              {item.caseNumber && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-primary bg-primary/10 border-primary/20 transition-colors',
                    item.caseId && 'hover:bg-primary/20 cursor-pointer',
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.caseId) navigate(`/intranet/processos/${item.caseId}`)
                  }}
                >
                  {item.caseNumber}
                </Badge>
              )}
              <span
                className={cn(
                  'leading-tight',
                  item.caseId &&
                    'cursor-pointer hover:text-primary transition-colors hover:underline',
                )}
                onClick={() => {
                  if (item.caseId) navigate(`/intranet/processos/${item.caseId}`)
                }}
              >
                {item.title}
              </span>
            </h3>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-32 overflow-hidden relative mt-2">
              <p
                className="text-sm text-slate-600 line-clamp-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.description }}
              ></p>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 pt-4 border-t border-slate-100">
            {!item.isRead && item.type !== 'Processo Novo' && (
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

            {(item.collection === 'pje_communications' ||
              item.collection === 'gazette_publications') && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  if (!item.isRead) await handleMarkAsRead(item)
                  if (item.collection === 'pje_communications') {
                    navigate(`/intranet/pje-comunica?id=${item.id}`)
                  } else {
                    navigate(`/intranet/comunicacoes/${item.id}`)
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
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
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Central de Atualizações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inbox inteligente para gerenciar intimações do PJe, publicações do DOU e novos processos
          identificados.
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
                  {
                    items.filter((i) => !i.isRead && !i.isArchived && i.type !== 'Processo Novo')
                      .length
                  }
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="pje"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Activity className="w-4 h-4 mr-3 text-blue-500" /> Lidos - PJe
              </TabsTrigger>
              <TabsTrigger
                value="dou"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Landmark className="w-4 h-4 mr-3 text-emerald-500" /> Lidos - DOU
              </TabsTrigger>
              <TabsTrigger
                value="novos"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <FileText className="w-4 h-4 mr-3 text-primary" />
                Novos Processos
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                  {items.filter((i) => i.type === 'Processo Novo' && !i.isArchived).length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="arquivados"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Archive className="w-4 h-4 mr-3 text-slate-500" /> Arquivados
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 w-full min-w-0">
          <div className="bg-slate-50/50 rounded-xl p-1 border border-slate-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-3 gap-4">
            <h2 className="text-lg font-bold text-slate-800 capitalize">
              {activeTab === 'inbox'
                ? 'Caixa de Entrada (Não Lidos)'
                : activeTab === 'novos'
                  ? 'Novos Processos Encontrados'
                  : activeTab}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 font-medium">
                {filteredItems.length} itens
              </span>
              {filteredItems.length > 0 && (
                <div className="flex items-center gap-2 px-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      paginatedItems.length > 0 &&
                      paginatedItems.every((i) => selectedIds.has(`${i.collection}-${i.id}`))
                    }
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedIds)
                      if (checked) {
                        paginatedItems.forEach((i) => newSet.add(`${i.collection}-${i.id}`))
                      } else {
                        paginatedItems.forEach((i) => newSet.delete(`${i.collection}-${i.id}`))
                      }
                      setSelectedIds(newSet)
                    }}
                  />
                  <Label
                    htmlFor="select-all"
                    className="text-sm font-medium cursor-pointer text-slate-600"
                  >
                    Selecionar Página
                  </Label>
                </div>
              )}
              {activeTab === 'inbox' && filteredItems.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleMarkAllAsRead}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar todos como lidos
                </Button>
              )}
            </div>
          </div>

          {loading && items.length === 0 ? (
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
            <div className="grid gap-4">
              {paginatedItems.map(renderItemCard)}

              {filteredItems.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 border rounded-xl mt-4 gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Mostrar</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(v) => setItemsPerPage(Number(v))}
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
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-slate-600 font-medium px-2">
                      Página {currentPage} de {Math.ceil(filteredItems.length / itemsPerPage) || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(Math.ceil(filteredItems.length / itemsPerPage), p + 1),
                        )
                      }
                      disabled={
                        currentPage === Math.ceil(filteredItems.length / itemsPerPage) ||
                        filteredItems.length === 0
                      }
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
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
            <div>
              <Label>Descrição / Contexto</Label>
              <textarea
                name="description"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                defaultValue={selectedItem?.description?.replace(/<[^>]*>?/gm, '').trim()}
              />
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
            <div>
              <Label>Descrição / Contexto</Label>
              <textarea
                name="description"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                defaultValue={selectedItem?.description?.replace(/<[^>]*>?/gm, '').trim()}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input name="start_date" type="date" required />
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
                    <SelectItem value="Email">Email</SelectItem>
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

      <Dialog open={isProcessingBatch} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Processando Lote...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <Progress
              value={batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0}
              className="w-full h-3"
            />
            <p className="text-sm text-center text-slate-500 font-medium">
              Atualizando {batchProgress} de {batchTotal} itens. Por favor, aguarde.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-xl border border-slate-200 px-6 py-3 flex items-center gap-4 z-50 animate-fade-in-up">
          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
            {selectedIds.size} {selectedIds.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <Button
            size="sm"
            variant="default"
            onClick={() => processBatch('read')}
            className="bg-primary text-white"
            disabled={isProcessingBatch}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar Lidos
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => processBatch('archive')}
            disabled={isProcessingBatch}
          >
            <Archive className="w-4 h-4 mr-2" /> Arquivar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            disabled={isProcessingBatch}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}

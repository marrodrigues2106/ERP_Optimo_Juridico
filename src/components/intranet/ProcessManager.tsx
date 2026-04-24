import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  Loader2,
  Edit,
  Trash2,
  AlertTriangle,
  Check,
  Clock,
  Copy,
} from 'lucide-react'
import { useSync } from '@/stores/sync-context'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { CaseFormModal } from './cases/CaseFormModal'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { deleteLegalCase } from '@/services/legal_cases'

export default function ProcessManager() {
  const { toast } = useToast()
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(() => {
    const saved = sessionStorage.getItem('process_manager_per_page')
    return saved ? Number(saved) : 10
  })
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('process_manager_sort') || '-created'
  })

  useEffect(() => {
    sessionStorage.setItem('process_manager_per_page', perPage.toString())
  }, [perPage])

  useEffect(() => {
    localStorage.setItem('process_manager_sort', sortBy)
  }, [sortBy])

  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { isBatchSyncing, batchProgress, startBatchSync } = useSync()

  const [editingMetadataCase, setEditingMetadataCase] = useState<any>(null)

  const [clients, setClients] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const orgId = pb.authStore.record?.active_organization

      const filterParts = [`deleted_at = ""`]
      if (orgId) filterParts.push(`organization = "${orgId}"`)
      if (searchTerm) {
        const safeTerm = searchTerm.replace(/"/g, '\\"')
        filterParts.push(
          `(case_number ~ "${safeTerm}" || parties ~ "${safeTerm}" || title ~ "${safeTerm}" || client.name ~ "${safeTerm}" || client.fullName ~ "${safeTerm}")`,
        )
      }
      if (statusFilter !== 'Todos') {
        filterParts.push(`lifecycle_status = "${statusFilter}"`)
      }

      const filterStr = filterParts.join(' && ')

      const casesData = await pb.collection('legal_cases').getList(page, perPage, {
        filter: filterStr,
        sort: sortBy,
        expand: 'client,responsible_collaborator',
      })

      setCases(casesData.items)
      setTotalPages(casesData.totalPages)

      if (clients.length === 0) {
        const [clientsData, collabsData] = await Promise.all([
          pb.collection('clients').getFullList({ filter: `deleted_at = ""` }),
          pb.collection('collaborators').getFullList({ filter: `deleted_at = ""` }),
        ])
        setClients(clientsData)
        setCollaborators(collabsData)
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar processos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, perPage, sortBy, searchTerm, statusFilter, toast, clients.length])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadData])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter, sortBy, perPage])

  useRealtime('legal_cases', loadData)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(cases.map((c) => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id))
    }
  }

  const handleBatchSync = () => {
    const targetCases =
      selectedIds.length > 0
        ? cases.filter((c) => selectedIds.includes(c.id))
        : cases.filter((c) => c.lifecycle_status === 'Ativo')

    const casesToSync = targetCases.filter((c) => c.case_number)

    if (casesToSync.length === 0)
      return toast({
        title: 'Nenhum processo válido encontrado para sincronizar',
        variant: 'destructive',
      })

    startBatchSync(casesToSync)
    setSelectedIds([])
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copiado para a área de transferência!' })
  }

  const getStatusBadge = (caseRecord: any) => {
    if (!caseRecord.case_number) return null
    const status = caseRecord.sync_status || 'pending'
    switch (status) {
      case 'pending':
        return (
          <Badge
            variant="outline"
            className="text-[10px] text-slate-500 font-normal bg-slate-50/50"
          >
            <Clock className="w-3 h-3 mr-1" /> Pendente
          </Badge>
        )
      case 'in_queue':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-normal hover:bg-amber-100">
            <Clock className="w-3 h-3 mr-1" /> Na fila
          </Badge>
        )
      case 'syncing':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-none text-[10px] font-normal flex items-center gap-1 hover:bg-indigo-100">
            <Loader2 className="w-3 h-3 animate-spin" /> Sincronizando
          </Badge>
        )
      case 'updated':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-normal flex items-center gap-1 hover:bg-emerald-100">
            <Check className="w-3 h-3" /> Atualizado
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 border-none text-[10px] font-normal flex items-center gap-1 hover:bg-red-100">
            <AlertTriangle className="w-3 h-3" /> Erro
          </Badge>
        )
      default:
        return null
    }
  }

  const handleSaveMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingMetadataCase) return
    const fd = new FormData(e.currentTarget)
    const tagsStr = fd.get('tags') as string
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t)

    const distributionDateStr = fd.get('distribution_date') as string
    const distribution_date = distributionDateStr
      ? new Date(distributionDateStr).toISOString()
      : editingMetadataCase.metadata?.distribution_date || editingMetadataCase.distribution_date

    const payload = {
      title: fd.get('title'),
      case_number: fd.get('case_number'),
      parties: fd.get('parties'),
      court: fd.get('court'),
      description: fd.get('description'),
      observations: fd.get('observations'),
      tags,
      distribution_date,
      metadata: {
        ...editingMetadataCase.metadata,
        distribution_date,
      },
    }

    try {
      await pb.collection('legal_cases').update(editingMetadataCase.id, payload)
      toast({ title: 'Metadados atualizados com sucesso' })
      setEditingMetadataCase(null)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este processo? Esta ação não pode ser desfeita.')) return
    try {
      await deleteLegalCase(id)
      toast({ title: 'Processo excluído' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Processos e Serviços</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os casos de sua equipe e sincronize dados em tempo real.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Processo
        </Button>
      </div>

      {isBatchSyncing && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6 flex flex-col gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <h3 className="font-semibold text-indigo-900">Sincronização do PJe em Lote Ativa</h3>
          </div>
          <div className="flex justify-between text-sm text-indigo-800 font-medium">
            <span>Processando: {batchProgress.currentCase}...</span>
            <span>
              {batchProgress.current} de {batchProgress.total}
            </span>
          </div>
          <Progress
            value={(batchProgress.current / batchProgress.total) * 100}
            className="h-2.5 bg-indigo-200 [&>div]:bg-indigo-600"
          />
        </div>
      )}

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-64 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por número ou parte..."
                  className="pl-9 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Ativo">Ativos</SelectItem>
                  <SelectItem value="Suspenso">Suspensos</SelectItem>
                  <SelectItem value="Arquivado">Arquivados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created">Mais Recentes</SelectItem>
                  <SelectItem value="case_number">Número</SelectItem>
                  <SelectItem value="parties">Nome</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
              {selectedIds.length > 0 && (
                <span className="text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm whitespace-nowrap">
                  {selectedIds.length} selecionado(s)
                </span>
              )}
              <Button
                onClick={handleBatchSync}
                disabled={isBatchSyncing}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 whitespace-nowrap"
              >
                {isBatchSyncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                <span className="hidden sm:inline">Sincronizar PJe</span>
                <span className="sm:hidden">Sinc.</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <Checkbox
                      checked={cases.length > 0 && selectedIds.length === cases.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3">Título / Número</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                      Carregando processos...
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Nenhum processo encontrado.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr
                      key={c.id}
                      className={cn(
                        'hover:bg-slate-50/50 transition-colors',
                        selectedIds.includes(c.id) && 'bg-primary/5',
                      )}
                    >
                      <td className="px-4 py-3 text-center">
                        <Checkbox
                          checked={selectedIds.includes(c.id)}
                          onCheckedChange={(checked) => handleSelect(c.id, !!checked)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Link
                              to={`/intranet/processos/${c.id}`}
                              className="font-bold text-base text-primary hover:underline"
                            >
                              {c.title || c.parties || 'Sem título'}
                            </Link>
                            {c.lifecycle_status === 'Arquivado' && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 bg-slate-200 text-slate-600"
                              >
                                ARQUIVADO
                              </Badge>
                            )}
                            {getStatusBadge(c)}
                          </div>
                          <div className="flex items-center gap-2 group/copy">
                            <span className="text-slate-600 text-sm font-medium">
                              {c.case_number || 'Sem número / Serviço'}
                            </span>
                            {c.case_number && (
                              <button
                                onClick={() => copyToClipboard(c.case_number)}
                                className="opacity-0 group-hover/copy:opacity-100 transition-opacity"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-primary" />
                              </button>
                            )}
                          </div>
                          <span
                            className="text-slate-400 text-xs mt-0.5 truncate max-w-[300px]"
                            title={c.parties}
                          >
                            {c.parties}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.expand?.client ? (
                            <Link
                              to={`/intranet/clientes/${c.expand.client.id}`}
                              className="text-slate-700 hover:text-primary transition-colors font-medium"
                            >
                              {c.expand.client.name}
                            </Link>
                          ) : (
                            <span className="text-slate-400 italic">Não vinculado</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMetadataCase(c)}
                            title="Editar Metadados"
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </Button>
                          {c.lifecycle_status === 'Arquivado' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(c.id)}
                              title="Excluir Processo"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/intranet/processos/${c.id}`}>
                              Detalhes <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {cases.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Mostrar</span>
                <Select value={perPage.toString()} onValueChange={(v) => setPerPage(Number(v))}>
                  <SelectTrigger className="w-20 h-8 text-xs bg-white">
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-slate-600 font-medium px-2">
                  Página {page} de {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={!!editingMetadataCase}
        onOpenChange={(open) => !open && setEditingMetadataCase(null)}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Metadados</SheetTitle>
            <SheetDescription>Edite os dados principais do processo rapidamente.</SheetDescription>
          </SheetHeader>
          {editingMetadataCase && (
            <form onSubmit={handleSaveMetadata} className="space-y-4 mt-6">
              <div>
                <Label>Título</Label>
                <Input
                  name="title"
                  defaultValue={editingMetadataCase.title}
                  className="font-medium"
                />
              </div>
              <div>
                <Label>Número do Processo</Label>
                <Input name="case_number" defaultValue={editingMetadataCase.case_number} />
              </div>
              <div>
                <Label>Partes</Label>
                <Input name="parties" defaultValue={editingMetadataCase.parties} />
              </div>
              <div>
                <Label>Tribunal</Label>
                <Input name="court" defaultValue={editingMetadataCase.court} />
              </div>
              <div>
                <Label>Data de Distribuição</Label>
                <Input
                  type="date"
                  name="distribution_date"
                  defaultValue={
                    editingMetadataCase.metadata?.distribution_date?.substring(0, 10) ||
                    editingMetadataCase.distribution_date?.substring(0, 10)
                  }
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  name="description"
                  defaultValue={editingMetadataCase.description}
                  className="min-h-[80px]"
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  name="observations"
                  defaultValue={editingMetadataCase.observations}
                  className="min-h-[80px]"
                />
              </div>
              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  name="tags"
                  defaultValue={
                    Array.isArray(editingMetadataCase.tags)
                      ? editingMetadataCase.tags.join(', ')
                      : ''
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                Salvar Alterações
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <CaseFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingCase={null}
        clients={clients}
        collaborators={collaborators}
        onSuccess={loadData}
      />
    </div>
  )
}

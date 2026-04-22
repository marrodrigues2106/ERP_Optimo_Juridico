import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Search, Plus, RefreshCw, ChevronRight, Loader2, Edit, Trash2 } from 'lucide-react'
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
  const [modalOpen, setModalOpen] = useState(false)

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [isBatchSyncing, setIsBatchSyncing] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentCase: '' })
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())

  const [editingMetadataCase, setEditingMetadataCase] = useState<any>(null)

  const [clients, setClients] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])

  const loadData = useCallback(async () => {
    try {
      const orgId = pb.authStore.record?.active_organization
      const filter = `deleted_at = ""${orgId ? ` && organization = "${orgId}"` : ''}`

      const [casesData, clientsData, collabsData] = await Promise.all([
        pb
          .collection('legal_cases')
          .getFullList({ filter, sort: '-created', expand: 'client,responsible_collaborator' }),
        pb.collection('clients').getFullList({ filter }),
        pb.collection('collaborators').getFullList({ filter }),
      ])

      setCases(casesData)
      setClients(clientsData)
      setCollaborators(collabsData)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar processos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('legal_cases', loadData)

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchSearch =
        c.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.parties?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'Todos' || c.lifecycle_status === statusFilter
      return matchSearch && matchStatus
    })
  }, [cases, searchTerm, statusFilter])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCases.map((c) => c.id))
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

  const handleBatchSync = async () => {
    const casesToSync = filteredCases.filter((c) => selectedIds.includes(c.id) && c.case_number)
    if (casesToSync.length === 0)
      return toast({
        title: 'Nenhum processo válido selecionado para sincronizar',
        variant: 'destructive',
      })

    setIsBatchSyncing(true)
    setBatchProgress({ current: 0, total: casesToSync.length, currentCase: '' })

    let successCount = 0

    for (let i = 0; i < casesToSync.length; i++) {
      const c = casesToSync[i]
      setBatchProgress({
        current: i + 1,
        total: casesToSync.length,
        currentCase: c.case_number || 'Sem número',
      })

      setSyncingIds((prev) => new Set(prev).add(c.id))

      try {
        const res = await pb.send(`/backend/v1/sync/all`, {
          method: 'POST',
          body: JSON.stringify({ caseIds: [c.id] }),
        })
        if (res.errors && res.errors.length > 0) {
          toast({
            title: `Erro no processo ${c.case_number}`,
            description: res.errors[0].error,
            variant: 'destructive',
          })
        } else {
          successCount++
        }
      } catch (err: any) {
        const description =
          err?.response?.message || err?.message || 'Erro inesperado na sincronização.'
        toast({
          title: `Erro no processo ${c.case_number}`,
          description,
          variant: 'destructive',
        })
        console.error(`Error syncing case ${c.case_number}`, err)
      } finally {
        setSyncingIds((prev) => {
          const next = new Set(prev)
          next.delete(c.id)
          return next
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 800))
    }

    setIsBatchSyncing(false)
    setSelectedIds([])
    toast({
      title: 'Sincronização em Lote Concluída',
      description: `${successCount} processos sincronizados com sucesso.`,
    })
    loadData()
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
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por número ou parte..."
                  className="pl-9 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Ativo">Ativos</SelectItem>
                  <SelectItem value="Suspenso">Suspensos</SelectItem>
                  <SelectItem value="Arquivado">Arquivados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm">
                  {selectedIds.length} selecionado(s)
                </span>
                <Button onClick={handleBatchSync} disabled={isBatchSyncing}>
                  {isBatchSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sincronizar Selecionados
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <Checkbox
                      checked={
                        filteredCases.length > 0 && selectedIds.length === filteredCases.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3">Número / Partes</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                      Carregando processos...
                    </td>
                  </tr>
                ) : filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Nenhum processo encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c) => (
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
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/intranet/processos/${c.id}`}
                              className="font-bold text-primary hover:underline"
                            >
                              {c.case_number || 'Sem número / Serviço'}
                            </Link>
                            {c.lifecycle_status === 'Arquivado' && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 bg-slate-200 text-slate-600"
                              >
                                ARQUIVADO
                              </Badge>
                            )}
                            {syncingIds.has(c.id) && (
                              <Badge className="bg-indigo-100 text-indigo-800 border-none text-[10px] px-2 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Sincronizando...
                              </Badge>
                            )}
                          </div>
                          <span
                            className="text-slate-500 text-xs mt-0.5 truncate max-w-[300px]"
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

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
import {
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Play,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { CaseFormModal } from './cases/CaseFormModal'
import { cn } from '@/lib/utils'
import { UnifiedSyncButton } from '@/components/intranet/UnifiedSyncButton'

export default function ProcessManager() {
  const { toast } = useToast()
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [modalOpen, setModalOpen] = useState(false)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [syncStatus, setSyncStatus] = useState<
    Record<string, 'pending' | 'syncing' | 'success' | 'error'>
  >({})
  const [isBatchSyncing, setIsBatchSyncing] = useState(false)

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

            {selectedIds.length > 0 ? (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm">
                  {selectedIds.length} selecionado(s)
                </span>
                <UnifiedSyncButton
                  caseIds={selectedIds}
                  label="Sincronizar Lote"
                  variant="default"
                  onComplete={() => {
                    setSelectedIds([])
                    loadData()
                  }}
                />
              </div>
            ) : (
              <UnifiedSyncButton label="Sincronizar Todos Monitorados" />
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
                  filteredCases.map((c) => {
                    const rowSync = syncStatus[c.id]

                    return (
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
                            <Link
                              to={`/intranet/processos/${c.id}`}
                              className="font-bold text-primary hover:underline"
                            >
                              {c.case_number || 'Sem número / Serviço'}
                            </Link>
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
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/intranet/processos/${c.id}`}>
                              Detalhes <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CaseFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingCase={null}
        clients={clients}
        collaborators={collaborators}
      />
    </div>
  )
}

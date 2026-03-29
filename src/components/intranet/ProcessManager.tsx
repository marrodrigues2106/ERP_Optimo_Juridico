import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Trash2, Edit2, Eye, RefreshCw, Filter } from 'lucide-react'
import { getLegalCases, deleteLegalCase, updateLegalCase } from '@/services/legal_cases'
import { getClients } from '@/services/clients'
import { getCollaborators } from '@/services/collaborators'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { categorizeError, runDatajudSync } from '@/lib/datajud/sync'
import { CaseFormModal } from './cases/CaseFormModal'
import { Progress } from '@/components/ui/progress'
import pb from '@/lib/pocketbase/client'

export default function ProcessManager() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [cases, setCases] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<any>(null)
  const [deletingCase, setDeletingCase] = useState<any>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isBatchSyncing, setIsBatchSyncing] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)

  const loadData = async () => {
    try {
      setCases(await getLegalCases())
    } catch (e) {
      console.error('Error loading cases', e)
    }
  }

  useEffect(() => {
    loadData()
    getClients().then(setClients)
    getCollaborators().then(setCollaborators)
  }, [])

  useRealtime('legal_cases', loadData)

  const handleOpenForm = (c: any = null) => {
    setEditingCase(c)
    setFormOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingCase) return
    try {
      await deleteLegalCase(deletingCase.id)
      toast({ title: 'Registro excluído atomicamente com sucesso.' })
    } catch (error) {
      const { category, message } = categorizeError(error)
      toast({
        title: `Falha na Exclusão (${category})`,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDeletingCase(null)
    }
  }

  const handleSyncDatajud = async (c: any) => {
    setSyncingId(c.id)
    try {
      await runDatajudSync(c, () => {})
      toast({ title: 'Sincronização V2 processada.' })
    } catch (error: any) {
      const { category, message } = categorizeError(error)

      let finalMessage = message
      const errStr = String(error?.message || message || '')
      if (
        errStr.includes('permissão de leitura') ||
        errStr.includes('unauthorized') ||
        errStr.includes('403')
      ) {
        finalMessage = `A chave de API do DataJud não possui permissão de leitura para o tribunal selecionado (ex: ${c.court_alias || 'tjrj'}). Verifique as permissões no portal do CNJ.`
      }

      await updateLegalCase(c.id, { datajud_sync_status: 'Error' }).catch(() => null)
      toast({
        title: `Erro de Sincronização (${category})`,
        description: finalMessage,
        variant: 'destructive',
      })
    } finally {
      setSyncingId(null)
    }
  }

  const handleBatchSync = async () => {
    const activeCases = cases.filter((c) => c.lifecycle_status === 'Ativo' && c.type === 'Processo')
    if (activeCases.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Nenhum processo ativo encontrado para sincronizar.',
        variant: 'default',
      })
      return
    }

    setIsBatchSyncing(true)
    setBatchTotal(activeCases.length)
    setBatchProgress(0)
    let success = 0
    let failed = 0

    for (const c of activeCases) {
      try {
        await pb.send(`/backend/v1/datajud/background-sync/${c.id}`, { method: 'POST' })
        success++
      } catch (err) {
        failed++
      }
      setBatchProgress((prev) => prev + 1)
    }

    toast({
      title: 'Sincronização em Lote Concluída',
      description: `${success} processos atualizados, ${failed} falharam.`,
    })
    setIsBatchSyncing(false)
    loadData()
  }

  const filteredCases = cases.filter((c) => {
    const matchSearch =
      (c.parties?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.case_number || '').includes(searchTerm)
    const matchType = typeFilter === 'all' || c.type === typeFilter
    const matchStatus = statusFilter === 'all' || c.lifecycle_status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Gestão de Casos e Serviços</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleBatchSync} disabled={isBatchSyncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isBatchSyncing ? 'animate-spin' : ''}`} />
            {isBatchSyncing ? 'Sincronizando Lote...' : 'Sincronizar Ativos'}
          </Button>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" /> Novo Registro
          </Button>
        </div>
      </div>

      {isBatchSyncing && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex justify-between text-sm font-medium mb-2 text-primary">
              <span>Sincronizando processos ativos no DataJud...</span>
              <span>
                {batchProgress} de {batchTotal}
              </span>
            </div>
            <Progress
              value={batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0}
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-50/50 border-b">
          <CardTitle className="text-lg">Portfólio</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por partes ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Filter className="w-3 h-3 mr-2 text-slate-400" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="Processo">Processo</SelectItem>
                <SelectItem value="Serviço Jurídico">Serviço Jurídico</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Filter className="w-3 h-3 mr-2 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Arquivado">Arquivado</SelectItem>
                <SelectItem value="Suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Identificação & Partes</TableHead>
                <TableHead>Fase / Prazo</TableHead>
                <TableHead>Integração V2</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum caso encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6">
                      <div className="font-medium text-slate-800 line-clamp-1">{c.parties}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${c.type === 'Serviço Jurídico' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}
                        >
                          {c.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {c.case_number || 'Sem número'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{c.status || 'Não informado'}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Status Ciclo: {c.lifecycle_status}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.type === 'Processo' ? (
                        <Badge
                          className={
                            c.datajud_sync_status === 'Synced'
                              ? 'bg-emerald-500 hover:bg-emerald-600'
                              : c.datajud_sync_status === 'Pending'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : c.datajud_sync_status === 'Error'
                                  ? 'bg-red-500 hover:bg-red-600'
                                  : 'bg-slate-300 hover:bg-slate-400'
                          }
                        >
                          {c.datajud_sync_status || 'Pendente'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 whitespace-nowrap">
                      {c.type === 'Processo' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSyncDatajud(c)}
                          disabled={syncingId === c.id}
                          title="Sincronizar (V2)"
                        >
                          <RefreshCw
                            className={`w-4 h-4 text-blue-500 ${syncingId === c.id ? 'animate-spin' : ''}`}
                          />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/intranet/processos/${c.id}`)}
                      >
                        <Eye className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenForm(c)}>
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingCase(c)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CaseFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editingCase={editingCase}
        clients={clients}
        collaborators={collaborators}
        onSuccess={() => setFormOpen(false)}
      />

      <AlertDialog open={!!deletingCase} onOpenChange={(open) => !open && setDeletingCase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação de Exclusão Atômica</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir o caso <strong>{deletingCase?.parties}</strong>.<br />
              <br />
              Esta ação ativará a engine de <b>exclusão em cascata (Cascade Delete)</b>, removendo
              permanentemente o caso e todas as movimentações associadas do banco de dados. Essa
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Confirmar Exclusão
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

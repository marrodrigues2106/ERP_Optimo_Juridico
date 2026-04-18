import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRealtime } from '@/hooks/use-realtime'
import { ShieldAlert, Search } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export default function AuditLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [sourceFilter, setSourceFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.isAdmin === true || user?.role === 'manager'

  const loadData = async () => {
    if (!isAdmin) {
      setAccessDenied(true)
      return
    }
    try {
      let auditFilter = ''
      let procFilter = ''
      const aFilters = []
      const pFilters = []

      if (dateFilter) {
        const start = new Date(dateFilter)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateFilter)
        end.setHours(23, 59, 59, 999)
        const dFilter = `created >= '${start.toISOString()}' && created <= '${end.toISOString()}'`
        aFilters.push(dFilter)
        pFilters.push(dFilter)
      }

      if (aFilters.length > 0) auditFilter = aFilters.join(' && ')
      if (pFilters.length > 0) procFilter = pFilters.join(' && ')

      const [auditRes, processRes] = await Promise.all([
        pb.collection('audit_logs').getList(1, 100, {
          sort: '-created',
          expand: 'user',
          filter: auditFilter,
        }),
        pb.collection('logs_processamento').getList(1, 100, {
          sort: '-created',
          filter: procFilter,
        }),
      ])

      const combined = [
        ...auditRes.items.map((a) => ({
          id: a.id,
          date: a.created,
          source: 'Auditoria',
          user: a.expand?.user?.name || a.expand?.user?.email || 'Sistema',
          action: a.action,
          description: `Collection: ${a.collection_name}`,
          type: a.action === 'delete' ? 'Warning' : 'Info',
        })),
        ...processRes.items.map((p) => {
          let sourceLabel = 'Sistema'
          const etapa = (p.etapa || '').toLowerCase()
          if (etapa.includes('dou')) sourceLabel = 'Busca DOU'
          else if (etapa.includes('pje') || etapa.includes('comunica')) sourceLabel = 'Comunica PJe'
          else if (etapa.includes('monitoramento') || etapa.includes('termo'))
            sourceLabel = 'Monitoramento'

          return {
            id: p.id,
            date: p.created,
            source: sourceLabel,
            user: 'Processo Automático',
            action: p.etapa,
            description: p.mensagem,
            type: p.status === 'Erro' ? 'Error' : p.status === 'Aviso' ? 'Warning' : 'Info',
          }
        }),
      ]

      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      let finalLogs = combined
      if (sourceFilter !== 'all') finalLogs = finalLogs.filter((l) => l.source === sourceFilter)
      if (typeFilter !== 'all') finalLogs = finalLogs.filter((l) => l.type === typeFilter)

      setLogs(finalLogs)
    } catch (e: any) {
      if (e.status === 403 || e.status === 404) {
        setAccessDenied(true)
      }
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [sourceFilter, typeFilter, dateFilter, isAdmin])

  useRealtime('audit_logs', loadData)
  useRealtime('logs_processamento', loadData)

  if (accessDenied) {
    return (
      <Card className="border-red-200 shadow-sm bg-red-50/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Restrito</h2>
          <p className="text-red-600 max-w-md">
            Você não tem permissão para visualizar o painel central de logs. Esta área é restrita a
            administradores.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Configurações</h2>
        <p className="text-sm text-slate-500 mt-1">
          Acesse os logs do sistema e configurações de conta.
        </p>
      </div>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="logs">Logs do Sistema</TabsTrigger>
          <TabsTrigger value="profile" disabled>
            Perfil (Em breve)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-slate-50 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
              <CardTitle className="text-xl">Histórico de Atividades</CardTitle>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-8 h-9 text-sm w-full sm:w-40 bg-white"
                  />
                </div>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-9 w-[200px] bg-white">
                    <SelectValue placeholder="Fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Fontes</SelectItem>
                    <SelectItem value="Auditoria">Auditoria</SelectItem>
                    <SelectItem value="Sistema">Sistema</SelectItem>
                    <SelectItem value="Monitoramento">Monitoramento</SelectItem>
                    <SelectItem value="Busca DOU">Busca DOU</SelectItem>
                    <SelectItem value="Comunica PJe">Comunica PJe</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-[160px] bg-white">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="Info">Informação</SelectItem>
                    <SelectItem value="Warning">Aviso</SelectItem>
                    <SelectItem value="Error">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="pl-6 w-[180px]">Data e Hora</TableHead>
                    <TableHead className="w-[200px]">Fonte</TableHead>
                    <TableHead>Usuário/Motor</TableHead>
                    <TableHead>Ação/Etapa</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        Nenhum log encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="pl-6 whitespace-nowrap text-sm text-slate-600">
                          {new Date(log.date).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">
                            {log.source}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-sm text-slate-800">
                          {log.user}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              log.type === 'Error'
                                ? 'bg-red-100 text-red-700'
                                : log.type === 'Warning'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell
                          className="text-sm text-slate-600 max-w-xs truncate"
                          title={log.description}
                        >
                          {log.description}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

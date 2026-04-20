import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export default function AuditLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [moduleFilter, setModuleFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const loadLogs = async () => {
    let filterStr = 'id != ""'
    if (user?.active_organization) {
      filterStr += ` && (organization = "${user.active_organization}" || organization = "")`
    }
    if (levelFilter !== 'all') {
      filterStr += ` && level = "${levelFilter}"`
    }
    if (moduleFilter !== 'all') {
      filterStr += ` && module = "${moduleFilter}"`
    }

    try {
      const res = await pb.collection('system_logs').getList(1, 100, {
        sort: '-created',
        filter: filterStr,
        expand: 'user',
      })
      setLogs(res.items)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [user?.active_organization, levelFilter, moduleFilter])

  const filteredLogs = logs.filter((log) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      log.message?.toLowerCase().includes(s) ||
      log.module?.toLowerCase().includes(s) ||
      log.details?.collection?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Logs do Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro unificado de ações, sincronizações (PJe/DOU), eventos em background e alterações
          de dados.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Histórico de Eventos</CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar logs..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Módulos</SelectItem>
                  <SelectItem value="Audit">Auditoria</SelectItem>
                  <SelectItem value="PJe Sync">PJe Sync</SelectItem>
                  <SelectItem value="DOU Ingestion">DOU Ingestion</SelectItem>
                  <SelectItem value="Finance">Financeiro</SelectItem>
                  <SelectItem value="System">Sistema</SelectItem>
                </SelectContent>
              </Select>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Níveis</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {filteredLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Nenhum evento encontrado com os filtros atuais.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg bg-slate-50 flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            log.level === 'error'
                              ? 'destructive'
                              : log.level === 'warning'
                                ? 'default'
                                : 'secondary'
                          }
                          className={
                            log.level === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : ''
                          }
                        >
                          {log.level?.toUpperCase() || 'INFO'}
                        </Badge>
                        <Badge variant="outline">{log.module || 'System'}</Badge>
                        <span className="font-semibold text-slate-800">{log.message}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(log.created).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 flex gap-4">
                      {log.expand?.user && (
                        <span>
                          <strong>Usuário:</strong>{' '}
                          {log.expand?.user?.name || log.expand?.user?.email}
                        </span>
                      )}
                      {(log.details?.collection || log.details?.collection_name) && (
                        <span>
                          <strong>Coleção:</strong>{' '}
                          {log.details?.collection || log.details?.collection_name}
                        </span>
                      )}
                      {log.details?.action && (
                        <span>
                          <strong>Ação:</strong> {log.details.action}
                        </span>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 bg-slate-100 p-2 rounded text-xs font-mono text-slate-600 overflow-x-auto max-h-32">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'

export function MonitoringLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [filterModule, setFilterModule] = useState<string>('all')
  const [filterLevel, setFilterLevel] = useState<string>('all')

  const loadData = () => {
    const filters = []
    if (user?.active_organization) {
      filters.push(`(organization = "${user.active_organization}" || organization = "")`)
    }
    if (filterModule !== 'all') filters.push(`module = "${filterModule}"`)
    if (filterLevel !== 'all') filters.push(`level = "${filterLevel}"`)

    const filterStr = filters.join(' && ')

    pb.collection('system_logs')
      .getList(1, 100, { sort: '-created', filter: filterStr, expand: 'user' })
      .then((res) => setLogs(res.items))
      .catch(console.error)
  }

  useEffect(() => {
    loadData()
  }, [user?.active_organization, filterModule, filterLevel])

  useRealtime('system_logs', () => {
    loadData()
  })

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg">Logs do Sistema Unificado</CardTitle>
            <CardDescription>
              Monitoramento central de eventos técnicos, auditoria e sincronização.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Módulos</SelectItem>
                <SelectItem value="PJe Sync">PJe Sync</SelectItem>
                <SelectItem value="DOU Ingestion">DOU Ingestion</SelectItem>
                <SelectItem value="Audit">Auditoria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
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
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[500px] pr-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum log encontrado.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((l) => (
                <div
                  key={l.id}
                  className={`text-sm border-l-4 pl-3 py-2 rounded-r-md bg-slate-50 ${l.level === 'error' ? 'border-red-500' : l.level === 'warning' ? 'border-amber-500' : 'border-blue-500'}`}
                >
                  <div className="flex flex-wrap gap-2 justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-white">
                        {l.module}
                      </Badge>
                      <span className="font-semibold text-slate-800">{l.message}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(l.created).toLocaleString()}
                    </span>
                  </div>
                  {l.details && Object.keys(l.details).length > 0 && (
                    <div className="mt-2 text-xs font-mono bg-slate-100 p-2 rounded text-slate-600 overflow-x-auto">
                      {JSON.stringify(l.details)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

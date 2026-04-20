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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAuth } from '@/hooks/use-auth'

export function MonitoringLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [filterModule, setFilterModule] = useState<string>('all')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<any>(null)

  const loadData = async () => {
    const sysFilters = []
    const pjeFilters = []
    if (user?.active_organization) {
      sysFilters.push(`(organization = "${user.active_organization}" || organization = "")`)
      pjeFilters.push(`(organization = "${user.active_organization}" || organization = "")`)
    }

    if (filterModule !== 'all' && filterModule !== 'PJe Sync') {
      sysFilters.push(`module = "${filterModule}"`)
      pjeFilters.push(`id = "none"`)
    } else if (filterModule === 'PJe Sync') {
      sysFilters.push(`module = "PJe Sync"`)
    }

    if (filterLevel !== 'all') {
      sysFilters.push(`level = "${filterLevel}"`)
      if (filterLevel === 'error') pjeFilters.push(`status = "failed"`)
      else if (filterLevel === 'info') pjeFilters.push(`status = "success"`)
      else pjeFilters.push(`id = "none"`)
    }

    try {
      const [sysRes, pjeRes] = await Promise.all([
        pb
          .collection('system_logs')
          .getList(1, 100, { sort: '-created', filter: sysFilters.join(' && '), expand: 'user' }),
        pb
          .collection('pje_sync_logs')
          .getList(1, 100, { sort: '-created', filter: pjeFilters.join(' && '), expand: 'case' }),
      ])

      const combined = [
        ...sysRes.items.map((i) => ({ ...i, _type: 'system_log' })),
        ...pjeRes.items.map((i) => ({
          ...i,
          _type: 'pje_sync_log',
          module: 'PJe Sync',
          level: i.status === 'failed' ? 'error' : 'info',
          message: `Sincronização PJe: ${i.status === 'failed' ? 'Falha' : 'Sucesso'} ${i.message ? `- ${i.message}` : ''}`,
          details: {
            duration_ms: i.duration,
            case_id: i.case,
            case_number: i.expand?.case?.case_number,
            message: i.message,
            status: i.status,
            raw_record: i,
          },
        })),
      ]
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, 100)

      setLogs(combined)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.active_organization, filterModule, filterLevel])

  useRealtime('system_logs', () => {
    loadData()
  })
  useRealtime('pje_sync_logs', () => {
    loadData()
  })

  return (
    <>
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
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum log encontrado.
              </p>
            ) : (
              <div className="space-y-3">
                {logs.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLog(l)}
                    className={`cursor-pointer transition-colors hover:bg-slate-100 text-sm border-l-4 pl-3 py-2 rounded-r-md bg-slate-50 ${l.level === 'error' ? 'border-red-500' : l.level === 'warning' ? 'border-amber-500' : 'border-blue-500'}`}
                  >
                    <div className="flex flex-wrap gap-2 justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-white">
                          {l.module}
                        </Badge>
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {l.message}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(l.created).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Sheet open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Log</SheetTitle>
            <SheetDescription>Informações completas do evento de sistema.</SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase">
                    Módulo
                  </div>
                  <div className="text-sm mt-1">{selectedLog.module}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Nível</div>
                  <div className="text-sm mt-1">
                    <Badge
                      variant={
                        selectedLog.level === 'error'
                          ? 'destructive'
                          : selectedLog.level === 'warning'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {selectedLog.level}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase">
                    Data/Hora
                  </div>
                  <div className="text-sm mt-1">
                    {new Date(selectedLog.created).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase">
                    Usuário
                  </div>
                  <div className="text-sm mt-1">
                    {selectedLog.expand?.user?.name || selectedLog.expand?.user?.email || 'Sistema'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase">
                  Mensagem
                </div>
                <div className="text-sm mt-1 p-3 bg-slate-50 rounded-md border text-slate-700 break-words">
                  {selectedLog.message}
                </div>
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase mb-1">
                    Detalhes Adicionais (JSON)
                  </div>
                  <pre className="text-[11px] p-3 bg-slate-900 text-green-400 rounded-md overflow-x-auto whitespace-pre-wrap break-all font-mono border border-slate-800 shadow-inner">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

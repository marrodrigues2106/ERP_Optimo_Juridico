import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function AuditLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    let filterStr = 'module = "Audit"'
    if (user?.active_organization) {
      filterStr += ` && (organization = "${user.active_organization}" || organization = "")`
    }
    pb.collection('system_logs')
      .getList(1, 100, { sort: '-created', filter: filterStr, expand: 'user' })
      .then((res) => setLogs(res.items))
      .catch(console.error)
  }, [user?.active_organization])

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Logs de Auditoria</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro unificado de ações e alterações de dados de todo o sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Nenhum evento de auditoria encontrado.
              </p>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg bg-slate-50 flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.details?.action || 'Event'}</Badge>
                        <span className="font-semibold text-slate-800">{log.message}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(log.created).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 flex gap-4">
                      <span>
                        <strong>Usuário:</strong>{' '}
                        {log.expand?.user?.name || log.expand?.user?.email || 'Sistema'}
                      </span>
                      <span>
                        <strong>Coleção:</strong>{' '}
                        {log.details?.collection || log.details?.collection_name || '-'}
                      </span>
                    </div>
                    {log.details?.changes && Object.keys(log.details.changes).length > 0 && (
                      <div className="mt-2 bg-slate-100 p-2 rounded text-xs font-mono text-slate-600 overflow-x-auto">
                        {JSON.stringify(log.details.changes)}
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

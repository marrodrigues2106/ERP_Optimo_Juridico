import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

export function MonitoringLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [ocorrencias, setOcorrencias] = useState<any[]>([])

  useEffect(() => {
    pb.collection('logs_processamento')
      .getList(1, 20, { sort: '-created' })
      .then((res) => setLogs(res.items))
      .catch(console.error)

    pb.collection('ocorrencias_dou')
      .getList(1, 20, { sort: '-created' })
      .then((res) => setOcorrencias(res.items))
      .catch(console.error)
  }, [])

  useRealtime('logs_processamento', (e) => {
    if (e.action === 'create') {
      setLogs((prev) => [e.record, ...prev].slice(0, 20))
    }
  })

  useRealtime('ocorrencias_dou', (e) => {
    if (e.action === 'create') {
      setOcorrencias((prev) => [e.record, ...prev].slice(0, 20))
    }
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ocorrências Recentes (Alertas)</CardTitle>
          <CardDescription>Termos encontrados nos diários oficiais.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {ocorrencias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ocorrência recente.</p>
            ) : (
              <div className="space-y-4">
                {ocorrencias.map((o) => (
                  <div key={o.id} className="border p-3 rounded-lg bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={o.status_alerta === 'pendente' ? 'destructive' : 'default'}>
                        {o.status_alerta || 'Novo'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(o.data_deteccao || o.created).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">Trecho Encontrado:</p>
                    <p className="text-xs text-slate-700 italic line-clamp-3">
                      "{o.trecho_encontrado}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logs do Sistema de Monitoramento</CardTitle>
          <CardDescription>Atividade do motor de busca em tempo real.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum log recente.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((l) => (
                  <div key={l.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">{l.etapa}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(l.data_hora || l.created).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{l.mensagem}</p>
                    <Badge
                      variant={
                        l.status === 'Erro'
                          ? 'destructive'
                          : l.status === 'Aviso'
                            ? 'secondary'
                            : 'outline'
                      }
                      className="mt-1 text-[10px]"
                    >
                      {l.status}
                    </Badge>
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

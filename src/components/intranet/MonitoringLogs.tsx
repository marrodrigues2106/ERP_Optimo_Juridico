import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'

export function MonitoringLogs() {
  const { user } = useAuth()
  const [logsDou, setLogsDou] = useState<any[]>([])
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [logsPje, setLogsPje] = useState<any[]>([])

  const loadData = () => {
    pb.collection('logs_processamento')
      .getList(1, 30, { sort: '-created' })
      .then((res) => setLogsDou(res.items))
      .catch(console.error)

    pb.collection('ocorrencias_dou')
      .getList(1, 30, { sort: '-created' })
      .then((res) => setOcorrencias(res.items))
      .catch(console.error)

    if (user?.active_organization) {
      pb.collection('pje_sync_logs')
        .getList(1, 30, {
          sort: '-created',
          filter: `organization = "${user.active_organization}"`,
          expand: 'case',
        })
        .then((res) => setLogsPje(res.items))
        .catch(console.error)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.active_organization])

  useRealtime('logs_processamento', () => {
    loadData()
  })

  useRealtime('ocorrencias_dou', () => {
    loadData()
  })

  useRealtime('pje_sync_logs', () => {
    loadData()
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
          <CardTitle className="text-lg">Logs do Sistema</CardTitle>
          <CardDescription>Atividade de sincronização em segundo plano.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pje" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="pje">Comunicações PJe</TabsTrigger>
              <TabsTrigger value="dou">Diário Oficial</TabsTrigger>
            </TabsList>

            <TabsContent value="pje">
              <ScrollArea className="h-[340px] pr-4">
                {logsPje.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum log do PJe recente.</p>
                ) : (
                  <div className="space-y-3">
                    {logsPje.map((l) => (
                      <div key={l.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-800">
                            Processo: {l.expand?.case?.case_number || 'Desconhecido'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(l.created).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5 text-xs">{l.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={l.status === 'success' ? 'default' : 'destructive'}
                            className="text-[10px]"
                          >
                            {l.status === 'success' ? 'Sucesso' : 'Falha'}
                          </Badge>
                          {l.duration !== undefined && l.duration !== null && (
                            <span className="text-[10px] text-muted-foreground">
                              {l.duration}ms
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="dou">
              <ScrollArea className="h-[340px] pr-4">
                {logsDou.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum log do DOU recente.</p>
                ) : (
                  <div className="space-y-3">
                    {logsDou.map((l) => (
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

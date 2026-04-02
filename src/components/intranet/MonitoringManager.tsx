import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  ListOrdered,
  Server,
  Search,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function MonitoringManager() {
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.isAdmin
  const [config, setConfig] = useState<any>(null)
  const [terms, setTerms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  const [apiKey, setApiKey] = useState('')
  const [frequency, setFrequency] = useState('Daily')
  const [newTerm, setNewTerm] = useState('')

  const [douPriority, setDouPriority] = useState<string[]>([])
  const [logs, setLogs] = useState<any[]>([])

  const loadData = async () => {
    try {
      const confRes = await pb.collection('monitoring_configs').getFullList()
      if (confRes.length > 0) {
        setConfig(confRes[0])
        setApiKey(confRes[0].apiKey || '')
        setFrequency(confRes[0].frequency || 'Daily')
      }
      const termsRes = await pb.collection('monitoring_terms').getFullList()
      setTerms(termsRes)

      if (isAdmin) {
        const logsRes = await pb
          .collection('logs_processamento')
          .getList(1, 20, { sort: '-created' })
        setLogs(logsRes.items)
        if (confRes[0]?.douCredentials) {
          try {
            const creds =
              typeof confRes[0].douCredentials === 'string'
                ? JSON.parse(confRes[0].douCredentials)
                : confRes[0].douCredentials
            if (creds?.priority) setDouPriority(creds.priority)
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const creds = config?.douCredentials
        ? typeof config.douCredentials === 'string'
          ? JSON.parse(config.douCredentials)
          : config.douCredentials
        : {}
      creds.priority =
        douPriority.length > 0
          ? douPriority
          : ['Public HTTP', 'Ro-DOU/Querido Diário', 'WS-INCom', 'Minimal Scraping']

      const data = { apiKey, frequency, douCredentials: JSON.stringify(creds) }
      if (config?.id) {
        await pb.collection('monitoring_configs').update(config.id, data)
      } else {
        const newConf = await pb.collection('monitoring_configs').create(data)
        setConfig(newConf)
      }
      toast({ title: 'Configurações salvas com sucesso' })
    } catch (err) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTerm) return
    try {
      const data = {
        term: newTerm,
        type: 'DOU',
        active: true,
        user: pb.authStore.record?.id,
      }
      await pb.collection('monitoring_terms').create(data)
      setNewTerm('')
      loadData()
      toast({ title: 'Termo adicionado' })
    } catch (err) {
      toast({ title: 'Erro ao adicionar termo', variant: 'destructive' })
    }
  }

  const handleDeleteTerm = async (id: string) => {
    try {
      await pb.collection('monitoring_terms').delete(id)
      loadData()
      toast({ title: 'Termo removido' })
    } catch (err) {
      toast({ title: 'Erro ao remover termo', variant: 'destructive' })
    }
  }

  const testConnection = async (service: 'datajud' | 'dou') => {
    setTestLoading(true)
    try {
      await pb.send('/backend/v1/monitoring/test-connection', {
        method: 'POST',
        body: JSON.stringify({ service }),
      })
      toast({ title: 'Teste concluído, recarregando status...' })
      setTimeout(loadData, 2000)
    } catch (err) {
      toast({ title: 'Erro ao testar conexão', variant: 'destructive' })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="datajud">
        <TabsList className="mb-4">
          <TabsTrigger value="datajud">DataJud API</TabsTrigger>
          <TabsTrigger value="dou">Monitoramento DOU</TabsTrigger>
          {isAdmin && <TabsTrigger value="diagnostics">Diagnóstico (Admin)</TabsTrigger>}
        </TabsList>

        <TabsContent value="datajud" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração DataJud</CardTitle>
              <CardDescription>Gerencie a integração com a API Pública do CNJ</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveConfig} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Chave da API (API Key)</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="cDZHY..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequência de Sincronização</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    <option value="Hourly">Horária</option>
                    <option value="Daily">Diária</option>
                    <option value="Weekly">Semanal</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={loading}>
                    Salvar Configuração
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testConnection('datajud')}
                    disabled={testLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${testLoading ? 'animate-spin' : ''}`} />{' '}
                    Testar Conexão
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dou" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Termos Monitorados no DOU</CardTitle>
              <CardDescription>
                Cadastre palavras-chave, nomes ou CNPJs para busca diária.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTerm} className="flex gap-3 mb-6">
                <Input
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="Ex: Moraes Rodrigues Advocacia"
                  className="max-w-sm"
                />
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </form>

              <div className="space-y-2 max-w-2xl">
                {terms
                  .filter((t) => t.type === 'DOU')
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 border rounded-md bg-slate-50"
                    >
                      <span className="font-medium text-sm">{t.term}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-8 px-2"
                        onClick={() => handleDeleteTerm(t.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                {terms.filter((t) => t.type === 'DOU').length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum termo cadastrado.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="diagnostics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Status DataJud
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Status Atual</span>
                      {config?.datajudStatus === 'online' ? (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Conectado
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Erro (
                          {config?.datajudStatus || 'Desconhecido'})
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Última Verificação</span>
                      <span>
                        {config?.datajudLastCheckAt
                          ? new Date(config.datajudLastCheckAt).toLocaleString()
                          : 'Nunca'}
                      </span>
                    </div>
                    {config?.datajudLastError && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 rounded-md text-xs font-mono break-all">
                        {config.datajudLastError}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Status DOU / Querido Diário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Status do Coletor</span>
                      {config?.gazetteLastError ? (
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Falha
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Operacional
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Última Sincronização</span>
                      <span>
                        {config?.gazetteLastSync
                          ? new Date(config.gazetteLastSync).toLocaleString()
                          : 'Nunca'}
                      </span>
                    </div>
                    {config?.gazetteLastError && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 rounded-md text-xs font-mono break-all">
                        {config.gazetteLastError}
                      </div>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => testConnection('dou')}
                        disabled={testLoading}
                      >
                        <Server className="w-4 h-4 mr-2" /> Testar DOU
                      </Button>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => toast({ title: 'Sincronização manual iniciada' })}
                      >
                        <Search className="w-4 h-4 mr-2" /> Forçar Sync
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListOrdered className="w-4 h-4" /> Prioridade de Fontes DOU
                  </CardTitle>
                  <CardDescription>Ordem de fallback para extração de diários.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['Public HTTP', 'Ro-DOU/Querido Diário', 'WS-INCom', 'Minimal Scraping'].map(
                      (source, idx) => (
                        <div
                          key={source}
                          className="flex items-center gap-2 p-2 border rounded bg-slate-50 text-sm"
                        >
                          <span className="font-bold text-slate-400">{idx + 1}.</span> {source}
                        </div>
                      ),
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      A prioridade atual é gerenciada automaticamente pelo backend com base na
                      estabilidade da fonte.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Logs de Erro Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b text-slate-500">
                          <th className="pb-2">Data/Hora</th>
                          <th className="pb-2">Fonte</th>
                          <th className="pb-2">Mensagem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-slate-500">
                              Nenhum log de erro recente.
                            </td>
                          </tr>
                        ) : (
                          logs.map((log) => (
                            <tr key={log.id}>
                              <td className="py-2 whitespace-nowrap">
                                {new Date(log.data_hora || log.created).toLocaleString()}
                              </td>
                              <td className="py-2">{log.etapa || 'Sistema'}</td>
                              <td
                                className="py-2 text-red-600 truncate max-w-[200px]"
                                title={log.mensagem}
                              >
                                {log.mensagem}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

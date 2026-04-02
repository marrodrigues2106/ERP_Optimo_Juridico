import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Plus, Trash2 } from 'lucide-react'

export default function MonitoringManager() {
  const { toast } = useToast()
  const [config, setConfig] = useState<any>(null)
  const [terms, setTerms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  const [apiKey, setApiKey] = useState('')
  const [frequency, setFrequency] = useState('Daily')
  const [newTerm, setNewTerm] = useState('')

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
      const data = { apiKey, frequency }
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
          <TabsTrigger value="diagnostics">Diagnóstico</TabsTrigger>
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

        <TabsContent value="diagnostics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

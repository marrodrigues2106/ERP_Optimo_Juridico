import { useState, useEffect } from 'react'
import {
  getMonitoringConfig,
  saveMonitoringConfig,
  getMonitoringTerms,
  createMonitoringTerm,
  updateMonitoringTerm,
  deleteMonitoringTerm,
  syncProcesses,
  syncTerms,
  testExternalConnection,
  getTribunals,
  updateTribunal,
} from '@/services/monitoring'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus, RefreshCw, Search, Wifi, Database, Landmark, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MonitoringManager() {
  const { toast } = useToast()
  const [config, setConfig] = useState<any>(null)
  const [apiKey, setApiKey] = useState('')
  const [frequency, setFrequency] = useState('Daily')
  const [terms, setTerms] = useState<any[]>([])
  const [tribunals, setTribunals] = useState<any[]>([])

  const [newTerm, setNewTerm] = useState('')
  const [newType, setNewType] = useState('DataJud')

  const [loadingSyncP, setLoadingSyncP] = useState(false)
  const [loadingSyncT, setLoadingSyncT] = useState(false)
  const [isTesting, setIsTesting] = useState<string | null>(null)

  const [debugLog, setDebugLog] = useState<{
    service: string
    status: number
    latency: number
    snippet: string
  } | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const cfg = await getMonitoringConfig()
      if (cfg) {
        setConfig(cfg)
        setApiKey(cfg.apiKey)
        setFrequency(cfg.frequency)
      }
      setTerms(await getMonitoringTerms())
      setTribunals(await getTribunals())
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveConfig = async () => {
    try {
      await saveMonitoringConfig(config?.id || null, { apiKey, frequency })
      toast({ title: 'Configurações salvas com sucesso' })
      load()
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTerm) return
    try {
      await createMonitoringTerm({ term: newTerm, type: newType, active: true })
      setNewTerm('')
      load()
      toast({ title: 'Termo adicionado' })
    } catch (e) {
      toast({ title: 'Erro ao adicionar', variant: 'destructive' })
    }
  }

  const toggleTerm = async (t: any) => {
    try {
      await updateMonitoringTerm(t.id, { active: !t.active })
      load()
    } catch (e) {
      console.error('Error toggling term', e)
    }
  }

  const toggleTribunalStatus = async (t: any) => {
    try {
      await updateTribunal(t.id, { active: !t.active })
      load()
    } catch (e) {
      console.error('Error toggling tribunal', e)
    }
  }

  const handleSyncP = async () => {
    setLoadingSyncP(true)
    try {
      await syncProcesses()
      toast({ title: 'Orquestração de Sincronização concluída' })
      load()
    } catch (e) {
      toast({ title: 'Erro ao sincronizar', variant: 'destructive' })
    } finally {
      setLoadingSyncP(false)
    }
  }

  const handleSyncT = async () => {
    setLoadingSyncT(true)
    try {
      const res = await syncTerms()
      toast({ title: `Busca concluída. ${res.discovered || 0} novos alertas gerados.` })
    } catch (e) {
      toast({ title: 'Erro ao sincronizar', variant: 'destructive' })
    } finally {
      setLoadingSyncT(false)
    }
  }

  const handleTest = async (type: 'datajud' | 'tribunal' | 'dou') => {
    setIsTesting(type)
    try {
      const res = await testExternalConnection(type)
      setDebugLog(res)
      toast({ title: `Teste de conexão ${type.toUpperCase()} finalizado.` })
      load()
    } catch (e: any) {
      toast({ title: 'Falha ao testar conexão', variant: 'destructive' })
      setDebugLog({ service: type, status: 0, latency: 0, snippet: `Erro interno: ${e.message}` })
    } finally {
      setIsTesting(null)
    }
  }

  const renderStatusLabel = (status?: number, errStr?: string) => {
    if (status === undefined || status === null) {
      return (
        <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded mt-1.5 inline-block">
          Preparado
        </span>
      )
    }
    if (status >= 200 && status < 300 && !errStr) {
      return (
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded mt-1.5 inline-block">
          Online
        </span>
      )
    }

    let label = 'Offline'
    if (errStr) {
      if (errStr.includes('Authentication Error')) label = 'Erro Auth (401/403)'
      else if (errStr.includes('Invalid Endpoint/Alias')) label = 'Endpoint Inválido (404)'
      else if (errStr.includes('DNS Failure')) label = 'Falha de DNS'
      else if (errStr.includes('Connection Timeout') || errStr.includes('Network Failure'))
        label = 'Timeout / Rede'
      else label = errStr
    }

    return (
      <span
        className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded mt-1.5 inline-block text-center"
        title={errStr}
      >
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-primary tracking-tight">
          Configurações de Monitoramento
        </h2>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="geral">Status & Configurações</TabsTrigger>
          <TabsTrigger value="termos">Termos de Busca</TabsTrigger>
          <TabsTrigger value="tribunais">Tribunais</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Diagnóstico e Fontes de Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg bg-slate-50 text-center shadow-sm flex flex-col items-center justify-center">
                    <Database className="w-5 h-5 text-blue-500 mb-1" />
                    <p className="text-[11px] font-bold text-slate-700">DataJud</p>
                    {renderStatusLabel(config?.lastStatus, config?.lastError)}
                    {config?.lastLatency > 0 && (
                      <p className="text-[9px] mt-1 text-slate-500">{config.lastLatency}ms</p>
                    )}
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 text-center shadow-sm flex flex-col items-center justify-center">
                    <Landmark className="w-5 h-5 text-indigo-500 mb-1" />
                    <p className="text-[11px] font-bold text-slate-700">Tribunais</p>
                    {renderStatusLabel(config?.tribunalStatus, config?.tribunalError)}
                    {config?.tribunalLatency > 0 && (
                      <p className="text-[9px] mt-1 text-slate-500">{config.tribunalLatency}ms</p>
                    )}
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 text-center shadow-sm flex flex-col items-center justify-center">
                    <BookOpen className="w-5 h-5 text-amber-500 mb-1" />
                    <p className="text-[11px] font-bold text-slate-700">DOU</p>
                    {renderStatusLabel(config?.douStatus, config?.douError)}
                    {config?.douLatency > 0 && (
                      <p className="text-[9px] mt-1 text-slate-500">{config.douLatency}ms</p>
                    )}
                  </div>
                </div>

                {config?.updated && (
                  <p className="text-[10px] text-slate-400 text-center font-mono">
                    Última validação: {new Date(config.updated).toLocaleString()}
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t">
                  <span className="text-xs font-semibold text-slate-700 mb-1">
                    Testes de Conexão
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleTest('datajud')}
                      disabled={isTesting !== null}
                    >
                      <Wifi
                        className={cn(
                          'w-3.5 h-3.5 mr-1.5',
                          isTesting === 'datajud' && 'animate-pulse text-amber-500',
                        )}
                      />
                      DataJud
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleTest('tribunal')}
                      disabled={isTesting !== null}
                    >
                      <Landmark
                        className={cn(
                          'w-3.5 h-3.5 mr-1.5',
                          isTesting === 'tribunal' && 'animate-pulse text-amber-500',
                        )}
                      />
                      Tribunais
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleTest('dou')}
                      disabled={isTesting !== null}
                    >
                      <BookOpen
                        className={cn(
                          'w-3.5 h-3.5 mr-1.5',
                          isTesting === 'dou' && 'animate-pulse text-amber-500',
                        )}
                      />
                      DOU
                    </Button>
                  </div>
                </div>

                {debugLog && (
                  <div className="bg-slate-950 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-[200px] shadow-inner border border-slate-800">
                    <div className="flex items-center flex-wrap gap-4 mb-3 border-b border-slate-800 pb-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-[11px] font-bold',
                          debugLog.status >= 200 && debugLog.status < 300
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : 'bg-red-900/50 text-red-400',
                        )}
                      >
                        HTTP {debugLog.status}
                      </span>
                      <span className="text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
                        Alvo: {debugLog.service}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words leading-relaxed">
                      {debugLog.snippet}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Configurações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Chave da API Pública (DataJud)</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Insira a API Key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequência de Busca Automática</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hourly">A cada hora</SelectItem>
                      <SelectItem value="Daily">Diariamente</SelectItem>
                      <SelectItem value="Weekly">Semanalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveConfig} className="w-full">
                  Salvar Configurações
                </Button>

                <div className="pt-5 mt-5 border-t space-y-3">
                  <h3 className="text-sm font-semibold">Gatilhos Manuais</h3>
                  <div className="flex flex-col gap-3">
                    <Button variant="secondary" onClick={handleSyncP} disabled={loadingSyncP}>
                      <RefreshCw className={cn('w-4 h-4 mr-2', loadingSyncP && 'animate-spin')} />
                      Sincronizar Processos Ativos
                    </Button>
                    <Button variant="secondary" onClick={handleSyncT} disabled={loadingSyncT}>
                      <Search className={cn('w-4 h-4 mr-2', loadingSyncT && 'animate-spin')} />
                      Buscar Termos (DataJud e DOU)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="termos">
          <Card>
            <CardHeader>
              <CardTitle>Termos de Pesquisa para Monitoramento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddTerm} className="flex gap-2">
                <Input
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="Novo termo"
                  className="flex-1"
                />
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DataJud">DataJud</SelectItem>
                    <SelectItem value="DOU">DOU</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" size="icon" className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </form>
              <div className="space-y-2 mt-4">
                {terms.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <Switch checked={t.active} onCheckedChange={() => toggleTerm(t)} />
                      <div>
                        <p
                          className={cn(
                            'font-semibold text-sm',
                            !t.active && 'text-slate-400 line-through',
                          )}
                        >
                          {t.term}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                          FONTE: {t.type}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive opacity-70"
                      onClick={() => {
                        deleteMonitoringTerm(t.id).then(load)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tribunais">
          <Card>
            <CardHeader>
              <CardTitle>Tribunais Ativos para Busca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {tribunals.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg transition-colors',
                      t.active ? 'bg-white border-primary/20' : 'bg-slate-50',
                    )}
                  >
                    <Switch checked={t.active} onCheckedChange={() => toggleTribunalStatus(t)} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-xs font-semibold truncate',
                          !t.active && 'text-slate-400',
                        )}
                        title={t.name}
                      >
                        {t.name}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">
                        {t.alias}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

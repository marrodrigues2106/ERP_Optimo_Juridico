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
  testDnsResolution,
  getTribunals,
  updateTribunal,
} from '@/services/monitoring'
import { useRealtime } from '@/hooks/use-realtime'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Wifi,
  Database,
  Landmark,
  BookOpen,
  AlertCircle,
  KeyRound,
  Activity,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MonitoringManager() {
  const { toast } = useToast()
  const [config, setConfig] = useState<any>(null)
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
    errorType?: string
  } | null>(null)

  useEffect(() => {
    load()
  }, [])

  useRealtime('monitoring_configs', (e) => {
    if (e.action === 'update' || e.action === 'create') {
      setConfig(e.record)
    }
  })

  const load = async () => {
    try {
      const cfg = await getMonitoringConfig()
      if (cfg) {
        setConfig(cfg)
        setFrequency(cfg.frequency || 'Daily')
      }
      setTerms(await getMonitoringTerms())
      setTribunals(await getTribunals())
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveConfig = async () => {
    try {
      await saveMonitoringConfig(config?.id || null, { frequency })
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
    } catch (e: any) {
      toast({ title: 'Falha ao testar conexão', variant: 'destructive' })
      setDebugLog({
        service: type,
        status: 0,
        latency: 0,
        snippet: `Erro interno: ${e.message}`,
        errorType: 'INTERNAL_ERROR',
      })
    } finally {
      setIsTesting(null)
    }
  }

  const handleDnsTest = async () => {
    setIsTesting('dns')
    try {
      const res = await testDnsResolution()
      const isReady = res.resolved && res.port443_reachable
      const isDnsFail = res.error === 'DNS_FAILURE'

      setDebugLog({
        service: 'system-dns',
        status: isReady ? 200 : 0,
        latency: res.latency,
        snippet: isReady
          ? `Status: Network Ready\nConectividade validada: DNS e porta 443 operacionais para DataJud.\n\nRaw:\n${JSON.stringify(res, null, 2)}`
          : isDnsFail
            ? `Status: DNS Failure\nFalha ao resolver o domínio no backend (Verifique resolv.conf / Nameservers).\n\nRaw:\n${JSON.stringify(res, null, 2)}`
            : `Status: Infra Error (${res.error})\n\nRaw:\n${JSON.stringify(res, null, 2)}`,
        errorType: res.error || (isReady ? 'online' : 'OFFLINE'),
      })
      toast({
        title: isReady ? 'Network Ready' : isDnsFail ? 'DNS Failure' : 'Network Error',
        variant: isReady ? 'default' : 'destructive',
      })
    } catch (e: any) {
      toast({ title: 'Falha ao testar DNS', variant: 'destructive' })
      setDebugLog({
        service: 'system-dns',
        status: 0,
        latency: 0,
        snippet: `Erro interno: ${e.message}`,
        errorType: 'INTERNAL_ERROR',
      })
    } finally {
      setIsTesting(null)
    }
  }

  const renderDataJudStatusLabel = () => {
    const status = config?.datajudStatus
    const errorStr = config?.datajudLastError

    if (!status) {
      return (
        <Badge variant="secondary" className="mt-2 text-[10px]">
          Preparado
        </Badge>
      )
    }

    if (status === 'online') {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 mt-2 text-[10px]">Online</Badge>
    }

    const labels: Record<string, string> = {
      API_KEY_MISSING: 'Chave Ausente',
      ENDPOINT_INVALID: 'Endpoint Inválido',
      AUTH_FAILURE: 'Erro Autenticação',
      DNS_FAILURE: 'Falha de DNS',
      NETWORK_TIMEOUT: 'Tempo Limite',
      CONNECTION_REFUSED: 'Conexão Recusada',
      NETWORK_FAILURE: 'Falha de Rede',
      HTTP_STATUS_ERRORS: 'Erro HTTP',
    }

    const label = labels[status] || status
    const isInfraError =
      status === 'DNS_FAILURE' || status === 'NETWORK_TIMEOUT' || status === 'CONNECTION_REFUSED'
    const isWarning = status === 'API_KEY_MISSING' || status === 'ENDPOINT_INVALID'

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isWarning ? 'default' : 'destructive'}
              className={cn(
                'mt-2 text-[10px] truncate max-w-[120px] cursor-help',
                isWarning ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : '',
                isInfraError ? 'bg-red-600 hover:bg-red-700 text-white border-transparent' : '',
              )}
            >
              {label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent
            className={cn(
              isWarning
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-red-50 text-red-900 border-red-200',
              'p-3 max-w-[280px]',
            )}
          >
            <p className="font-semibold text-xs mb-1">Diagnóstico do Erro</p>
            <p className="text-xs break-words">{errorStr || `Erro de Conexão`}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const renderStatusLabel = (status?: number, errStr?: string) => {
    if (status === undefined || status === null) {
      return (
        <Badge variant="secondary" className="mt-2 text-[10px]">
          Preparado
        </Badge>
      )
    }
    if (status >= 200 && status < 300 && !errStr) {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 mt-2 text-[10px]">Online</Badge>
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="destructive"
              className="mt-2 text-[10px] truncate max-w-[100px] cursor-help"
            >
              Offline
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-red-50 text-red-900 border-red-200 p-3 max-w-[280px]">
            <p className="font-semibold text-xs mb-1">Diagnóstico do Erro</p>
            <p className="text-xs break-words">{errStr || `HTTP Error ${status}`}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const isInfraError = ['DNS_FAILURE', 'NETWORK_TIMEOUT', 'CONNECTION_REFUSED'].includes(
    config?.datajudStatus,
  )
  const isApiError = ['API_KEY_MISSING', 'ENDPOINT_INVALID', 'AUTH_FAILURE'].includes(
    config?.datajudStatus,
  )

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
          {isInfraError && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-50 text-red-900">
              <Activity className="h-4 w-4 text-red-600" />
              <AlertTitle>Infraestrutura / DNS Error ({config?.datajudStatus})</AlertTitle>
              <AlertDescription>
                {config?.datajudStatus === 'DNS_FAILURE' ? (
                  <>
                    Falha de resolução DNS no container. O backend não consegue localizar{' '}
                    <code>api-publica.datajud.cnj.jus.br</code>.
                  </>
                ) : (
                  <>
                    Falha na camada de rede ao tentar contatar o servidor do DataJud:{' '}
                    <strong>{config?.datajudLastError}</strong>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!isInfraError && !isApiError && config?.datajudStatus === 'online' && (
            <Alert className="border-emerald-500/50 bg-emerald-50 text-emerald-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <AlertTitle>Network Ready</AlertTitle>
              <AlertDescription>
                A conectividade com o DataJud está operacional. Resolução DNS e HTTPS verificados.
              </AlertDescription>
            </Alert>
          )}

          {isApiError && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-50 text-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Alerta de API DataJud ({config?.datajudStatus})</AlertTitle>
              <AlertDescription>
                A sincronização falhou devido a credenciais ou configuração incorreta:{' '}
                <strong>{config?.datajudLastError}</strong>
              </AlertDescription>
            </Alert>
          )}

          {!isInfraError &&
            !isApiError &&
            config?.datajudStatus &&
            config.datajudStatus !== 'online' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro na Integração DataJud</AlertTitle>
                <AlertDescription>{config?.datajudLastError}</AlertDescription>
              </Alert>
            )}

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
                    {renderDataJudStatusLabel()}
                    {config?.lastLatency > 0 && config?.datajudStatus === 'online' && (
                      <p className="text-[9px] mt-1 text-slate-500 font-mono">
                        {config.lastLatency}ms
                      </p>
                    )}
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 text-center shadow-sm flex flex-col items-center justify-center">
                    <Landmark className="w-5 h-5 text-indigo-500 mb-1" />
                    <p className="text-[11px] font-bold text-slate-700">Tribunais</p>
                    {renderStatusLabel(config?.tribunalStatus, config?.tribunalError)}
                    {config?.tribunalLatency > 0 && (
                      <p className="text-[9px] mt-1 text-slate-500 font-mono">
                        {config.tribunalLatency}ms
                      </p>
                    )}
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 text-center shadow-sm flex flex-col items-center justify-center">
                    <BookOpen className="w-5 h-5 text-amber-500 mb-1" />
                    <p className="text-[11px] font-bold text-slate-700">DOU</p>
                    {renderStatusLabel(config?.douStatus, config?.douError)}
                    {config?.douLatency > 0 && (
                      <p className="text-[9px] mt-1 text-slate-500 font-mono">
                        {config.douLatency}ms
                      </p>
                    )}
                  </div>
                </div>

                {config?.datajudLastCheckAt && (
                  <p className="text-[10px] text-slate-400 text-center font-mono">
                    Última checagem DataJud: {new Date(config.datajudLastCheckAt).toLocaleString()}
                  </p>
                )}

                {config?.datajud_tribunal_status &&
                  Object.keys(config.datajud_tribunal_status).length > 0 && (
                    <div className="pt-3 border-t space-y-2">
                      <span className="text-xs font-semibold text-slate-700 block">
                        Status por Tribunal (Última Sync)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(config.datajud_tribunal_status).map(([alias, st]) => (
                          <Badge
                            key={alias}
                            variant="outline"
                            className={cn(
                              'text-[10px] uppercase',
                              st === 'ok'
                                ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                                : 'border-red-500 text-red-700 bg-red-50',
                            )}
                          >
                            {alias}: {st as string}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex flex-col gap-2 pt-3 border-t">
                  <span className="text-xs font-semibold text-slate-700 mb-1">
                    Testes de Conexão
                  </span>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleTest('datajud')}
                      disabled={isTesting !== null}
                    >
                      <Wifi
                        className={cn(
                          'w-3.5 h-3.5 mr-1.5',
                          isTesting === 'datajud' && 'animate-pulse text-amber-500',
                        )}
                      />
                      DataJud API
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={handleDnsTest}
                      disabled={isTesting !== null}
                    >
                      <Activity
                        className={cn(
                          'w-3.5 h-3.5 mr-1.5',
                          isTesting === 'dns' && 'animate-pulse text-indigo-500',
                        )}
                      />
                      Diag. de Rede / DNS
                    </Button>
                  </div>
                  <div className="flex gap-2">
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
                          debugLog.status >= 200 &&
                            debugLog.status < 300 &&
                            (!debugLog.errorType || debugLog.errorType === 'online')
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : 'bg-red-900/50 text-red-400',
                        )}
                      >
                        {debugLog.errorType && debugLog.errorType !== 'online'
                          ? debugLog.errorType
                          : `HTTP ${debugLog.status}`}
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
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Autenticação DataJud (API Key)
                  </Label>
                  <div className="rounded-md bg-muted/50 p-3 border text-sm text-muted-foreground">
                    A chave de acesso ao DataJud agora é gerenciada de forma segura através de{' '}
                    <strong>Variáveis de Ambiente / Secrets (DATAJUD_API_KEY)</strong>.
                  </div>
                  {config?.datajudStatus === 'API_KEY_MISSING' && (
                    <p className="text-xs text-amber-600 font-medium mt-1 flex items-center bg-amber-50 p-2 rounded border border-amber-200">
                      <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                      Atenção: O Secret 'DATAJUD_API_KEY' não está configurado. A integração
                      falhará.
                    </p>
                  )}
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tribunais Ativos para Busca</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    Promise.all(
                      tribunals.map((t) =>
                        !t.active ? updateTribunal(t.id, { active: true }) : Promise.resolve(),
                      ),
                    ).then(load)
                  }}
                >
                  Selecionar Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    Promise.all(
                      tribunals.map((t) =>
                        t.active ? updateTribunal(t.id, { active: false }) : Promise.resolve(),
                      ),
                    ).then(load)
                  }}
                >
                  Desmarcar Todos
                </Button>
              </div>
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

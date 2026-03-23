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
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus, RefreshCw, Search, Activity, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MonitoringManager() {
  const { toast } = useToast()
  const [config, setConfig] = useState<any>(null)
  const [apiKey, setApiKey] = useState('')
  const [frequency, setFrequency] = useState('Daily')
  const [terms, setTerms] = useState<any[]>([])

  const [newTerm, setNewTerm] = useState('')
  const [newType, setNewType] = useState('DataJud')

  const [loadingSyncP, setLoadingSyncP] = useState(false)
  const [loadingSyncT, setLoadingSyncT] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

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
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveConfig = async () => {
    try {
      await saveMonitoringConfig(config?.id || null, { apiKey, frequency })
      toast({ title: 'Configurações salvas com sucesso' })
      load()
      handleTest('datajud') // Trigger validation automatically
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
      console.error(e)
    }
  }

  const handleSyncP = async () => {
    setLoadingSyncP(true)
    try {
      await syncProcesses()
      toast({ title: 'Sincronização de processos iniciada' })
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

  const handleTest = async (type: 'datajud' | 'dou') => {
    setIsTesting(true)
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
        snippet: `Erro interno ao executar teste: ${e.message}`,
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-primary tracking-tight">
          Monitoramento Automatizado
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Configurações Gerais & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 flex-1">
            <div className="space-y-2">
              <Label>Chave da API (DataJud)</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Insira a API Key"
              />
              <p className="text-[11px] text-muted-foreground">
                Deixe em branco para usar credenciais padrão do sistema.
              </p>
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
              <h3 className="text-sm font-semibold">Sincronização Manual</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleSyncP}
                  disabled={loadingSyncP}
                >
                  <RefreshCw className={cn('w-4 h-4 mr-2', loadingSyncP && 'animate-spin')} />{' '}
                  Processos Ativos
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleSyncT}
                  disabled={loadingSyncT}
                >
                  <Search className={cn('w-4 h-4 mr-2', loadingSyncT && 'animate-spin')} /> Buscar
                  Termos
                </Button>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Diagnóstico de Conexão (Debug)
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleTest('datajud')}
                  disabled={isTesting}
                >
                  <Wifi
                    className={cn('w-4 h-4 mr-2', isTesting && 'animate-pulse text-amber-500')}
                  />{' '}
                  Testar DataJud
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleTest('dou')}
                  disabled={isTesting}
                >
                  <Wifi
                    className={cn('w-4 h-4 mr-2', isTesting && 'animate-pulse text-amber-500')}
                  />{' '}
                  Testar DOU
                </Button>
              </div>

              {debugLog && (
                <div className="bg-slate-950 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-[300px] mt-4 shadow-inner border border-slate-800">
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
                    <span className="text-slate-400 ml-auto">Latência: {debugLog.latency}ms</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words leading-relaxed">
                    {debugLog.snippet}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Termos de Pesquisa (Monitoramento)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col">
            <form onSubmit={handleAddTerm} className="flex gap-2">
              <Input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Novo termo (ex: nome da empresa, OAB)"
                className="flex-1"
              />
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-[100px] sm:w-28">
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

            <div className="space-y-2 flex-1 overflow-y-auto pr-2 mt-4 min-h-[200px] max-h-[500px]">
              {terms.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Switch checked={t.active} onCheckedChange={() => toggleTerm(t)} />
                    <div>
                      <p
                        className={cn(
                          'font-semibold text-sm text-slate-800',
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
                    className="text-destructive opacity-70 hover:opacity-100"
                    onClick={async () => {
                      await deleteMonitoringTerm(t.id)
                      load()
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {terms.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <Search className="w-8 h-8 opacity-20" />
                  <p className="text-sm">Nenhum termo configurado.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

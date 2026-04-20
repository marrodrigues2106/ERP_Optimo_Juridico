import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Save, X, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { syncProcesses, syncTerms } from '@/services/monitoring'
import { MonitoringLogs } from './MonitoringLogs'

export default function MonitoringManager() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.isAdmin || user?.role === 'manager'
  const { toast } = useToast()

  const [config, setConfig] = useState<any>(null)

  // Config
  const [datajudApiKey, setDatajudApiKey] = useState('')
  const [frequency, setFrequency] = useState('Daily')
  const [syncProcessos, setSyncProcessos] = useState(true)
  const [rodouExactSearch, setRodouExactSearch] = useState(false)
  const [rodouIgnoreSignature, setRodouIgnoreSignature] = useState(true)
  const [rodouExcludedDepts, setRodouExcludedDepts] = useState('')
  const [rodouSections, setRodouSections] = useState<string[]>(['1', '2', '3', 'Extra'])
  const [qdTerritoryId, setQdTerritoryId] = useState('')
  const [tribunais, setTribunais] = useState<string[]>([])
  const [tribunalsList, setTribunalsList] = useState<any[]>([])

  // Terms
  const [termos, setTermos] = useState<any[]>([])
  const [novoTermo, setNovoTermo] = useState('')
  const [tipoTermo, setTipoTermo] = useState('palavra-chave')
  const [termosIgnorados, setTermosIgnorados] = useState('')

  // Alerts
  const [alertConfigId, setAlertConfigId] = useState<string | null>(null)
  const [alertType, setAlertType] = useState('app')
  const [alertFreq, setAlertFreq] = useState('diario')

  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncLog, setLastSyncLog] = useState<any>(null)

  const loadData = async () => {
    try {
      try {
        const logRecords = await pb.collection('logs_processamento').getList(1, 1, {
          sort: '-created',
          filter: "etapa ~ 'Conexão HTTP'",
        })
        if (logRecords.items.length > 0) {
          setLastSyncLog(logRecords.items[0])
        }
      } catch (e) {
        // ignore error
      }

      const tribs = await pb.collection('tribunals').getFullList({ sort: 'name' })
      setTribunalsList(tribs)

      const records = await pb.collection('monitoring_configs').getFullList()
      if (records.length > 0) {
        const c = records[0]
        setConfig(c)
        setDatajudApiKey(c.apiKey || '')
        setFrequency(c.frequency || 'Daily')
        setSyncProcessos(c.sync_processos ?? true)
        setTribunais((c.tribunais || []).map((t: string) => t.toLowerCase()))

        setRodouExactSearch(c.is_exact_search ?? false)
        setRodouIgnoreSignature(c.ignore_signature_match ?? true)
        setRodouExcludedDepts(c.department_ignore || '')
        setRodouSections((c.dou_sections || '1,2,3,Extra').split(',').filter(Boolean))
        setQdTerritoryId(c.territory_id || '')
      }

      if (user?.id) {
        const tList = await pb
          .collection('termos_monitorados')
          .getFullList({ filter: `usuario_id = "${user.id}"` })
        setTermos(tList)

        const aConf = await pb
          .collection('configuracoes_alerta')
          .getFullList({ filter: `usuario_id = "${user.id}"` })
        if (aConf.length > 0) {
          setAlertConfigId(aConf[0].id)
          setAlertType(aConf[0].tipo_notificacao || 'app')
          setAlertFreq(aConf[0].frequencia || 'diario')
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-white rounded-xl border">
        Você não tem permissão para acessar as configurações de Monitoramento.
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        apiKey: datajudApiKey,
        frequency,
        sync_processos: syncProcessos,
        tribunais: tribunais.map((t) => t.toLowerCase()),
        is_exact_search: rodouExactSearch,
        ignore_signature_match: rodouIgnoreSignature,
        department_ignore: rodouExcludedDepts,
        dou_sections: rodouSections.join(','),
        territory_id: qdTerritoryId,
      }

      if (config?.id) await pb.collection('monitoring_configs').update(config.id, payload)
      else await pb.collection('monitoring_configs').create(payload)

      if (user?.id) {
        const aData = {
          usuario_id: user.id,
          tipo_notificacao: alertType,
          frequencia: alertFreq,
          ativo: true,
        }
        if (alertConfigId) await pb.collection('configuracoes_alerta').update(alertConfigId, aData)
        else await pb.collection('configuracoes_alerta').create(aData)
      }

      toast({ title: 'Configurações salvas com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddTermo = async () => {
    if (!novoTermo.trim()) return
    try {
      await pb.collection('termos_monitorados').create({
        termo: novoTermo,
        tipo_termo: tipoTermo,
        termos_ignorados: termosIgnorados,
        ativo: true,
        usuario_id: user?.id,
      })
      setNovoTermo('')
      setTermosIgnorados('')
      loadData()
      toast({ title: 'Termo adicionado.' })
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar', description: err.message, variant: 'destructive' })
    }
  }

  const handleRunSearch = async () => {
    if (!datajudApiKey && syncProcessos) {
      toast({
        title: 'Configuração incompleta',
        description:
          'A chave da API DataJud não está configurada. A busca de andamentos pode não retornar resultados.',
        variant: 'destructive',
      })
    }

    if (termos.length === 0) {
      toast({
        title: 'Sem termos de busca',
        description: 'Adicione ao menos um termo de busca antes de executar a sincronização.',
        variant: 'destructive',
      })
      return
    }

    setSyncing(true)
    try {
      const res = (await syncTerms()) as any
      if (res && res.success === false) {
        toast({
          title: 'Aviso',
          description: res.error || 'A sincronização foi concluída com ressalvas.',
          variant: 'destructive',
        })
        return
      }
      await syncProcesses()
      toast({ title: 'Sincronização unificada concluída com sucesso!' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Monitoramento Unificado</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie termos e filtros para buscas no Diário Oficial e andamentos do DataJud em uma
          única interface.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Termos de Busca</CardTitle>
            <CardDescription>
              Estes termos serão monitorados em todas as fontes oficiais de forma combinada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-lg border">
              <div className="md:col-span-2 space-y-2">
                <Label>Termo Principal</Label>
                <Input
                  placeholder="Ex: (licitação | pregão) & fraude"
                  value={novoTermo}
                  onChange={(e) => setNovoTermo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipoTermo} onValueChange={setTipoTermo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="palavra-chave">Palavra-chave</SelectItem>
                    <SelectItem value="frase">Frase Exata</SelectItem>
                    <SelectItem value="regex">RegEx Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" onClick={handleAddTermo}>
                Adicionar
              </Button>
              <div className="md:col-span-4 space-y-2 mt-2">
                <Label>Termos Ignorados (Opcional, separados por vírgula)</Label>
                <Input
                  placeholder="Ex: indeferido, cancelado"
                  value={termosIgnorados}
                  onChange={(e) => setTermosIgnorados(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              {termos.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between border p-3 rounded-lg bg-white"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{t.termo}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {t.tipo_termo}
                      </Badge>
                    </div>
                    {t.termos_ignorados && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Ignorar: {t.termos_ignorados}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Switch
                      checked={t.ativo}
                      onCheckedChange={() => {
                        pb.collection('termos_monitorados').update(t.id, { ativo: !t.ativo })
                        loadData()
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        pb.collection('termos_monitorados').delete(t.id)
                        loadData()
                      }}
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {termos.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  Nenhum termo configurado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtros Avançados (Diários)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Seções do DOU</Label>
                <div className="flex flex-wrap gap-4">
                  {['1', '2', '3', 'Extra'].map((sec) => (
                    <div key={sec} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sec-${sec}`}
                        checked={rodouSections.includes(sec)}
                        onCheckedChange={(c) => {
                          if (c) {
                            setRodouSections([...rodouSections, sec])
                          } else {
                            setRodouSections(rodouSections.filter((s) => s !== sec))
                          }
                        }}
                      />
                      <label htmlFor={`sec-${sec}`} className="text-sm cursor-pointer">
                        Seção {sec}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Departamento a Ignorar</Label>
                <Input
                  placeholder="Ex: Secretaria de Saúde"
                  value={rodouExcludedDepts}
                  onChange={(e) => setRodouExcludedDepts(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Territory ID (Querido Diário)</Label>
                <Input
                  placeholder="Ex: 3550308"
                  value={qdTerritoryId}
                  onChange={(e) => setQdTerritoryId(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between border p-3 rounded-lg bg-slate-50">
                <Label className="text-sm">Busca Exata</Label>
                <Switch checked={rodouExactSearch} onCheckedChange={setRodouExactSearch} />
              </div>
              <div className="flex items-center justify-between border p-3 rounded-lg bg-slate-50">
                <Label className="text-sm">Ignorar Assinaturas</Label>
                <Switch checked={rodouIgnoreSignature} onCheckedChange={setRodouIgnoreSignature} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações de Sincronização (PJe / DataJud)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Token PJe (Bearer) / Chave API DataJud</Label>
                <Input
                  type="password"
                  value={datajudApiKey}
                  onChange={(e) => setDatajudApiKey(e.target.value)}
                  placeholder="Insira o Token Bearer ou Chave de API"
                />
                <p className="text-xs text-muted-foreground">
                  Utilizado para a sincronização de andamentos do PJe.
                </p>
              </div>
              <div className="flex items-center justify-between border p-3 rounded-lg bg-slate-50">
                <div>
                  <Label className="text-sm">Auto-Sync Processos</Label>
                  <p className="text-xs text-muted-foreground">
                    Atualizar andamentos periodicamente.
                  </p>
                </div>
                <Switch checked={syncProcessos} onCheckedChange={setSyncProcessos} />
              </div>
              <div className="space-y-2 pt-2">
                <Label>Tribunais Ativos</Label>
                <div className="grid grid-cols-2 gap-2 border p-3 rounded-lg bg-slate-50 max-h-[150px] overflow-y-auto">
                  {tribunalsList.map((t) => (
                    <div key={t.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tribunal-${t.id}`}
                        checked={tribunais.includes(t.alias?.toLowerCase())}
                        onCheckedChange={(c) => {
                          if (c) {
                            setTribunais([...tribunais, t.alias?.toLowerCase()])
                          } else {
                            setTribunais(tribunais.filter((x) => x !== t.alias?.toLowerCase()))
                          }
                        }}
                      />
                      <label htmlFor={`tribunal-${t.id}`} className="text-xs cursor-pointer">
                        {t.alias?.toLowerCase()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas e Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Canal de Alerta</Label>
                <Select value={alertType} onValueChange={setAlertType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app">Apenas no App</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={alertFreq} onValueChange={setAlertFreq}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imediato">Imediato (Push na hora)</SelectItem>
                    <SelectItem value="diario">Resumo Diário (Digest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saúde dos Serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                  <div className="overflow-hidden mr-2">
                    <div className="font-semibold text-sm">Integração DataJud</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Última check:{' '}
                      {config?.datajudLastCheckAt
                        ? new Date(config.datajudLastCheckAt).toLocaleString()
                        : 'N/A'}
                    </div>
                    {config?.datajudLastError && (
                      <div
                        className="text-xs text-red-500 mt-1 truncate"
                        title={config.datajudLastError}
                      >
                        Erro: {config.datajudLastError}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={
                      config?.datajudStatus === 'online'
                        ? 'default'
                        : config?.datajudStatus === 'error'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className={
                      config?.datajudStatus === 'online'
                        ? 'bg-emerald-500 hover:bg-emerald-600 shrink-0'
                        : 'shrink-0'
                    }
                  >
                    {config?.datajudStatus === 'online'
                      ? 'Operacional'
                      : config?.datajudStatus === 'error'
                        ? 'Falha'
                        : 'Desconhecido'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                  <div className="overflow-hidden mr-2">
                    <div className="font-semibold text-sm">Diário Oficial</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Último proc.:{' '}
                      {lastSyncLog ? new Date(lastSyncLog.created).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <Badge
                    variant={
                      lastSyncLog?.status === 'Sucesso'
                        ? 'default'
                        : lastSyncLog?.status === 'Erro'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className={
                      lastSyncLog?.status === 'Sucesso'
                        ? 'bg-emerald-500 hover:bg-emerald-600 shrink-0'
                        : 'shrink-0'
                    }
                  >
                    {lastSyncLog?.status || 'Desconhecido'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t gap-4">
          <div className="text-xs text-muted-foreground flex flex-col bg-slate-50 p-2 rounded w-full sm:w-auto border">
            <strong className="text-slate-700 mb-1">Status da Integração DOU</strong>
            {lastSyncLog ? (
              <>
                <span className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${lastSyncLog.status === 'Sucesso' ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                  Última tentativa: {new Date(lastSyncLog.created).toLocaleString()}
                </span>
                <span
                  className="text-slate-500 mt-1 break-all max-w-[300px] truncate"
                  title={lastSyncLog.mensagem}
                >
                  {lastSyncLog.status} -{' '}
                  {lastSyncLog.mensagem.split('|')[1]?.trim() || lastSyncLog.mensagem}
                </span>
              </>
            ) : (
              <span>Nenhum log de conexão recente.</span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 sm:flex-none"
              onClick={handleRunSearch}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Busca Manual'}
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={submitting}>
              <Save className="w-4 h-4 mr-2" />{' '}
              {submitting ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-8">
        <MonitoringLogs />
      </div>
    </div>
  )
}

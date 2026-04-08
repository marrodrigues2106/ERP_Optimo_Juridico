import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Save, X, RefreshCw, Search } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { testExternalConnection, syncProcesses } from '@/services/monitoring'
import { MonitoringLogs } from './MonitoringLogs'

export default function MonitoringManager() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.isAdmin || user?.role === 'manager'
  const { toast } = useToast()

  const [config, setConfig] = useState<any>(null)

  // Ro-DOU Specific Settings
  const [rodouSections, setRodouSections] = useState<string[]>(['1', '2', '3', 'Extra'])
  const [rodouExactSearch, setRodouExactSearch] = useState(false)
  const [rodouIgnoreSignature, setRodouIgnoreSignature] = useState(true)
  const [rodouIncludedDepts, setRodouIncludedDepts] = useState('')
  const [rodouExcludedDepts, setRodouExcludedDepts] = useState('')
  const [rodouPubType, setRodouPubType] = useState('')
  const [qdTerritoryId, setQdTerritoryId] = useState('')
  const [qdTerritoryName, setQdTerritoryName] = useState('')

  // Advanced Terms
  const [termosAvancados, setTermosAvancados] = useState<any[]>([])
  const [novoTermoAdv, setNovoTermoAdv] = useState('')
  const [tipoTermoAdv, setTipoTermoAdv] = useState('palavra-chave')
  const [termosIgnoradosAdv, setTermosIgnoradosAdv] = useState('')

  // DataJud
  const [datajudApiKey, setDatajudApiKey] = useState('')
  const [frequency, setFrequency] = useState('Daily')
  const [syncProcessos, setSyncProcessos] = useState(true)
  const [termosBusca, setTermosBusca] = useState<string[]>([])
  const [termoInput, setTermoInput] = useState('')
  const [tribunais, setTribunais] = useState<string[]>([])
  const [tribunalsList, setTribunalsList] = useState<any[]>([])

  // Alerts
  const [alertConfigId, setAlertConfigId] = useState<string | null>(null)
  const [alertType, setAlertType] = useState('app')
  const [alertFreq, setAlertFreq] = useState('diario')

  const [submitting, setSubmitting] = useState(false)
  const [testingDatajud, setTestingDatajud] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const loadData = async () => {
    try {
      const tribs = await pb.collection('tribunals').getFullList({ sort: 'name' })
      setTribunalsList(tribs)

      const records = await pb.collection('monitoring_configs').getFullList()
      if (records.length > 0) {
        const c = records[0]
        setConfig(c)
        setDatajudApiKey(c.apiKey || '')
        setFrequency(c.frequency || 'Daily')
        setSyncProcessos(c.sync_processos ?? true)
        setTermosBusca(c.termos_busca || [])
        setTribunais((c.tribunais || []).map((t: string) => t.toLowerCase()))

        if (c.douCredentials) {
          setRodouSections(c.douCredentials.sections || ['1', '2', '3', 'Extra'])
          setRodouExactSearch(c.douCredentials.exactSearch || false)
          setRodouIgnoreSignature(c.douCredentials.ignoreSignature ?? true)
          setRodouIncludedDepts(c.douCredentials.includedDepts || '')
          setRodouExcludedDepts(c.douCredentials.excludedDepts || '')
          setRodouPubType(c.douCredentials.pubType || '')
          setQdTerritoryId(c.douCredentials.qdTerritoryId || '')
          setQdTerritoryName(c.douCredentials.qdTerritoryName || '')
        }
      }

      if (user?.id) {
        const tAv = await pb
          .collection('termos_monitorados')
          .getFullList({ filter: `usuario_id = "${user.id}"` })
        setTermosAvancados(tAv)

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

    if (qdTerritoryId && termosAvancados.length === 0) {
      toast({
        title: 'Aviso de Validação',
        description: 'Termos de busca são obrigatórios ao configurar Querido Diário.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const douCredentials = {
        sections: rodouSections,
        exactSearch: rodouExactSearch,
        ignoreSignature: rodouIgnoreSignature,
        includedDepts: rodouIncludedDepts,
        excludedDepts: rodouExcludedDepts,
        pubType: rodouPubType,
        qdTerritoryId,
        qdTerritoryName,
      }

      const payload = {
        apiKey: datajudApiKey,
        douCredentials,
        frequency,
        sync_processos: syncProcessos,
        termos_busca: termosBusca,
        tribunais: tribunais.map((t) => t.toLowerCase()),
      }

      if (config?.id) await pb.collection('monitoring_configs').update(config.id, payload)
      else await pb.collection('monitoring_configs').create(payload)

      for (const t of tribunalsList) {
        const isActive = tribunais.includes(t.alias?.toLowerCase())
        if (t.active !== isActive)
          await pb.collection('tribunals').update(t.id, { active: isActive })
      }

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

      toast({ title: 'Configurações unificadas salvas com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddTermoAvancado = async () => {
    if (!novoTermoAdv.trim()) return
    try {
      if (tipoTermoAdv === 'regex') new RegExp(novoTermoAdv)
      await pb.collection('termos_monitorados').create({
        termo: novoTermoAdv,
        tipo_termo: tipoTermoAdv,
        termos_ignorados: termosIgnoradosAdv,
        ativo: true,
        usuario_id: user?.id,
      })
      setNovoTermoAdv('')
      setTermosIgnoradosAdv('')
      loadData()
      toast({ title: 'Termo adicionado.' })
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar termo', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Painel Unificado de Monitoramento</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os termos do Ro-DOU, DataJud, Alertas e acompanhe ocorrências em tempo real.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <Tabs defaultValue="rodou" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="rodou" className="flex items-center gap-2">
              <Search className="w-4 h-4" /> Ro-DOU (Diários)
            </TabsTrigger>
            <TabsTrigger value="datajud">Integração DataJud</TabsTrigger>
            <TabsTrigger value="alertas">Notificações</TabsTrigger>
            <TabsTrigger value="realtime">Tempo Real</TabsTrigger>
          </TabsList>

          <TabsContent value="rodou" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Termos Monitorados</CardTitle>
                <CardDescription>
                  Configure os termos, expressões ou regex para busca nos diários.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-lg border">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Termo Principal</Label>
                    <Input
                      placeholder="Ex: (licitação | pregão) & fraude"
                      value={novoTermoAdv}
                      onChange={(e) => setNovoTermoAdv(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={tipoTermoAdv} onValueChange={setTipoTermoAdv}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="palavra-chave">Expressão / Palavra-chave</SelectItem>
                        <SelectItem value="frase">Frase Exata</SelectItem>
                        <SelectItem value="regex">RegEx Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" onClick={handleAddTermoAvancado}>
                    Adicionar Termo
                  </Button>
                  <div className="md:col-span-4 space-y-2 mt-2">
                    <Label>Termos a Ignorar (Negativos, separados por vírgula)</Label>
                    <Input
                      placeholder="Ex: indeferido, cancelado"
                      value={termosIgnoradosAdv}
                      onChange={(e) => setTermosIgnoradosAdv(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {termosAvancados.map((t) => (
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
                          {t.ativo ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px]">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Inativo
                            </Badge>
                          )}
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
                  {termosAvancados.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                      Nenhum termo configurado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Filtros Granulares de Busca (Ro-DOU)</CardTitle>
                <CardDescription>
                  Especifique os parâmetros do motor de busca para filtrar as publicações.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Seções do DOU</Label>
                  <div className="flex gap-6">
                    {['1', '2', '3', 'Extra'].map((sec) => (
                      <div key={sec} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sec-${sec}`}
                          checked={rodouSections.includes(sec)}
                          onCheckedChange={(checked) => {
                            if (checked) setRodouSections([...rodouSections, sec])
                            else setRodouSections(rodouSections.filter((s) => s !== sec))
                          }}
                        />
                        <label
                          htmlFor={`sec-${sec}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          Seção {sec}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                  <div className="flex items-center justify-between border p-4 rounded-lg bg-slate-50/50">
                    <div>
                      <Label className="text-base font-medium">Busca Exata</Label>
                      <p className="text-sm text-muted-foreground">
                        Exige correspondência exata dos termos.
                      </p>
                    </div>
                    <Switch checked={rodouExactSearch} onCheckedChange={setRodouExactSearch} />
                  </div>
                  <div className="flex items-center justify-between border p-4 rounded-lg bg-slate-50/50">
                    <div>
                      <Label className="text-base font-medium">Ignorar Assinaturas</Label>
                      <p className="text-sm text-muted-foreground">
                        Exclui blocos de assinatura dos resultados.
                      </p>
                    </div>
                    <Switch
                      checked={rodouIgnoreSignature}
                      onCheckedChange={setRodouIgnoreSignature}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departamentos Incluídos (Opcional)</Label>
                    <Input
                      placeholder="Ex: Ministério da Economia"
                      value={rodouIncludedDepts}
                      onChange={(e) => setRodouIncludedDepts(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departamentos Excluídos (Opcional)</Label>
                    <Input
                      placeholder="Ex: Secretaria de Saúde"
                      value={rodouExcludedDepts}
                      onChange={(e) => setRodouExcludedDepts(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Publicação (Opcional)</Label>
                  <Input
                    placeholder="Ex: Portaria, Resolução, Edital"
                    value={rodouPubType}
                    onChange={(e) => setRodouPubType(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integração Querido Diário (Municípios)</CardTitle>
                <CardDescription>Busca em diários municipais via Querido Diário.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Territory ID (Código IBGE)</Label>
                  <Input
                    placeholder="Ex: 3550308"
                    value={qdTerritoryId}
                    onChange={(e) => setQdTerritoryId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Território / Município</Label>
                  <Input
                    placeholder="Ex: São Paulo"
                    value={qdTerritoryName}
                    onChange={(e) => setQdTerritoryName(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="datajud" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações DataJud</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Chave da API</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={datajudApiKey}
                        onChange={(e) => setDatajudApiKey(e.target.value)}
                        placeholder="API Key"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          setTestingDatajud(true)
                          try {
                            await testExternalConnection('datajud', datajudApiKey)
                            toast({ title: 'Sucesso!' })
                          } catch (e: any) {
                            toast({ title: 'Erro', description: e.message, variant: 'destructive' })
                          }
                          setTestingDatajud(false)
                        }}
                        disabled={testingDatajud || !datajudApiKey}
                      >
                        {testingDatajud ? 'Testando...' : 'Testar'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência Geral (CRON)</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hourly">Horária</SelectItem>
                        <SelectItem value="Daily">Diária</SelectItem>
                        <SelectItem value="Weekly">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Tribunais Ativos (DataJud)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border p-4 rounded-lg bg-slate-50/50 max-h-[200px] overflow-y-auto">
                    {tribunalsList.map((t) => (
                      <div key={t.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tribunal-${t.id}`}
                          checked={tribunais.includes(t.alias?.toLowerCase())}
                          onCheckedChange={(c) => {
                            const alias = t.alias?.toLowerCase()
                            if (c) setTribunais([...tribunais, alias])
                            else setTribunais(tribunais.filter((x) => x !== alias))
                          }}
                        />
                        <label
                          htmlFor={`tribunal-${t.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {t.alias?.toLowerCase()}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Termos Básicos (Pressione Enter)</Label>
                  <Input
                    placeholder="Ex: licitação"
                    value={termoInput}
                    onChange={(e) => setTermoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && termoInput.trim()) {
                        e.preventDefault()
                        if (!termosBusca.includes(termoInput.trim()))
                          setTermosBusca([...termosBusca, termoInput.trim()])
                        setTermoInput('')
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {termosBusca.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="gap-1.5 cursor-pointer"
                        onClick={() => setTermosBusca(termosBusca.filter((x) => x !== t))}
                      >
                        {t} <X className="w-3 h-3 hover:text-destructive" />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border p-4 rounded-lg bg-slate-50/50 mt-4">
                  <div>
                    <Label className="text-base font-medium">Auto-Sync Processos</Label>
                    <p className="text-sm text-muted-foreground">
                      Atualizar andamentos automaticamente.
                    </p>
                  </div>
                  <Switch checked={syncProcessos} onCheckedChange={setSyncProcessos} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alertas">
            <Card>
              <CardHeader>
                <CardTitle>Canais de Notificação</CardTitle>
                <CardDescription>
                  Defina onde e com que frequência receber alertas de novos andamentos ou
                  publicações.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Canal</Label>
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
                  <Label>Frequência de Envio</Label>
                  <Select value={alertFreq} onValueChange={setAlertFreq}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imediato">Imediato (Assim que detectado)</SelectItem>
                      <SelectItem value="diario">Resumo Diário (Digest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="realtime">
            <MonitoringLogs />
          </TabsContent>

          <div className="flex gap-4 pt-6 pb-8 border-t border-slate-200 mt-6">
            <Button type="submit" disabled={submitting}>
              <Save className="w-4 h-4 mr-2" />
              {submitting ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                setSyncing(true)
                try {
                  await syncProcesses()
                  toast({ title: 'Sync Iniciado' })
                } catch (e: any) {
                  toast({ title: 'Erro', description: e.message, variant: 'destructive' })
                } finally {
                  setSyncing(false)
                }
              }}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Rodar Busca Agora'}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  )
}

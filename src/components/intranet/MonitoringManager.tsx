import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import { Checkbox } from '@/components/ui/checkbox'

import { testExternalConnection, syncProcesses } from '@/services/monitoring'
import { useAuth } from '@/hooks/use-auth'

export default function MonitoringManager() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.isAdmin || user?.role === 'manager'

  const [config, setConfig] = useState<any>(null)
  const [douPriority, setDouPriority] = useState('XML/ZIP')
  const [douPriority2, setDouPriority2] = useState('HTTP')
  const [douUsername, setDouUsername] = useState('')
  const [douPassword, setDouPassword] = useState('')
  const [datajudApiKey, setDatajudApiKey] = useState('')
  const [frequency, setFrequency] = useState('Daily')
  const [syncProcessos, setSyncProcessos] = useState(true)

  const [termosBusca, setTermosBusca] = useState<string[]>([])
  const [termoInput, setTermoInput] = useState('')
  const [tribunais, setTribunais] = useState<string[]>([])
  const [tribunalsList, setTribunalsList] = useState<any[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [testingDou, setTestingDou] = useState(false)
  const [testingDatajud, setTestingDatajud] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      try {
        const tribs = await pb.collection('tribunals').getFullList({ sort: 'name' })
        setTribunalsList(tribs)
      } catch (e) {
        console.error('Error loading tribunals', e)
      }

      const records = await pb.collection('monitoring_configs').getFullList()
      if (records.length > 0) {
        const c = records[0]
        setConfig(c)
        setDatajudApiKey(c.apiKey || '')
        setFrequency(c.frequency || 'Daily')
        setSyncProcessos(c.sync_processos ?? true)
        setTermosBusca(c.termos_busca || [])
        setTribunais(c.tribunais || [])

        if (c.douCredentials) {
          setDouPriority(c.douCredentials.priority || 'XML/ZIP')
          setDouPriority2(c.douCredentials.priority2 || 'HTTP')
          setDouUsername(c.douCredentials.username || '')
          setDouPassword(c.douCredentials.password || '')
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
        Você não tem permissão para acessar as configurações de Monitoramento e API.
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const douCredentials = {
        priority: douPriority,
        priority2: douPriority2,
        username: douUsername,
        password: douPassword,
      }

      const payload = {
        apiKey: datajudApiKey,
        douCredentials,
        frequency,
        sync_processos: syncProcessos,
        termos_busca: termosBusca,
        tribunais: tribunais,
      }

      if (config?.id) {
        await pb.collection('monitoring_configs').update(config.id, payload)
      } else {
        await pb.collection('monitoring_configs').create(payload)
      }
      toast({ title: 'Configurações de monitoramento salvas com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleTestConnection = async (service: 'datajud' | 'dou') => {
    if (service === 'dou') setTestingDou(true)
    else setTestingDatajud(true)

    try {
      await testExternalConnection(service, service === 'datajud' ? datajudApiKey : undefined)
      toast({ title: `Conexão com ${service.toUpperCase()} bem-sucedida!` })
      loadData()
    } catch (err: any) {
      toast({
        title: `Erro na conexão com ${service.toUpperCase()}`,
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      if (service === 'dou') setTestingDou(false)
      else setTestingDatajud(false)
    }
  }

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      await syncProcesses()
      toast({ title: 'Sincronização manual iniciada com sucesso!' })
    } catch (err: any) {
      toast({
        title: 'Erro ao iniciar sincronização',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleAddTermo = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && termoInput.trim()) {
      e.preventDefault()
      if (!termosBusca.includes(termoInput.trim())) {
        setTermosBusca([...termosBusca, termoInput.trim()])
      }
      setTermoInput('')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de APIs e Monitoramento</CardTitle>
          <CardDescription>
            Gerencie as credenciais, prioridades de fontes, termos e tribunais monitorados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">
                Integração DataJud
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chave da API (DataJud)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={datajudApiKey}
                      onChange={(e) => setDatajudApiKey(e.target.value)}
                      placeholder="Insira a chave da API"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestConnection('datajud')}
                      disabled={testingDatajud || !datajudApiKey}
                    >
                      {testingDatajud ? 'Testando...' : 'Testar Conexão'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Frequência de Sincronização</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hourly">Horária</SelectItem>
                      <SelectItem value="Daily">Diária</SelectItem>
                      <SelectItem value="Weekly">Semanal</SelectItem>
                      <SelectItem value="Monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border p-4 rounded-lg bg-slate-50/50">
                  <div>
                    <Label className="text-base font-medium">Sincronizar Processos</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar sincronização automática de andamentos.
                    </p>
                  </div>
                  <Switch checked={syncProcessos} onCheckedChange={setSyncProcessos} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">
                Filtros e Termos Monitorados (Datajud/DOU)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Termos de Busca (Pressione Enter para adicionar)</Label>
                  <Input
                    placeholder="Ex: licitação, contrato"
                    value={termoInput}
                    onChange={(e) => setTermoInput(e.target.value)}
                    onKeyDown={handleAddTermo}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {termosBusca.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 shadow-sm"
                      >
                        {t}{' '}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors"
                          onClick={() => setTermosBusca(termosBusca.filter((x) => x !== t))}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tribunais Monitorados (DataJud)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border p-4 rounded-lg bg-slate-50/50 max-h-[200px] overflow-y-auto">
                    {tribunalsList.map((t) => (
                      <div key={t.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tribunal-${t.id}`}
                          checked={tribunais.includes(t.alias)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTribunais([...tribunais, t.alias])
                            } else {
                              setTribunais(tribunais.filter((x) => x !== t.alias))
                            }
                          }}
                        />
                        <label
                          htmlFor={`tribunal-${t.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer uppercase"
                        >
                          {t.alias}
                        </label>
                      </div>
                    ))}
                    {tribunalsList.length === 0 && (
                      <p className="text-xs text-muted-foreground col-span-full">
                        Nenhum tribunal configurado no sistema.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">
                Configurações Avançadas do DOU
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fonte Primária (Prioridade 1)</Label>
                  <Select value={douPriority} onValueChange={setDouPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XML/ZIP">XML/ZIP (Oficial IN)</SelectItem>
                      <SelectItem value="HTTP">HTTP Public Search</SelectItem>
                      <SelectItem value="QueridoDiario">Ro-DOU / Querido Diário</SelectItem>
                      <SelectItem value="WS-INCom">WS-INCom</SelectItem>
                      <SelectItem value="Scraping">Scraping Direto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fonte Secundária (Prioridade 2)</Label>
                  <Select value={douPriority2} onValueChange={setDouPriority2}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XML/ZIP">XML/ZIP (Oficial IN)</SelectItem>
                      <SelectItem value="HTTP">HTTP Public Search</SelectItem>
                      <SelectItem value="QueridoDiario">Ro-DOU / Querido Diário</SelectItem>
                      <SelectItem value="WS-INCom">WS-INCom</SelectItem>
                      <SelectItem value="Scraping">Scraping Direto</SelectItem>
                      <SelectItem value="Nenhuma">Nenhuma (Apenas Primária)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Define as fontes para ingestão de dados do Diário Oficial da União (DOU).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuário / Client ID (INlabs/IN)</Label>
                  <Input
                    value={douUsername}
                    onChange={(e) => setDouUsername(e.target.value)}
                    placeholder="Credencial de acesso"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha / Secret / Token (INlabs/IN)</Label>
                  <Input
                    type="password"
                    value={douPassword}
                    onChange={(e) => setDouPassword(e.target.value)}
                    placeholder="Senha de acesso ou Token"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleTestConnection('dou')}
                  disabled={testingDou}
                >
                  {testingDou ? 'Testando...' : 'Testar Conexão DOU'}
                </Button>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-200">
              <Button type="submit" disabled={submitting}>
                <Save className="w-4 h-4 mr-2" />
                {submitting ? 'Salvando...' : 'Salvar Configurações'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleManualSync}
                disabled={syncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Buscar Agora (Sincronização Manual)'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

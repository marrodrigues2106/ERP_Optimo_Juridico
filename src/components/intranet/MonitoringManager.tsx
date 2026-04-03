import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Save } from 'lucide-react'

import { testExternalConnection } from '@/services/monitoring'

export default function MonitoringManager() {
  const [config, setConfig] = useState<any>(null)
  const [douPriority, setDouPriority] = useState('XML/ZIP')
  const [douPriority2, setDouPriority2] = useState('HTTP')
  const [douUsername, setDouUsername] = useState('')
  const [douPassword, setDouPassword] = useState('')
  const [datajudApiKey, setDatajudApiKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [testingDou, setTestingDou] = useState(false)
  const [testingDatajud, setTestingDatajud] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const records = await pb.collection('monitoring_configs').getFullList()
      if (records.length > 0) {
        const c = records[0]
        setConfig(c)
        setDatajudApiKey(c.apiKey || '')
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
      if (config?.id) {
        await pb.collection('monitoring_configs').update(config.id, {
          apiKey: datajudApiKey,
          douCredentials,
        })
      } else {
        await pb.collection('monitoring_configs').create({
          apiKey: datajudApiKey,
          douCredentials,
          frequency: 'Daily',
        })
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
      await testExternalConnection(service)
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de APIs e Monitoramento</CardTitle>
          <CardDescription>
            Gerencie as credenciais e prioridades de fontes para o monitoramento de processos e
            diários oficiais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">
                Integração DataJud
              </h3>
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

            <Button type="submit" disabled={submitting}>
              <Save className="w-4 h-4 mr-2" />{' '}
              {submitting ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

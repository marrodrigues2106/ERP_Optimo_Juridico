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

export default function MonitoringManager() {
  const [config, setConfig] = useState<any>(null)
  const [douPriority, setDouPriority] = useState('XML/ZIP')
  const [douUsername, setDouUsername] = useState('')
  const [douPassword, setDouPassword] = useState('')
  const [datajudApiKey, setDatajudApiKey] = useState('')
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
    try {
      const douCredentials = {
        priority: douPriority,
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
                <Input
                  type="password"
                  value={datajudApiKey}
                  onChange={(e) => setDatajudApiKey(e.target.value)}
                  placeholder="Insira a chave da API"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">
                Configurações Avançadas do DOU
              </h3>

              <div className="space-y-2">
                <Label>Prioridade de Fonte (DOU)</Label>
                <Select value={douPriority} onValueChange={setDouPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XML/ZIP">XML/ZIP (Oficial)</SelectItem>
                    <SelectItem value="HTTP">HTTP Public Search</SelectItem>
                    <SelectItem value="QueridoDiario">Ro-DOU / Querido Diário</SelectItem>
                    <SelectItem value="Scraping">Scraping Direto</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Define a fonte primária para ingestão de dados do Diário Oficial da União.
                </p>
              </div>

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
                  <Label>Senha / Secret (INlabs/IN)</Label>
                  <Input
                    type="password"
                    value={douPassword}
                    onChange={(e) => setDouPassword(e.target.value)}
                    placeholder="Senha de acesso"
                  />
                </div>
              </div>
            </div>

            <Button type="submit">
              <Save className="w-4 h-4 mr-2" /> Salvar Configurações
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

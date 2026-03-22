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
import { Trash2, Plus, RefreshCw, Search } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-primary tracking-tight">
          Monitoramento Automatizado
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações Gerais (DataJud/DOU)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Chave da API (DataJud)</Label>
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

            <div className="pt-6 mt-6 border-t space-y-3">
              <h3 className="text-sm font-semibold">Sincronização Manual</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSyncP}
                  disabled={loadingSyncP}
                >
                  <RefreshCw className={cn('w-4 h-4 mr-2', loadingSyncP && 'animate-spin')} />{' '}
                  Processos Ativos
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSyncT}
                  disabled={loadingSyncT}
                >
                  <Search className={cn('w-4 h-4 mr-2', loadingSyncT && 'animate-spin')} /> Buscar
                  Termos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Termos de Pesquisa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddTerm} className="flex gap-2">
              <Input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Novo termo (ex: nome da empresa)"
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

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 mt-4">
              {terms.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 border rounded bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <Switch checked={t.active} onCheckedChange={() => toggleTerm(t)} />
                    <div>
                      <p
                        className={cn(
                          'font-medium text-sm',
                          !t.active && 'text-muted-foreground line-through',
                        )}
                      >
                        {t.term}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">
                        {t.type}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
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
                <p className="text-sm text-center text-muted-foreground py-6">
                  Nenhum termo configurado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

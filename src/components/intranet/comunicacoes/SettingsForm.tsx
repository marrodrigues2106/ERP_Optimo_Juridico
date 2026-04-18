import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getMonitoringConfig, saveMonitoringConfig } from '@/services/monitoring'

interface SettingsFormData {
  baseUrl: string
  apiKey: string
}

export function SettingsForm() {
  const [loading, setLoading] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)
  const { register, handleSubmit, reset } = useForm<SettingsFormData>()
  const { toast } = useToast()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const config = await getMonitoringConfig()
        if (config) {
          setConfigId(config.id)
          reset({
            baseUrl: config.pje_base_url || 'https://comunicaapi.pje.jus.br/api/v1/comunicacao',
            apiKey: config.pje_api_key || '',
          })
        } else {
          reset({
            baseUrl: 'https://comunicaapi.pje.jus.br/api/v1/comunicacao',
            apiKey: '',
          })
        }
      } catch (err) {
        console.error('Error loading config', err)
        reset({
          baseUrl: 'https://comunicaapi.pje.jus.br/api/v1/comunicacao',
          apiKey: '',
        })
      }
    }
    loadSettings()
  }, [reset])

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true)
    try {
      const payload: any = {
        pje_base_url: data.baseUrl,
        pje_api_key: data.apiKey,
      }

      // If it's a new config, fill required schema fields
      if (!configId) {
        payload.apiKey = 'pending'
        payload.frequency = 'Daily'
      }

      const saved = await saveMonitoringConfig(configId, payload)
      setConfigId(saved.id)

      toast({
        title: 'Configurações salvas',
        description: 'As credenciais do Comunica PJe foram atualizadas com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Configurações de Integração (PJe)</CardTitle>
        <CardDescription>
          Gerencie os parâmetros de conexão e credenciais com a API do Comunica PJe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Chave de API (API Key)</Label>
            <Input
              id="apiKey"
              type="password"
              {...register('apiKey', { required: 'A chave de API é obrigatória' })}
              placeholder="Insira a sua API Key do PJe"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUrl">URL Base da API</Label>
            <Input
              id="baseUrl"
              {...register('baseUrl', { required: 'A URL base é obrigatória' })}
              placeholder="https://comunicaapi.pje.jus.br/api/v1/comunicacao"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getSettingByKey, setSettingByKey } from '@/services/settings'

interface SettingsFormData {
  baseUrl: string
}

export function SettingsForm() {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset } = useForm<SettingsFormData>()
  const { toast } = useToast()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const record = await getSettingByKey('pje_comunica_base_url')
        if (record) {
          reset({ baseUrl: record.value })
        } else {
          reset({ baseUrl: 'https://comunicaapi.pje.jus.br/api/v1/comunicacao' })
        }
      } catch (err) {
        reset({ baseUrl: 'https://comunicaapi.pje.jus.br/api/v1/comunicacao' })
      }
    }
    loadSettings()
  }, [reset])

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true)
    try {
      await setSettingByKey('pje_comunica_base_url', data.baseUrl)
      toast({
        title: 'Configurações salvas',
        description: 'A URL base da API PJe Comunica foi atualizada com sucesso.',
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
        <CardTitle>Configurações de Integração</CardTitle>
        <CardDescription>
          Gerencie os parâmetros de conexão com a API do Comunica PJe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">URL Base da API (Comunica PJe)</Label>
            <Input
              id="baseUrl"
              {...register('baseUrl')}
              placeholder="https://comunicaapi.pje.jus.br/api/v1/comunicacao"
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              A Chave da API (COMUNICA_PJE_KEY) está armazenada nos secrets do sistema e será
              injetada automaticamente.
            </p>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

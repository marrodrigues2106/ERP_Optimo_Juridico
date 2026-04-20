import { useEffect, useState } from 'react'
import { getSettingByKey, setSettingByKey } from '@/services/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function SettingsProxy() {
  const [enabled, setEnabled] = useState(false)
  const [url, setUrl] = useState('')
  const [auth, setAuth] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const en = await getSettingByKey('pje_proxy_enabled')
        const ur = await getSettingByKey('pje_proxy_url')
        const au = await getSettingByKey('pje_proxy_auth')
        if (en) setEnabled(en.value === 'true')
        if (ur) setUrl(ur.value)
        if (au) setAuth(au.value)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await setSettingByKey('pje_proxy_enabled', enabled ? 'true' : 'false')
      await setSettingByKey('pje_proxy_url', url)
      await setSettingByKey('pje_proxy_auth', auth)
      toast({ title: 'Configurações salvas com sucesso' })
    } catch (err) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in-up duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Configurações de Proxy PJe</h1>
        <p className="text-muted-foreground">
          Gerencie o proxy de conexão para o sistema Comunica PJe.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Proxy de Sincronização</CardTitle>
          <CardDescription>
            Configure um serviço de proxy para contornar bloqueios de conexão (HTTP 403) nos
            servidores protegidos por WAF (como Amazon CloudFront).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4 rounded-lg border p-4">
            <Switch id="proxy-enabled" checked={enabled} onCheckedChange={setEnabled} />
            <div className="space-y-0.5">
              <Label htmlFor="proxy-enabled" className="text-base">
                Habilitar Proxy PJe
              </Label>
              <p className="text-sm text-muted-foreground">
                Ativa o uso de proxy em todas as requisições de sincronização com o PJe.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxy-url">URL do Proxy</Label>
            <Input
              id="proxy-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ex: https://proxy.empresa.com/api/v1 ou https://api.proxy.com?url="
              disabled={!enabled}
            />
            <p className="text-sm text-muted-foreground">
              A URL base do serviço proxy. Se contiver "?" no final, a URL original será enviada
              como parâmetro de busca codificado.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxy-auth">Autenticação do Proxy (Opcional)</Label>
            <Input
              id="proxy-auth"
              value={auth}
              onChange={(e) => setAuth(e.target.value)}
              placeholder="ex: Basic YWxhZGRpbjpvcGVuc2VzYW1l ou Bearer token..."
              disabled={!enabled}
            />
            <p className="text-sm text-muted-foreground">
              Credenciais de acesso. Elas são enviadas de forma segura nos cabeçalhos
              Proxy-Authorization e X-Proxy-Auth pelo backend.
            </p>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

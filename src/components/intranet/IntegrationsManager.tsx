import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Save, Loader2, Mail, ShieldCheck, Zap } from 'lucide-react'
import { getSettingByKey, setSettingByKey } from '@/services/settings'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'

export default function IntegrationsManager() {
  const { toast } = useToast()
  const { user } = useAuth()

  const [resendApiKey, setResendApiKey] = useState('')
  const [resendFromEmail, setResendFromEmail] = useState('onboarding@resend.dev')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isAuthorized = user?.role === 'admin' || user?.role === 'manager' || user?.isAdmin

  useEffect(() => {
    if (!isAuthorized) return

    const loadSettings = async () => {
      try {
        const keyRecord = await getSettingByKey('resend_api_key')
        if (keyRecord && keyRecord.value !== 'pending') setResendApiKey(keyRecord.value)
        const fromRecord = await getSettingByKey('resend_from_email')
        if (fromRecord) setResendFromEmail(fromRecord.value)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [isAuthorized])

  const handleTestEmail = async () => {
    setSaving(true)
    try {
      const res = await pb.send('/backend/v1/email/test', {
        method: 'POST',
        body: JSON.stringify({ resend_api_key: resendApiKey, resend_from_email: resendFromEmail }),
      })

      if (res.error) throw new Error(res.message || 'Erro de conexão')

      toast({ title: 'Conexão com Resend estabelecida com sucesso!' })
      return true
    } catch (err: any) {
      toast({
        title: 'Falha na conexão: Verifique sua Chave API.',
        variant: 'destructive',
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await setSettingByKey('resend_api_key', resendApiKey.trim() || 'pending')
      await setSettingByKey('resend_from_email', resendFromEmail.trim())
      toast({ title: 'Configurações de e-mail atualizadas!' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthorized) {
    return <Navigate to="/intranet" replace />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Zap className="w-8 h-8" /> Integrações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie integrações externas, envio de e-mails e outras configurações avançadas do
          sistema.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" /> Resend API (Envio de E-mails)
            </CardTitle>
            <CardDescription className="text-base">
              Configure a chave de API do Resend para o envio de alertas e comunicações do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Chave da API (Resend)</Label>
                  <Input
                    type="password"
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder="re_..."
                    className="text-base py-6"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-medium">E-mail Remetente (From)</Label>
                  <Input
                    type="email"
                    value={resendFromEmail}
                    onChange={(e) => setResendFromEmail(e.target.value)}
                    placeholder="exemplo@seudominio.com.br"
                    className="text-base py-6"
                  />
                  <p className="text-sm text-slate-500">
                    O domínio deve estar verificado no painel do Resend. Use onboarding@resend.dev
                    para testes se não tiver um domínio verificado.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={saving}
                  className="py-6 px-6 text-base font-medium"
                >
                  <ShieldCheck className="w-5 h-5 mr-2" /> Testar Conexão
                </Button>
                <Button type="submit" disabled={saving} className="py-6 px-8 text-base font-bold">
                  {saving ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

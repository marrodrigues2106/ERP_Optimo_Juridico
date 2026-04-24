import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Save, Loader2, Mail, ShieldCheck, Zap } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'

export default function IntegrationsManager() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [emailConfig, setEmailConfig] = useState({
    imap_host: user?.imap_host || '',
    imap_port: user?.imap_port?.toString() || '',
    smtp_host: user?.smtp_host || '',
    smtp_port: user?.smtp_port?.toString() || '',
    email_user: user?.email_user || '',
    email_password: '',
    email_encryption: user?.email_encryption || 'starttls',
    is_system_dispatcher: user?.is_system_dispatcher || false,
  })
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({})

  const handleTestEmail = async () => {
    setSavingEmail(true)
    setEmailErrors({})
    try {
      const testConfig = {
        imap_host: emailConfig.imap_host.trim(),
        imap_port: parseInt(emailConfig.imap_port.toString(), 10) || 0,
        smtp_host: emailConfig.smtp_host.trim(),
        smtp_port: parseInt(emailConfig.smtp_port.toString(), 10) || 0,
        email_user: emailConfig.email_user.trim(),
        email_password: emailConfig.email_password.trim(),
        email_encryption: emailConfig.email_encryption,
      }

      const res = await pb.send('/backend/v1/email/test', {
        method: 'POST',
        body: JSON.stringify(testConfig),
      })

      // Try to fetch folders to validate IMAP if the backend supports it, otherwise SMTP test is fine.
      try {
        await pb.send('/backend/v2/email/folders', { method: 'POST' })
      } catch (e) {
        console.warn('IMAP test info:', e)
      }

      if (res.success) {
        toast({ title: 'Conexões validadas!', description: 'SMTP configurado e operante.' })
        return true
      }
      return false
    } catch (err: any) {
      const fieldErrs = extractFieldErrors(err)
      if (Object.keys(fieldErrs).length > 0 && !fieldErrs.connection && !fieldErrs.bridge) {
        setEmailErrors(fieldErrs)
        toast({
          title: 'Verifique os campos destacados',
          description: 'Há erros na configuração de conexão.',
          variant: 'destructive',
        })
      } else {
        const errorDetail = fieldErrs.connection || fieldErrs.bridge || err.message
        toast({
          title: 'Falha na conexão',
          description: errorDetail,
          variant: 'destructive',
        })
      }
      return false
    } finally {
      setSavingEmail(false)
    }
  }

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()

    const isTestValid = await handleTestEmail()
    if (!isTestValid) return

    setSavingEmail(true)
    try {
      const dataToSave = {
        imap_host: emailConfig.imap_host.trim(),
        imap_port: parseInt(emailConfig.imap_port.toString(), 10) || 0,
        smtp_host: emailConfig.smtp_host.trim(),
        smtp_port: parseInt(emailConfig.smtp_port.toString(), 10) || 0,
        email_user: emailConfig.email_user.trim(),
        email_encryption: emailConfig.email_encryption,
        is_system_dispatcher: emailConfig.is_system_dispatcher,
      } as any

      if (emailConfig.email_password.trim()) {
        dataToSave.email_encrypted_password = emailConfig.email_password.trim()
      }

      await pb.collection('users').update(user.id, dataToSave)
      toast({ title: 'Configurações de e-mail atualizadas!' })
    } catch (err: any) {
      const fieldErrs = extractFieldErrors(err)
      if (Object.keys(fieldErrs).length > 0) {
        setEmailErrors(fieldErrs)
        toast({
          title: 'Erro de validação',
          description: 'Por favor verifique os campos.',
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
      }
    } finally {
      setSavingEmail(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Zap className="w-8 h-8" /> Integrações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie integrações externas, servidores de email e outras configurações avançadas do
          sistema.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" /> Servidor de E-mail (IMAP/SMTP)
          </CardTitle>
          <CardDescription className="text-base">
            Configure os dados da sua conta para acessar pastas e mensagens diretamente pelo sistema
            e para envio de alertas automáticos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveEmail} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label
                  className={cn('text-base font-medium', emailErrors.imap_host && 'text-red-500')}
                >
                  Servidor IMAP (Recebimento)
                </Label>
                <Input
                  value={emailConfig.imap_host}
                  onChange={(e) => setEmailConfig({ ...emailConfig, imap_host: e.target.value })}
                  placeholder="imap.dominio.com.br"
                  className={cn(
                    'text-base py-6',
                    emailErrors.imap_host && 'border-red-500 focus-visible:ring-red-500',
                  )}
                />
                {emailErrors.imap_host && (
                  <p className="text-sm text-red-500 font-medium">{emailErrors.imap_host}</p>
                )}
              </div>
              <div className="space-y-3">
                <Label
                  className={cn('text-base font-medium', emailErrors.imap_port && 'text-red-500')}
                >
                  Porta IMAP
                </Label>
                <Input
                  type="number"
                  value={emailConfig.imap_port}
                  onChange={(e) => setEmailConfig({ ...emailConfig, imap_port: e.target.value })}
                  placeholder="993"
                  className={cn(
                    'text-base py-6',
                    emailErrors.imap_port && 'border-red-500 focus-visible:ring-red-500',
                  )}
                />
                {emailErrors.imap_port && (
                  <p className="text-sm text-red-500 font-medium">{emailErrors.imap_port}</p>
                )}
              </div>
              <div className="space-y-3">
                <Label className="text-base font-medium">Criptografia de Conexão</Label>
                <Select
                  value={emailConfig.email_encryption}
                  onValueChange={(val) => setEmailConfig({ ...emailConfig, email_encryption: val })}
                >
                  <SelectTrigger className="w-full text-base py-6">
                    <SelectValue placeholder="Selecione a criptografia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssl_tls">SSL/TLS</SelectItem>
                    <SelectItem value="starttls">STARTTLS (Recomendado Hostinger)</SelectItem>
                    <SelectItem value="none">Nenhuma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label
                  className={cn('text-base font-medium', emailErrors.smtp_host && 'text-red-500')}
                >
                  Servidor SMTP (Envio)
                </Label>
                <Input
                  value={emailConfig.smtp_host}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                  placeholder="smtp.dominio.com.br"
                  className={cn(
                    'text-base py-6',
                    emailErrors.smtp_host && 'border-red-500 focus-visible:ring-red-500',
                  )}
                />
                {emailErrors.smtp_host && (
                  <p className="text-sm text-red-500 font-medium">{emailErrors.smtp_host}</p>
                )}
              </div>
              <div className="space-y-3">
                <Label
                  className={cn('text-base font-medium', emailErrors.smtp_port && 'text-red-500')}
                >
                  Porta SMTP
                </Label>
                <Input
                  type="number"
                  value={emailConfig.smtp_port}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                  placeholder="587"
                  className={cn(
                    'text-base py-6',
                    emailErrors.smtp_port && 'border-red-500 focus-visible:ring-red-500',
                  )}
                />
                {emailErrors.smtp_port && (
                  <p className="text-sm text-red-500 font-medium">{emailErrors.smtp_port}</p>
                )}
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label
                  className={cn('text-base font-medium', emailErrors.email_user && 'text-red-500')}
                >
                  Usuário (E-mail)
                </Label>
                <Input
                  type="email"
                  value={emailConfig.email_user}
                  onChange={(e) => setEmailConfig({ ...emailConfig, email_user: e.target.value })}
                  placeholder="seu.nome@escritorio.com.br"
                  className={cn(
                    'text-base py-6',
                    emailErrors.email_user && 'border-red-500 focus-visible:ring-red-500',
                  )}
                />
                {emailErrors.email_user && (
                  <p className="text-sm text-red-500 font-medium">{emailErrors.email_user}</p>
                )}
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label
                  className={cn(
                    'text-base font-medium',
                    emailErrors.email_password && 'text-red-500',
                  )}
                >
                  Senha do E-mail
                </Label>
                <Input
                  type="password"
                  value={emailConfig.email_password}
                  onChange={(e) =>
                    setEmailConfig({ ...emailConfig, email_password: e.target.value })
                  }
                  placeholder={user?.imap_host ? '•••••••• (Já configurada)' : 'Sua senha'}
                  className={cn(
                    'text-base py-6',
                    emailErrors.email_password && 'border-red-500 focus-visible:ring-red-500',
                  )}
                />
                {emailErrors.email_password && (
                  <p className="text-sm text-red-500 font-medium">{emailErrors.email_password}</p>
                )}
              </div>

              {(user?.isAdmin || user?.role === 'admin') && (
                <div className="space-y-3 md:col-span-2 flex items-center justify-between border-t border-slate-100 pt-6">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium text-slate-800">
                      Usar como Remetente do Sistema (Dispatcher)
                    </Label>
                    <p className="text-sm text-slate-500 max-w-md">
                      Se ativado, esta conta enviará os e-mails automáticos do sistema (alertas de
                      prazos, andamentos, financeiros, etc).
                    </p>
                  </div>
                  <Switch
                    checked={emailConfig.is_system_dispatcher}
                    onCheckedChange={(val) =>
                      setEmailConfig({ ...emailConfig, is_system_dispatcher: val })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestEmail}
                disabled={savingEmail}
                className="py-6 px-6 text-base font-medium"
              >
                <ShieldCheck className="w-5 h-5 mr-2" /> Testar Conexão
              </Button>
              <Button
                type="submit"
                disabled={savingEmail}
                className="py-6 px-8 text-base font-bold"
              >
                {savingEmail ? (
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
    </div>
  )
}

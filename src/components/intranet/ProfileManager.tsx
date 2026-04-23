import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Camera, Save, Loader2, Building2, Mail, Activity, ShieldCheck } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export default function ProfileManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [alertConfig, setAlertConfig] = useState<any>({ frequencia: 'daily', ativo: true })
  const [savingAlert, setSavingAlert] = useState(false)

  const [fullName, setFullName] = useState(user?.fullName || user?.name || '')
  const [email] = useState(user?.email || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar ? pb.files.getURL(user, user.avatar) : null,
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [orgData, setOrgData] = useState({ name: '', cnpj: '', address: '', email: '' })
  const [savingOrg, setSavingOrg] = useState(false)

  const [emailConfig, setEmailConfig] = useState({
    imap_host: user?.imap_host || '',
    imap_port: user?.imap_port?.toString() || '',
    smtp_host: user?.smtp_host || '',
    smtp_port: user?.smtp_port?.toString() || '',
    email_user: user?.email_user || '',
    email_password: '',
    email_encryption: user?.email_encryption || 'ssl_tls',
  })
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user?.active_organization) {
      pb.collection('organizations')
        .getOne(user.active_organization)
        .then((o) => {
          setOrgData({
            name: o.name || '',
            cnpj: o.cnpj || '',
            address: o.address || '',
            email: o.email || '',
          })
        })
        .catch(console.error)
    }
    if (user?.id) {
      pb.collection('configuracoes_alerta')
        .getFirstListItem(`usuario_id="${user.id}"`)
        .then((res) => setAlertConfig(res))
        .catch(() => setAlertConfig({ frequencia: 'daily', ativo: true }))
    }
  }, [user])

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAlert(true)
    try {
      if (alertConfig.id) {
        await pb.collection('configuracoes_alerta').update(alertConfig.id, {
          frequencia: alertConfig.frequencia,
          ativo: alertConfig.ativo,
        })
      } else {
        const res = await pb.collection('configuracoes_alerta').create({
          usuario_id: user.id,
          frequencia: alertConfig.frequencia,
          ativo: alertConfig.ativo,
          tipo_notificacao: 'app',
        })
        setAlertConfig(res)
      }
      toast({ title: 'Monitoramento atualizado!' })
    } catch (err) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSavingAlert(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('name', fullName)
      if (avatarFile) formData.append('avatar', avatarFile)

      await pb.collection('users').update(user.id, formData)
      toast({ title: 'Perfil atualizado com sucesso!' })
    } catch (err) {
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' })
    }
  }

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.active_organization) return
    setSavingOrg(true)
    try {
      await pb.collection('organizations').update(user.active_organization, orgData)
      toast({ title: 'Organização atualizada com sucesso!' })
    } catch (err) {
      toast({ title: 'Erro ao atualizar organização', variant: 'destructive' })
    } finally {
      setSavingOrg(false)
    }
  }

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

      if (res.success) {
        toast({ title: 'Conexão bem sucedida!', description: res.message })
        return true
      }
      return false
    } catch (err: any) {
      const fieldErrs = extractFieldErrors(err)
      if (Object.keys(fieldErrs).length > 0) {
        setEmailErrors(fieldErrs)
        toast({
          title: 'Verifique os campos destacados',
          description: 'Há erros na configuração de conexão.',
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Falha na conexão', description: err.message, variant: 'destructive' })
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
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">
        Configurações e Perfil
      </h1>
      <Tabs defaultValue="perfil" className="w-full animate-fade-in">
        <TabsList className="mb-8 flex-wrap bg-slate-100 p-1.5 rounded-lg gap-1 h-auto">
          <TabsTrigger value="perfil" className="text-base px-4 py-2 font-medium">
            Perfil
          </TabsTrigger>
          {user?.active_organization && (
            <TabsTrigger value="organizacao" className="text-base px-4 py-2 font-medium">
              Organização
            </TabsTrigger>
          )}
          <TabsTrigger value="monitoramento" className="text-base px-4 py-2 font-medium">
            Monitoramento PJe
          </TabsTrigger>
          <TabsTrigger value="email" className="text-base px-4 py-2 font-medium">
            Integração E-mail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Avatar className="w-32 h-32 border-4 border-white shadow-md">
                        <AvatarImage
                          src={
                            avatarPreview ||
                            `https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`
                          }
                        />
                        <AvatarFallback className="text-2xl">
                          {fullName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-8 h-8" />
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setAvatarFile(e.target.files[0])
                            setAvatarPreview(URL.createObjectURL(e.target.files[0]))
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">E-mail</Label>
                    <Input value={email} disabled className="bg-slate-50 text-base py-6" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Nome Completo</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="text-base py-6"
                    />
                  </div>
                  <Button type="submit" className="w-full py-6 text-base font-bold">
                    Salvar Perfil
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {user?.active_organization && (
          <TabsContent value="organizacao">
            <Card className="max-w-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-primary" /> Dados da Organização
                </CardTitle>
                <CardDescription className="text-base">
                  Gerencie os dados do seu escritório.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveOrg} className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Nome da Organização</Label>
                    <Input
                      value={orgData.name}
                      onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                      required
                      className="text-base py-6"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">CNPJ</Label>
                    <Input
                      value={orgData.cnpj}
                      onChange={(e) => setOrgData({ ...orgData, cnpj: e.target.value })}
                      className="text-base py-6"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">E-mail de Contato</Label>
                    <Input
                      type="email"
                      value={orgData.email}
                      onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                      className="text-base py-6"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Endereço Completo</Label>
                    <Input
                      value={orgData.address}
                      onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                      className="text-base py-6"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={savingOrg}
                    className="py-6 px-8 text-base font-bold"
                  >
                    {savingOrg ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5 mr-2" />
                    )}
                    Salvar Organização
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="email">
          <Card className="max-w-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" /> Integração E-mail (IMAP/SMTP)
              </CardTitle>
              <CardDescription className="text-base">
                Configure os dados da sua conta para acessar pastas e mensagens diretamente pelo
                sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEmail} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label
                      className={cn(
                        'text-base font-medium',
                        emailErrors.imap_host && 'text-red-500',
                      )}
                    >
                      Servidor IMAP (Recebimento)
                    </Label>
                    <Input
                      value={emailConfig.imap_host}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, imap_host: e.target.value })
                      }
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
                      className={cn(
                        'text-base font-medium',
                        emailErrors.imap_port && 'text-red-500',
                      )}
                    >
                      Porta IMAP
                    </Label>
                    <Input
                      type="number"
                      value={emailConfig.imap_port}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, imap_port: e.target.value })
                      }
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
                      onValueChange={(val) =>
                        setEmailConfig({ ...emailConfig, email_encryption: val })
                      }
                    >
                      <SelectTrigger className="w-full text-base py-6">
                        <SelectValue placeholder="Selecione a criptografia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ssl_tls">SSL/TLS (Recomendado)</SelectItem>
                        <SelectItem value="starttls">STARTTLS</SelectItem>
                        <SelectItem value="none">Nenhuma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label
                      className={cn(
                        'text-base font-medium',
                        emailErrors.smtp_host && 'text-red-500',
                      )}
                    >
                      Servidor SMTP (Envio)
                    </Label>
                    <Input
                      value={emailConfig.smtp_host}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, smtp_host: e.target.value })
                      }
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
                      className={cn(
                        'text-base font-medium',
                        emailErrors.smtp_port && 'text-red-500',
                      )}
                    >
                      Porta SMTP
                    </Label>
                    <Input
                      type="number"
                      value={emailConfig.smtp_port}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, smtp_port: e.target.value })
                      }
                      placeholder="465 ou 587"
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
                      className={cn(
                        'text-base font-medium',
                        emailErrors.email_user && 'text-red-500',
                      )}
                    >
                      Usuário (E-mail)
                    </Label>
                    <Input
                      type="email"
                      value={emailConfig.email_user}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, email_user: e.target.value })
                      }
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
                      <p className="text-sm text-red-500 font-medium">
                        {emailErrors.email_password}
                      </p>
                    )}
                  </div>
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
        </TabsContent>

        <TabsContent value="monitoramento">
          <Card className="max-w-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Activity className="w-6 h-6 text-primary" /> Automação PJe
              </CardTitle>
              <CardDescription className="text-base">
                Configure a frequência de sincronização automática.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAlert} className="space-y-6">
                <div className="flex items-center justify-between border-b pb-6">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold">Monitoramento Ativo</Label>
                    <p className="text-sm text-slate-500">
                      Habilite para busca de novos andamentos.
                    </p>
                  </div>
                  <Switch
                    checked={alertConfig.ativo}
                    onCheckedChange={(checked) =>
                      setAlertConfig({ ...alertConfig, ativo: checked })
                    }
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Frequência de Atualização</Label>
                  <Select
                    value={alertConfig.frequencia}
                    onValueChange={(val) => setAlertConfig({ ...alertConfig, frequencia: val })}
                    disabled={!alertConfig.ativo}
                  >
                    <SelectTrigger className="w-full text-base py-6">
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">De hora em hora</SelectItem>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={savingAlert}
                  className="py-6 px-8 text-base font-bold"
                >
                  {savingAlert ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}{' '}
                  Salvar Preferências
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

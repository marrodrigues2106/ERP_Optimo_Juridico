import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, BellRing, User, ShieldCheck } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export default function ProfileManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Profile form
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')

  // Password form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Alerts config
  const [alertConfigId, setAlertConfigId] = useState<string | null>(null)
  const [alertEmail, setAlertEmail] = useState(user?.email || '')
  const [receiveMode, setReceiveMode] = useState('imediato')
  const [frequency, setFrequency] = useState('daily')

  useEffect(() => {
    if (!user) return
    const loadConfig = async () => {
      try {
        const result = await pb.collection('configuracoes_alerta').getList(1, 1, {
          filter: `usuario_id = "${user.id}"`,
        })
        if (result.items.length > 0) {
          const conf = result.items[0]
          setAlertConfigId(conf.id)
          setAlertEmail(conf.email_destinatario || user.email || '')

          if (conf.frequencia === 'imediato' || conf.frequencia === '') {
            setReceiveMode('imediato')
            setFrequency('daily')
          } else {
            setReceiveMode('agendado')
            setFrequency(conf.frequencia === 'weekly' ? 'weekly' : 'daily')
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadConfig()
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, { name })
      toast({ title: 'Perfil atualizado com sucesso!' })
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar perfil', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      return toast({ title: 'As senhas não coincidem', variant: 'destructive' })
    }
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })
      toast({ title: 'Senha atualizada com sucesso!' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar senha', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAlerts = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const finalFreq = receiveMode === 'imediato' ? 'imediato' : frequency

    try {
      const payload = {
        usuario_id: user.id,
        email_destinatario: alertEmail,
        frequencia: finalFreq,
        tipo_notificacao: 'email',
        ativo: true,
      }

      if (alertConfigId) {
        await pb.collection('configuracoes_alerta').update(alertConfigId, payload)
      } else {
        const created = await pb.collection('configuracoes_alerta').create(payload)
        setAlertConfigId(created.id)
      }

      toast({ title: 'Configurações de alertas salvas!' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar alertas', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Minha Conta</h1>
        <p className="text-slate-500 mt-1">
          Gerencie seu perfil, segurança e preferências de notificações.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 max-w-[500px]">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <BellRing className="w-4 h-4" /> Monitoramentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seu nome e dados básicos.</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} disabled className="bg-slate-50 text-slate-500" />
                  <p className="text-xs text-slate-400">
                    O email de login não pode ser alterado por aqui.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Atualize sua senha de acesso.</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <Input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Atualizar Senha
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Alertas</CardTitle>
              <CardDescription>
                Defina como e quando deseja receber notificações de novos andamentos, publicações e
                comunicações PJe.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateAlerts}>
              <CardContent className="space-y-8">
                <div className="space-y-2 max-w-md">
                  <Label className="text-base font-semibold">
                    E-mail para Recebimento de Alertas
                  </Label>
                  <Input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="Ex: advogado@escritorio.com.br"
                    required
                  />
                  <p className="text-sm text-slate-500">
                    Se deixado em branco, enviaremos para o seu email de login.
                  </p>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <Label className="text-base font-semibold">Forma de Recebimento</Label>
                  <RadioGroup
                    value={receiveMode}
                    onValueChange={setReceiveMode}
                    className="space-y-3"
                  >
                    <div
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setReceiveMode('imediato')}
                    >
                      <RadioGroupItem value="imediato" id="imediato" className="mt-1" />
                      <div>
                        <Label htmlFor="imediato" className="text-base font-medium cursor-pointer">
                          Alerta Individual
                        </Label>
                        <p className="text-sm text-slate-500">
                          Receber um e-mail para cada novo alerta encontrado imediatamente.
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setReceiveMode('agendado')}
                    >
                      <RadioGroupItem value="agendado" id="agendado" className="mt-1" />
                      <div>
                        <Label htmlFor="agendado" className="text-base font-medium cursor-pointer">
                          Resumo Agendado
                        </Label>
                        <p className="text-sm text-slate-500">
                          Receber um único e-mail consolidado com todos os alertas do período.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {receiveMode === 'agendado' && (
                  <div className="space-y-4 border-t pt-6 animate-in fade-in slide-in-from-top-4">
                    <Label className="text-base font-semibold">Frequência do Resumo</Label>
                    <RadioGroup
                      value={frequency}
                      onValueChange={setFrequency}
                      className="space-y-3"
                    >
                      <div
                        className="flex items-center space-x-3 cursor-pointer"
                        onClick={() => setFrequency('daily')}
                      >
                        <RadioGroupItem value="daily" id="daily" />
                        <Label htmlFor="daily" className="cursor-pointer font-medium">
                          Diária
                        </Label>
                      </div>
                      <div
                        className="flex items-center space-x-3 cursor-pointer"
                        onClick={() => setFrequency('weekly')}
                      >
                        <RadioGroupItem value="weekly" id="weekly" />
                        <Label htmlFor="weekly" className="cursor-pointer font-medium">
                          Semanal
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-slate-50 border-t py-4">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Preferências
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

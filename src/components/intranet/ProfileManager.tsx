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
import { Loader2, BellRing, User, ShieldCheck, Edit2, Trash2, Plus, Zap } from 'lucide-react'
import IntegrationsManager from '@/components/intranet/IntegrationsManager'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'

export default function ProfileManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Profile form
  const [name, setName] = useState(user?.name || '')
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [cpf, setCpf] = useState(user?.cpf || '')
  const [idNumber, setIdNumber] = useState(user?.idNumber || '')
  const [address, setAddress] = useState(user?.address || '')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user?.avatar ? pb.files.getUrl(user, user.avatar) : '',
  )

  // Password form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Alerts config
  const [alertConfigId, setAlertConfigId] = useState<string | null>(null)
  const [alertEmail, setAlertEmail] = useState(user?.email || '')
  const [frequency, setFrequency] = useState('daily')

  // Termos
  const [termos, setTermos] = useState<any[]>([])
  const [isTermModalOpen, setIsTermModalOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<any>(null)
  const [termText, setTermText] = useState('')
  const [termType, setTermType] = useState('Livre')
  const [termSearchMethod, setTermSearchMethod] = useState('palavra-chave')
  const [termIgnored, setTermIgnored] = useState('')
  const [termActive, setTermActive] = useState(true)

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      try {
        const result = await pb.collection('configuracoes_alerta').getList(1, 1, {
          filter: `usuario_id = "${user.id}"`,
        })
        if (result.items.length > 0) {
          const conf = result.items[0]
          setAlertConfigId(conf.id)
          setAlertEmail(conf.email_destinatario || user.email || '')
          setFrequency(conf.frequencia === 'weekly' ? 'weekly' : 'daily')
        }

        const termRes = await pb.collection('termos_monitorados').getFullList({
          filter: `usuario_id = "${user.id}"`,
          sort: '-created',
        })
        setTermos(termRes)
      } catch (err) {
        console.error(err)
      }
    }
    loadData()
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('fullName', fullName)
      formData.append('phone', phone)
      formData.append('cpf', cpf)
      formData.append('idNumber', idNumber)
      formData.append('address', address)
      if (avatar) formData.append('avatar', avatar)

      const updated = await pb.collection('users').update(user.id, formData)
      if (updated.avatar) setAvatarUrl(pb.files.getUrl(updated, updated.avatar))

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

    try {
      const payload = {
        usuario_id: user.id,
        email_destinatario: alertEmail,
        frequencia: frequency,
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

  const handleSaveTerm = async () => {
    try {
      const data = {
        termo: termText,
        tipo_termo: termType,
        usuario_id: user.id,
        ativo: termActive,
        termos_ignorados: termIgnored,
        search_method: termType === 'Livre' ? termSearchMethod : '',
      }
      if (editingTerm) {
        await pb.collection('termos_monitorados').update(editingTerm.id, data)
        toast({ title: 'Termo atualizado com sucesso' })
      } else {
        await pb.collection('termos_monitorados').create(data)
        toast({ title: 'Termo cadastrado com sucesso' })
      }
      setIsTermModalOpen(false)
      const res = await pb.collection('termos_monitorados').getFullList({
        filter: `usuario_id = "${user.id}"`,
        sort: '-created',
      })
      setTermos(res)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar termo', description: err.message, variant: 'destructive' })
    }
  }

  const handleDeleteTerm = async (id: string) => {
    try {
      await pb.collection('termos_monitorados').delete(id)
      toast({ title: 'Termo excluído' })
      setTermos((prev) => prev.filter((t) => t.id !== id))
    } catch (err: any) {
      toast({ title: 'Erro ao excluir termo', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Minha Conta</h1>
        <p className="text-slate-500 mt-1">
          Gerencie seu perfil, segurança e preferências de notificações.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 md:grid-cols-4 max-w-[700px]">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <BellRing className="w-4 h-4" /> Monitoramentos
          </TabsTrigger>
          {(user?.role === 'admin' || user?.role === 'manager' || user?.isAdmin) && (
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Zap className="w-4 h-4" /> Integrações
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seus dados básicos e foto de perfil.</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 m-4 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="avatar"
                      className="cursor-pointer text-sm text-primary font-medium hover:underline"
                    >
                      Alterar Foto
                    </Label>
                    <Input
                      id="avatar"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setAvatar(e.target.files[0])
                          setAvatarUrl(URL.createObjectURL(e.target.files[0]))
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome de Exibição</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (Login)</Label>
                    <Input value={email} disabled className="bg-slate-50 text-slate-500" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>RG / Documento</Label>
                    <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Endereço Completo</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
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
                <div className="space-y-2 max-w-sm">
                  <Label>Senha Atual</Label>
                  <Input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 max-w-sm">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 max-w-sm">
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
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Atualizar Senha
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Alertas</CardTitle>
              <CardDescription>
                Defina como e quando deseja receber notificações de novos andamentos, publicações
                DOU e comunicações PJe.
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
                    Se deixado em branco, enviaremos para o seu email principal.
                  </p>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <Label className="text-base font-semibold">Frequência do Resumo Agendado</Label>
                  <p className="text-sm text-slate-500 mb-4">
                    Receber um e-mail consolidado com todos os alertas na frequência selecionada.
                  </p>
                  <RadioGroup value={frequency} onValueChange={setFrequency} className="space-y-3">
                    <div
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                      onClick={() => setFrequency('daily')}
                    >
                      <RadioGroupItem value="daily" id="daily" className="mt-1" />
                      <div>
                        <Label htmlFor="daily" className="text-base font-medium cursor-pointer">
                          Diário
                        </Label>
                        <p className="text-sm text-slate-500">Resumo enviado todos os dias.</p>
                      </div>
                    </div>
                    <div
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                      onClick={() => setFrequency('weekly')}
                    >
                      <RadioGroupItem value="weekly" id="weekly" className="mt-1" />
                      <div>
                        <Label htmlFor="weekly" className="text-base font-medium cursor-pointer">
                          Semanal
                        </Label>
                        <p className="text-sm text-slate-500">Resumo enviado uma vez por semana.</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t py-4">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar Preferências
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Termos Monitorados</CardTitle>
                <CardDescription>
                  Configure os termos que deseja monitorar nos Diários Oficiais e PJe.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingTerm(null)
                  setTermText('')
                  setTermType('Livre')
                  setTermSearchMethod('palavra-chave')
                  setTermIgnored('')
                  setTermActive(true)
                  setIsTermModalOpen(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Novo Termo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                    <tr>
                      <th className="px-4 py-3">Termo</th>
                      <th className="px-4 py-3">Tipo / Busca</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {termos.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium">{t.termo}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700">
                            {t.tipo_termo}
                            {t.tipo_termo === 'Livre' && t.search_method && ` (${t.search_method})`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {t.ativo ? (
                            <span className="text-emerald-600 text-xs font-medium">Ativo</span>
                          ) : (
                            <span className="text-slate-500 text-xs font-medium">Inativo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTerm(t)
                              setTermText(t.termo)
                              setTermType(t.tipo_termo || 'Livre')
                              setTermSearchMethod(t.search_method || 'palavra-chave')
                              setTermIgnored(t.termos_ignorados || '')
                              setTermActive(t.ativo)
                              setIsTermModalOpen(true)
                            }}
                          >
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTerm(t.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {termos.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-500">
                          Nenhum termo monitorado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="integrations" className="mt-6">
          <IntegrationsManager />
        </TabsContent>
      </Tabs>

      <Dialog open={isTermModalOpen} onOpenChange={setIsTermModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTerm ? 'Editar Termo' : 'Novo Termo Monitorado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Termo</Label>
              <Input
                value={termText}
                onChange={(e) => setTermText(e.target.value)}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={termType} onValueChange={setTermType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nome Advogado">Nome Advogado</SelectItem>
                  <SelectItem value="Nome Parte">Nome Parte</SelectItem>
                  <SelectItem value="OAB">OAB</SelectItem>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="Livre">Livre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {termType === 'Livre' && (
              <div className="space-y-2">
                <Label>Forma de Busca</Label>
                <Select value={termSearchMethod} onValueChange={setTermSearchMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="palavra-chave">Palavra-chave</SelectItem>
                    <SelectItem value="frase_exata">Frase exata</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Termos Ignorados (opcional)</Label>
              <Input
                value={termIgnored}
                onChange={(e) => setTermIgnored(e.target.value)}
                placeholder="Ex: homônimo, outro"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch checked={termActive} onCheckedChange={setTermActive} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTermModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTerm}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

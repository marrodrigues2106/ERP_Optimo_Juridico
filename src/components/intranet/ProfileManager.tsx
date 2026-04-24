import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Camera, Save, Loader2, Building2, Activity, Zap, Search, Plus, Trash2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Link } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import IntegrationsManager from './IntegrationsManager'

export default function ProfileManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [alertConfig, setAlertConfig] = useState<any>({ frequencia: 'daily', ativo: true })
  const [savingAlert, setSavingAlert] = useState(false)

  const [termos, setTermos] = useState<any[]>([])
  const [newTermo, setNewTermo] = useState('')
  const [newTipoTermo, setNewTipoTermo] = useState('Outros')
  const [newSearchMethod, setNewSearchMethod] = useState('palavra-chave')

  const [fullName, setFullName] = useState(user?.fullName || user?.name || '')
  const [email] = useState(user?.email || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar ? pb.files.getURL(user, user.avatar) : null,
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [orgData, setOrgData] = useState({ name: '', cnpj: '', address: '', email: '' })
  const [savingOrg, setSavingOrg] = useState(false)

  useEffect(() => {
    if (user?.id) {
      pb.collection('termos_monitorados')
        .getFullList({ filter: `usuario_id="${user.id}"` })
        .then(setTermos)
        .catch(console.error)
    }
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
          email_destinatario: alertConfig.email_destinatario,
        })
      } else {
        const res = await pb.collection('configuracoes_alerta').create({
          usuario_id: user.id,
          frequencia: alertConfig.frequencia,
          ativo: alertConfig.ativo,
          tipo_notificacao: 'app',
          email_destinatario: alertConfig.email_destinatario,
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

  const handleAddTermo = async () => {
    if (!newTermo.trim()) return
    try {
      const res = await pb.collection('termos_monitorados').create({
        termo: newTermo.trim(),
        tipo_termo: newTipoTermo,
        search_method: newTipoTermo === 'Livre' ? newSearchMethod : undefined,
        usuario_id: user?.id,
        ativo: true,
      })
      setTermos([...termos, res])
      setNewTermo('')
      toast({ title: 'Termo adicionado!' })
    } catch (err) {
      toast({ title: 'Erro ao adicionar termo', variant: 'destructive' })
    }
  }

  const handleRemoveTermo = async (id: string) => {
    try {
      await pb.collection('termos_monitorados').delete(id)
      setTermos(termos.filter((t) => t.id !== id))
      toast({ title: 'Termo removido!' })
    } catch (err) {
      toast({ title: 'Erro ao remover termo', variant: 'destructive' })
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
            Monitoramentos
          </TabsTrigger>
          {(user?.role === 'admin' || user?.role === 'manager' || user?.isAdmin) && (
            <TabsTrigger value="integracoes" className="text-base px-4 py-2 font-medium">
              Integrações
            </TabsTrigger>
          )}
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

        {(user?.role === 'admin' || user?.role === 'manager' || user?.isAdmin) && (
          <TabsContent value="integracoes">
            <div className="max-w-2xl">
              <IntegrationsManager />
            </div>
          </TabsContent>
        )}

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
                  <Label className="text-base font-semibold">
                    E-mail para Recebimento de Alertas
                  </Label>
                  <Input
                    type="email"
                    value={alertConfig.email_destinatario || ''}
                    onChange={(e) =>
                      setAlertConfig({ ...alertConfig, email_destinatario: e.target.value })
                    }
                    placeholder="exemplo@dominio.com"
                    className="text-base py-6"
                  />
                  <p className="text-sm text-slate-500">
                    Se vazio, os alertas serão enviados para o seu e-mail de login da conta.
                  </p>
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

          <Card className="max-w-2xl border-slate-200 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Search className="w-6 h-6 text-primary" /> Termos Monitorados
              </CardTitle>
              <CardDescription className="text-base">
                Gerencie os nomes, CPFs, OABs ou outros termos que deseja monitorar nos diários e no
                PJe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Novo Termo</Label>
                  <Input
                    value={newTermo}
                    onChange={(e) => setNewTermo(e.target.value)}
                    placeholder="Ex: 123456/SP ou João da Silva"
                  />
                </div>
                <div className="w-full md:w-1/3 space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newTipoTermo} onValueChange={setNewTipoTermo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nome Advogado">Nome Advogado</SelectItem>
                      <SelectItem value="Nome Parte">Nome Parte</SelectItem>
                      <SelectItem value="OAB">OAB</SelectItem>
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="Livre">Livre</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newTipoTermo === 'Livre' && (
                  <div className="w-full md:w-1/3 space-y-2 animate-in fade-in slide-in-from-top-1">
                    <Label>Forma de busca</Label>
                    <Select value={newSearchMethod} onValueChange={setNewSearchMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="palavra-chave">Palavra-chave</SelectItem>
                        <SelectItem value="frase_exata">Frase exata</SelectItem>
                        <SelectItem value="regex">Expressão Regular (Regex)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-end">
                  <Button onClick={handleAddTermo} type="button" className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {termos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum termo configurado.
                  </p>
                ) : (
                  termos.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div>
                        <p className="font-medium">{t.termo}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.tipo_termo}
                          {t.tipo_termo === 'Livre' && t.search_method && ` - ${t.search_method}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveTermo(t.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

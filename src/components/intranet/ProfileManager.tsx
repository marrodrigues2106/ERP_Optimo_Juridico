import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Camera,
  Save,
  Loader2,
  X,
  Plus,
  Activity,
  Building2,
  ServerCrash,
  CheckCircle2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

export default function ProfileManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState(user?.fullName || user?.name || '')
  const [email] = useState(user?.email || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar ? pb.files.getURL(user, user.avatar) : null,
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [orgData, setOrgData] = useState({ name: '', cnpj: '', address: '', email: '' })
  const [savingOrg, setSavingOrg] = useState(false)

  const [config, setConfig] = useState<any>(null)
  const [configForm, setConfigForm] = useState<any>({
    dou_sections: '',
    queridoDiarioToken: '',
    apiKey: '',
    frequency: 'Daily',
    som: false,
  })

  const [comunicaUrl, setComunicaUrl] = useState('')
  const [comunicaKey, setComunicaKey] = useState('')

  const [termos, setTermos] = useState<any[]>([])
  const [novoTermo, setNovoTermo] = useState('')

  const [saving, setSaving] = useState(false)

  const loadSettings = async () => {
    try {
      const settings = await pb.collection('settings').getFullList()
      const urlSetting = settings.find((s) => s.key === 'comunica_pje_url')
      const keySetting = settings.find((s) => s.key === 'comunica_pje_key')
      if (urlSetting) setComunicaUrl(urlSetting.value)
      if (keySetting) setComunicaKey(keySetting.value)
    } catch (e) {
      console.error('Failed to load settings', e)
    }
  }

  const loadTermos = async () => {
    if (!user?.id) return
    try {
      const records = await pb.collection('termos_monitorados').getFullList({
        filter: `usuario_id = "${user.id}"`,
        sort: '-created',
      })
      setTermos(records)
    } catch (e) {
      console.error(e)
    }
  }

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

    pb.collection('monitoring_configs')
      .getFirstListItem('')
      .then((data) => {
        setConfig(data)
        setConfigForm({
          dou_sections: data.dou_sections || '',
          queridoDiarioToken: data.queridoDiarioToken || '',
          apiKey: data.apiKey || '',
          frequency: data.frequency || 'Daily',
          som: data.som ?? false,
        })
      })
      .catch((e) => console.error(e))

    loadSettings()
    loadTermos()
  }, [user])

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

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      if (config) {
        await pb.collection('monitoring_configs').update(config.id, {
          dou_sections: configForm.dou_sections,
          queridoDiarioToken: configForm.queridoDiarioToken,
          apiKey: configForm.apiKey,
          frequency: configForm.frequency,
          som: configForm.som,
        })
      } else {
        await pb.collection('monitoring_configs').create({
          apiKey: configForm.apiKey,
          frequency: configForm.frequency,
          som: configForm.som,
        })
      }

      try {
        const settings = await pb.collection('settings').getFullList()
        const urlSetting = settings.find((s) => s.key === 'comunica_pje_url')
        if (urlSetting) {
          await pb.collection('settings').update(urlSetting.id, { value: comunicaUrl })
        } else {
          await pb.collection('settings').create({ key: 'comunica_pje_url', value: comunicaUrl })
        }

        const keySetting = settings.find((s) => s.key === 'comunica_pje_key')
        if (keySetting) {
          await pb.collection('settings').update(keySetting.id, { value: comunicaKey })
        } else {
          await pb.collection('settings').create({ key: 'comunica_pje_key', value: comunicaKey })
        }
      } catch (settingsError) {
        console.error('Settings collection error', settingsError)
      }

      toast({ title: 'Configurações salvas com sucesso!' })
    } catch (err) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddTermo = async () => {
    if (!novoTermo.trim() || !user?.id) return
    try {
      await pb.collection('termos_monitorados').create({
        termo: novoTermo,
        tipo_termo: 'palavra-chave',
        ativo: true,
        usuario_id: user.id,
      })
      setNovoTermo('')
      loadTermos()
      toast({ title: 'Termo adicionado.' })
    } catch (err) {
      toast({ title: 'Erro ao adicionar termo', variant: 'destructive' })
    }
  }

  const toggleTermo = async (id: string, current: boolean) => {
    try {
      await pb.collection('termos_monitorados').update(id, { ativo: !current })
      loadTermos()
    } catch (e) {
      toast({ title: 'Erro ao atualizar termo', variant: 'destructive' })
    }
  }

  const deleteTermo = async (id: string) => {
    try {
      await pb.collection('termos_monitorados').delete(id)
      loadTermos()
    } catch (e) {
      toast({ title: 'Erro ao deletar termo', variant: 'destructive' })
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
            Monitoramento
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
                    <Label className="text-base">E-mail</Label>
                    <Input value={email} disabled className="bg-slate-50 text-base py-6" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">Nome Completo</Label>
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
                    <Label className="text-base">Nome da Organização</Label>
                    <Input
                      value={orgData.name}
                      onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                      required
                      className="text-base py-6"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">CNPJ</Label>
                    <Input
                      value={orgData.cnpj}
                      onChange={(e) => setOrgData({ ...orgData, cnpj: e.target.value })}
                      className="text-base py-6"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">E-mail de Contato</Label>
                    <Input
                      type="email"
                      value={orgData.email}
                      onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                      className="text-base py-6"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">Endereço Completo</Label>
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

        <TabsContent value="monitoramento" className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-slate-200 shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl">Termos Monitorados</CardTitle>
                <CardDescription className="text-base">
                  Gerencie palavras-chave e termos de busca oficiais.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex gap-2 mb-6">
                  <Input
                    placeholder="Novo termo de busca..."
                    value={novoTermo}
                    onChange={(e) => setNovoTermo(e.target.value)}
                    className="text-base"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTermo()}
                  />
                  <Button onClick={handleAddTermo} className="px-6 font-bold">
                    <Plus className="w-5 h-5 mr-2" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2">
                  {termos.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm"
                    >
                      <span className="font-bold text-slate-800">{t.termo}</span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={t.ativo}
                            onCheckedChange={() => toggleTermo(t.id, t.ativo)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTermo(t.id)}
                          className="hover:bg-red-50"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {termos.length === 0 && (
                    <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-lg border border-dashed">
                      Nenhum termo configurado.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8 flex flex-col">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Configurações de Sincronização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Frequência Global</Label>
                    <select
                      value={configForm.frequency}
                      onChange={(e) => setConfigForm({ ...configForm, frequency: e.target.value })}
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                    >
                      <option value="Hourly">A cada hora</option>
                      <option value="Daily">Diariamente</option>
                      <option value="Weekly">Semanalmente</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Chave API DataJud</Label>
                      <Input
                        type="password"
                        value={configForm.apiKey}
                        onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                        className="text-base py-5"
                        placeholder="Insira a chave da API..."
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Token Querido Diário (DOU)</Label>
                      <Input
                        type="password"
                        value={configForm.queridoDiarioToken}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, queridoDiarioToken: e.target.value })
                        }
                        className="text-base py-5"
                        placeholder="Token..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Comunica PJe - API URL</Label>
                      <Input
                        value={comunicaUrl}
                        onChange={(e) => setComunicaUrl(e.target.value)}
                        className="text-base py-5"
                        placeholder="Endpoint..."
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Comunica PJe - API Key</Label>
                      <Input
                        type="password"
                        value={comunicaKey}
                        onChange={(e) => setComunicaKey(e.target.value)}
                        className="text-base py-5"
                        placeholder="Token..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                      <Label className="text-base font-medium">Notificações Sonoras (App)</Label>
                      <p className="text-sm text-slate-500 mt-1">
                        Ativar alertas sonoros no navegador.
                      </p>
                    </div>
                    <Switch
                      checked={configForm.som}
                      onCheckedChange={(c) => setConfigForm({ ...configForm, som: c })}
                    />
                  </div>

                  <Button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="w-full py-6 text-base font-bold"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5 mr-2" />
                    )}
                    Salvar Configurações de Monitoramento
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm flex-1">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Saúde dos Serviços (PJe / DataJud)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/80">
                    <div className="flex items-center gap-3">
                      {config?.pje_status === 'online' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <ServerCrash className="w-6 h-6 text-red-500" />
                      )}
                      <div>
                        <div className="font-bold text-slate-800">Status PJe API</div>
                        <div className="text-sm text-slate-500 font-medium">
                          Disponibilidade do serviço oficial
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={config?.pje_status === 'online' ? 'default' : 'destructive'}
                      className={
                        config?.pje_status === 'online' ? 'bg-emerald-500 text-sm' : 'text-sm'
                      }
                    >
                      {config?.pje_status === 'online' ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/80">
                    <div className="flex items-center gap-3">
                      {config?.pje_connection_status === 'connected' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <ServerCrash className="w-6 h-6 text-red-500" />
                      )}
                      <div>
                        <div className="font-bold text-slate-800">Conexão Comunica PJe</div>
                        <div className="text-sm text-slate-500 font-medium">
                          Conectividade local configurada
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        config?.pje_connection_status === 'connected' ? 'default' : 'destructive'
                      }
                      className={
                        config?.pje_connection_status === 'connected'
                          ? 'bg-emerald-500 text-sm'
                          : 'text-sm'
                      }
                    >
                      {config?.pje_connection_status === 'connected' ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/80">
                    <div className="flex items-center gap-3">
                      {config?.datajudStatus === 'online' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <Activity className="w-6 h-6 text-amber-500" />
                      )}
                      <div>
                        <div className="font-bold text-slate-800">Sincronização DataJud</div>
                        <div className="text-sm text-slate-500 font-medium">
                          Última verificação:{' '}
                          {config?.datajudLastCheckAt
                            ? new Date(config.datajudLastCheckAt).toLocaleString('pt-BR')
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={config?.datajudStatus === 'online' ? 'default' : 'secondary'}
                      className={
                        config?.datajudStatus === 'online' ? 'bg-emerald-500 text-sm' : 'text-sm'
                      }
                    >
                      {config?.datajudStatus === 'online' ? 'Operacional' : 'Desconhecido'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

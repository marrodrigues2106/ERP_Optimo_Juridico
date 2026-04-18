import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Camera, History, Save, Loader2, X, Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

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

  const [config, setConfig] = useState<any>(null)
  const [configForm, setConfigForm] = useState<any>({
    dou_sections: '',
    douCredentials: '',
    termos_busca: '',
    queridoDiarioToken: '',
    apiKey: '',
    datajud_tribunal_status: '',
    frequency: 'Daily',
    default_cpf_cnpj: '',
    default_numero_processo: '',
  })

  const [comunicaUrl, setComunicaUrl] = useState('')
  const [comunicaKey, setComunicaKey] = useState('')

  const [termos, setTermos] = useState<any[]>([])
  const [novoTermo, setNovoTermo] = useState('')

  const [searches, setSearches] = useState<any[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [saving, setSaving] = useState(false)

  const loadSettings = async () => {
    try {
      const settings = await pb.collection('settings').getFullList()
      const urlSetting = settings.find((s) => s.key === 'comunica_pje_url')
      const keySetting = settings.find((s) => s.key === 'comunica_pje_key')
      if (urlSetting) setComunicaUrl(urlSetting.value)
      if (keySetting) setComunicaKey(keySetting.value)
    } catch (e) {
      // settings module might not be ready or empty
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
    pb.collection('monitoring_configs')
      .getFirstListItem('')
      .then((data) => {
        setConfig(data)
        setConfigForm({
          dou_sections: data.dou_sections || '',
          douCredentials: data.douCredentials ? JSON.stringify(data.douCredentials, null, 2) : '',
          termos_busca: data.termos_busca ? JSON.stringify(data.termos_busca, null, 2) : '',
          queridoDiarioToken: data.queridoDiarioToken || '',
          apiKey: data.apiKey || '',
          datajud_tribunal_status: data.datajud_tribunal_status
            ? JSON.stringify(data.datajud_tribunal_status, null, 2)
            : '',
          frequency: data.frequency || 'Daily',
          default_cpf_cnpj: data.default_cpf_cnpj || '',
          default_numero_processo: data.default_numero_processo || '',
        })
      })
      .catch((e) => console.error(e))

    loadSettings()
    loadTermos()
  }, [user])

  const loadSearches = async (page = 1) => {
    try {
      const res = await pb.collection('searches').getList(page, 15, { sort: '-created' })
      setSearches(res.items)
      setHistoryPage(res.page)
      setHistoryTotalPages(res.totalPages)
    } catch (err) {
      console.error(err)
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

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      if (config) {
        await pb.collection('monitoring_configs').update(config.id, {
          dou_sections: configForm.dou_sections,
          douCredentials: configForm.douCredentials ? JSON.parse(configForm.douCredentials) : null,
          termos_busca: configForm.termos_busca ? JSON.parse(configForm.termos_busca) : null,
          queridoDiarioToken: configForm.queridoDiarioToken,
          apiKey: configForm.apiKey,
          datajud_tribunal_status: configForm.datajud_tribunal_status
            ? JSON.parse(configForm.datajud_tribunal_status)
            : null,
          frequency: configForm.frequency,
          default_cpf_cnpj: configForm.default_cpf_cnpj,
          default_numero_processo: configForm.default_numero_processo,
        })
      } else {
        await pb.collection('monitoring_configs').create({
          apiKey: configForm.apiKey,
          frequency: configForm.frequency,
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
      toast({
        title: 'Erro ao salvar configurações',
        description: 'Verifique o formato dos dados.',
        variant: 'destructive',
      })
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
      <Tabs
        defaultValue="perfil"
        className="w-full animate-fade-in"
        onValueChange={(v) => v === 'historico' && loadSearches(1)}
      >
        <TabsList className="mb-8 flex-wrap bg-slate-100 p-1.5 rounded-lg gap-1 h-auto">
          <TabsTrigger value="perfil" className="text-base px-4 py-2 font-medium">
            Perfil
          </TabsTrigger>
          <TabsTrigger value="monitoramento-geral" className="text-base px-4 py-2 font-medium">
            Configurações Gerais de Monitoramento
          </TabsTrigger>
          <TabsTrigger value="monitoramento-dou" className="text-base px-4 py-2 font-medium">
            Monitoramento DOU
          </TabsTrigger>
          <TabsTrigger value="monitoramento-datajud" className="text-base px-4 py-2 font-medium">
            Monitoramento Datajud
          </TabsTrigger>
          <TabsTrigger value="monitoramento-pje" className="text-base px-4 py-2 font-medium">
            Comunica PJe
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-base px-4 py-2 font-medium">
            Histórico de Buscas
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

        <TabsContent value="monitoramento-geral">
          <Card className="max-w-4xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Configurações Gerais de Monitoramento</CardTitle>
              <CardDescription className="text-base">
                Frequência global de monitoramento e termos de busca do Diário Oficial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-3 max-w-sm">
                <Label className="text-base font-medium">
                  Frequência de Sincronização (DOU e PJe)
                </Label>
                <select
                  value={configForm.frequency}
                  onChange={(e) => setConfigForm({ ...configForm, frequency: e.target.value })}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Hourly">A cada hora</option>
                  <option value="Daily">Diariamente</option>
                  <option value="Weekly">Semanalmente</option>
                </select>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-xl font-bold mb-4">Gerenciamento de Termos (DOU)</h3>
                <div className="flex gap-2 mb-6">
                  <Input
                    placeholder="Novo termo de busca..."
                    value={novoTermo}
                    onChange={(e) => setNovoTermo(e.target.value)}
                    className="text-base"
                  />
                  <Button onClick={handleAddTermo} className="px-6 font-bold">
                    <Plus className="w-5 h-5 mr-2" /> Adicionar
                  </Button>
                </div>

                <div className="space-y-3">
                  {termos.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm"
                    >
                      <div>
                        <span className="font-bold text-slate-800 text-lg">{t.termo}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={t.ativo}
                            onCheckedChange={() => toggleTermo(t.id, t.ativo)}
                          />
                          <span className="text-sm font-medium text-slate-600">
                            {t.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTermo(t.id)}
                          className="hover:bg-red-50"
                        >
                          <X className="w-5 h-5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {termos.length === 0 && (
                    <p className="text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-dashed">
                      Nenhum termo configurado.
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={saving}
                className="py-6 px-8 text-base font-bold mt-4"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Salvar Configurações Gerais
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoramento-dou">
          <Card className="max-w-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Monitoramento DOU</CardTitle>
              <CardDescription className="text-base">
                Gerencie as credenciais e os termos monitorados no Diário Oficial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Token Querido Diário</Label>
                  <Input
                    type="password"
                    value={configForm.queridoDiarioToken}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, queridoDiarioToken: e.target.value })
                    }
                    className="text-base py-6"
                    placeholder="Token do Querido Diário..."
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-medium">Credenciais IN.GOV (JSON)</Label>
                  <textarea
                    value={configForm.douCredentials}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, douCredentials: e.target.value })
                    }
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-4 py-3 text-base font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder='{"user": "...", "pass": "..."}'
                  />
                </div>

                <Button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="py-6 px-8 text-base font-bold mt-4"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoramento-datajud">
          <Card className="max-w-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Monitoramento Datajud</CardTitle>
              <CardDescription className="text-base">
                Chaves e status para sincronização com tribunais pelo DataJud API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">API Key (DataJud)</Label>
                  <Input
                    type="password"
                    value={configForm.apiKey}
                    onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                    className="text-base py-6"
                    placeholder="Insira a chave da API..."
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-medium">Status Tribunais (JSON)</Label>
                  <textarea
                    value={configForm.datajud_tribunal_status}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, datajud_tribunal_status: e.target.value })
                    }
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-4 py-3 text-base font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder='{"TJSP": "active", "TRF3": "error"}'
                  />
                </div>
                <Button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="py-6 px-8 text-base font-bold"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoramento-pje">
          <Card className="max-w-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Monitoramento Comunica PJe</CardTitle>
              <CardDescription className="text-base">
                Configurações para as buscas no painel Comunica PJe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">API URL (Endpoint Comunica PJe)</Label>
                  <Input
                    value={comunicaUrl}
                    onChange={(e) => setComunicaUrl(e.target.value)}
                    className="text-base py-6"
                    placeholder="https://comunicaapi.pje.jus.br/api/v1"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-medium">API Key (Token Comunica PJe)</Label>
                  <Input
                    type="password"
                    value={comunicaKey}
                    onChange={(e) => setComunicaKey(e.target.value)}
                    className="text-base py-6"
                    placeholder="Bearer token ou API Key..."
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-medium">CPF/CNPJ Padrão</Label>
                  <Input
                    value={configForm.default_cpf_cnpj}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, default_cpf_cnpj: e.target.value })
                    }
                    className="text-base py-6"
                    placeholder="000.000.000-00"
                  />
                </div>
                <Button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="py-6 px-8 text-base font-bold"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <History className="w-6 h-6 text-primary" /> Histórico de Buscas
              </CardTitle>
              <CardDescription className="text-base">
                Todas as pesquisas centralizadas realizadas nos módulos integrados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searches.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-lg">
                  Nenhum histórico disponível ainda.
                </div>
              ) : (
                <div className="space-y-4">
                  {searches.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm bg-white"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-xl">
                          {s.term || 'Busca Múltipla'}
                        </p>
                        <p className="text-base text-slate-600 mt-2">
                          Módulo:{' '}
                          <span className="uppercase font-bold text-primary">
                            {s.search_type || 'Comunica PJe'}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end mt-4 md:mt-0 gap-3">
                        <span className="text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                          {new Date(s.created).toLocaleString('pt-BR')}
                        </span>
                        {s.results_count !== undefined && (
                          <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                            {s.results_count} resultados
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {historyTotalPages > 1 && (
                    <Pagination className="mt-8 pt-6 border-t border-slate-100">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              loadSearches(Math.max(1, historyPage - 1))
                            }}
                            className={
                              historyPage === 1
                                ? 'pointer-events-none opacity-50 text-base'
                                : 'text-base font-bold cursor-pointer'
                            }
                          />
                        </PaginationItem>
                        <span className="text-base text-slate-500 mx-6 font-medium flex items-center">
                          Página <strong className="mx-2 text-slate-900">{historyPage}</strong> de{' '}
                          <strong className="ml-2 text-slate-900">{historyTotalPages}</strong>
                        </span>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              loadSearches(Math.min(historyTotalPages, historyPage + 1))
                            }}
                            className={
                              historyPage === historyTotalPages
                                ? 'pointer-events-none opacity-50 text-base'
                                : 'text-base font-bold cursor-pointer'
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

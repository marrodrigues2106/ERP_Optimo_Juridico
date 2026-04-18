import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Camera, CheckCircle2, AlertCircle, History, Save, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    frequency: '',
    default_cpf_cnpj: '',
    default_numero_processo: '',
  })

  const [searches, setSearches] = useState<any[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [saving, setSaving] = useState(false)

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
          frequency: data.frequency || '',
          default_cpf_cnpj: data.default_cpf_cnpj || '',
          default_numero_processo: data.default_numero_processo || '',
        })
      })
      .catch((e) => console.error(e))
  }, [])

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
    if (!config) return
    setSaving(true)
    try {
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
      toast({ title: 'Configurações salvas com sucesso!' })
      const updated = await pb.collection('monitoring_configs').getOne(config.id)
      setConfig(updated)
    } catch (err) {
      toast({
        title: 'Erro ao salvar configurações',
        description: 'Verifique o formato do JSON.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">
        Configurações e Perfil
      </h1>
      <Tabs
        defaultValue="perfil"
        className="w-full animate-fade-in"
        onValueChange={(v) => v === 'historico' && loadSearches(1)}
      >
        <TabsList className="mb-8 flex-wrap bg-slate-100 p-1.5 rounded-lg gap-1">
          <TabsTrigger value="perfil" className="text-base px-4 py-2 font-medium">
            Perfil
          </TabsTrigger>
          <TabsTrigger value="monitoramento-dou" className="text-base px-4 py-2 font-medium">
            Monitoramento DOU
          </TabsTrigger>
          <TabsTrigger value="monitoramento-datajud" className="text-base px-4 py-2 font-medium">
            Monitoramento Datajud
          </TabsTrigger>
          <TabsTrigger value="monitoramento-pje" className="text-base px-4 py-2 font-medium">
            Monitoramento PJe
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
                  <Button type="submit" className="w-full py-6 text-base font-medium">
                    Salvar Perfil
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoramento-dou">
          <Card className="max-w-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Monitoramento DOU</CardTitle>
              <CardDescription className="text-base">
                Configurações para a integração e raspagem do Diário Oficial da União.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="p-5 bg-slate-50 border rounded-xl flex items-start gap-4 shadow-sm">
                {config?.douStatus === 200 ? (
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                ) : (
                  <div className="bg-amber-100 p-2 rounded-full">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-slate-900">Status da Integração DOU</p>
                  <p className="text-base text-slate-600 mt-1">
                    {config?.douStatus === 200
                      ? 'Operacional e raspando ativamente.'
                      : 'Inativo ou com falhas. Aguardando verificação.'}
                  </p>
                  {config?.douError && (
                    <p className="text-sm font-medium text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">
                      {config.douError}
                    </p>
                  )}
                  {config?.douLatency && (
                    <p className="text-sm text-slate-500 mt-1">
                      Latência de resposta: {config.douLatency}ms
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Seções do DOU</Label>
                  <Input
                    value={configForm.dou_sections}
                    onChange={(e) => setConfigForm({ ...configForm, dou_sections: e.target.value })}
                    placeholder="Ex: do1, do2, do3"
                    className="text-base py-6"
                  />
                </div>
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
                <div className="space-y-3">
                  <Label className="text-base font-medium">Termos de Busca (JSON)</Label>
                  <textarea
                    value={configForm.termos_busca}
                    onChange={(e) => setConfigForm({ ...configForm, termos_busca: e.target.value })}
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-4 py-3 text-base font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder='["termo1", "termo2"]'
                  />
                </div>
                <Button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="py-6 px-8 text-base font-medium"
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
                  <Label className="text-base font-medium">Frequência de Sincronização</Label>
                  <Input
                    value={configForm.frequency}
                    onChange={(e) => setConfigForm({ ...configForm, frequency: e.target.value })}
                    className="text-base py-6"
                    placeholder="Ex: Daily, Hourly"
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
                  className="py-6 px-8 text-base font-medium"
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
              <CardTitle className="text-2xl">Monitoramento PJe</CardTitle>
              <CardDescription className="text-base">
                Configurações para as buscas automáticas no painel Comunica PJe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
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
                <div className="space-y-3">
                  <Label className="text-base font-medium">Número de Processo Padrão</Label>
                  <Input
                    value={configForm.default_numero_processo}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, default_numero_processo: e.target.value })
                    }
                    className="text-base py-6"
                    placeholder="0000000-00.0000..."
                  />
                </div>
                <Button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="py-6 px-8 text-base font-medium"
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
                      className="flex flex-col md:flex-row md:items-center justify-between p-6 border rounded-xl hover:bg-slate-50 transition-colors shadow-sm bg-white"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-xl">
                          {s.term || 'Busca Múltipla'}
                        </p>
                        <p className="text-base text-slate-600 mt-2">
                          Módulo:{' '}
                          <span className="uppercase font-semibold text-primary">
                            {s.search_type || 'Comunica PJe'}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end mt-4 md:mt-0 gap-3">
                        <span className="text-base font-medium text-slate-600 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                          {new Date(s.created).toLocaleString('pt-BR')}
                        </span>
                        {s.results_count !== undefined && (
                          <span className="text-base font-bold text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-lg border border-emerald-100">
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
                                : 'text-base font-medium'
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
                                : 'text-base font-medium'
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

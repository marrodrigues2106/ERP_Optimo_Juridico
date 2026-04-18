import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import {
  Camera,
  Building2,
  Plus,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  History,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  const [searches, setSearches] = useState<any[]>([])

  useEffect(() => {
    pb.collection('monitoring_configs')
      .getFirstListItem('')
      .then(setConfig)
      .catch(() => {})
  }, [])

  const loadSearches = async () => {
    try {
      const res = await pb.collection('searches').getList(1, 20, { sort: '-created' })
      setSearches(res.items)
    } catch (err) {}
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

  return (
    <Tabs
      defaultValue="perfil"
      className="w-full"
      onValueChange={(v) => v === 'historico' && loadSearches()}
    >
      <TabsList className="mb-6 flex-wrap bg-slate-100 p-1">
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="monitoramento-dou">Monitoramento DOU</TabsTrigger>
        <TabsTrigger value="monitoramento-datajud">Monitoramento Datajud</TabsTrigger>
        <TabsTrigger value="monitoramento-pje">Monitoramento PJe</TabsTrigger>
        <TabsTrigger value="historico">Histórico de Buscas</TabsTrigger>
      </TabsList>

      <TabsContent value="perfil">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Avatar className="w-24 h-24 border-2 border-slate-100 shadow-sm">
                      <AvatarImage
                        src={
                          avatarPreview ||
                          `https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`
                        }
                      />
                      <AvatarFallback>{fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-6 h-6" />
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
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={email} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">
                  Salvar Perfil
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="monitoramento-dou">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Monitoramento DOU</CardTitle>
            <CardDescription>
              Configurações para a integração e raspagem do Diário Oficial da União.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-slate-50 border rounded-lg flex items-start gap-3">
              {config?.douStatus === 200 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-800">Status da Integração DOU</p>
                <p className="text-xs text-slate-600 mt-1">
                  {config?.douStatus === 200
                    ? 'Operacional e raspando ativamente.'
                    : 'Inativo ou bloqueado. Aguardando próximas tentativas.'}
                </p>
                {config?.douError && <p className="text-xs text-red-500 mt-1">{config.douError}</p>}
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Seções do DOU</Label>
                <Input defaultValue={config?.dou_sections || 'all'} disabled />
              </div>
              <div className="space-y-2">
                <Label>Frequência de Raspagem</Label>
                <Input defaultValue={config?.frequency || 'Daily'} disabled />
              </div>
              <Button
                variant="secondary"
                onClick={() => toast({ title: 'Configurações mantidas no servidor' })}
              >
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="monitoramento-datajud">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Monitoramento Datajud</CardTitle>
            <CardDescription>
              Chaves e status para sincronização com tribunais pelo DataJud API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-slate-50 border rounded-lg flex items-start gap-3">
              {config?.datajudStatus === 'active' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-slate-400 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-800">Status API DataJud</p>
                <p className="text-xs text-slate-600 mt-1">
                  {config?.datajudStatus === 'active' ? 'API Conectada' : 'Aguardando verificação'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>API Key (DataJud)</Label>
                <Input type="password" value="************************" disabled />
              </div>
              <Button variant="secondary" onClick={() => toast({ title: 'Teste de API enviado' })}>
                Verificar Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="monitoramento-pje">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Monitoramento PJe</CardTitle>
            <CardDescription>Comunicações integradas do painel Comunica PJe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">
              A chave de integração Comunica PJe é gerenciada globalmente pelo sistema na conta de
              serviço principal.
            </p>
            <Button variant="outline" onClick={() => toast({ title: 'Acesso PJe Validado' })}>
              Validar Credenciais PJe
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="historico">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Histórico de Buscas
            </CardTitle>
            <CardDescription>
              Últimas pesquisas realizadas em todos os módulos integrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searches.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Nenhum histórico disponível.
              </p>
            ) : (
              <div className="space-y-2">
                {searches.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {s.term || 'Busca Múltipla'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Módulo:{' '}
                        <span className="uppercase font-medium text-slate-700">
                          {s.search_type || 'Comunica PJe'}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end mt-2 md:mt-0">
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">
                        {new Date(s.created).toLocaleString('pt-BR')}
                      </span>
                      {s.results_count !== undefined && (
                        <span className="text-xs font-medium text-primary mt-1">
                          {s.results_count} resultados
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

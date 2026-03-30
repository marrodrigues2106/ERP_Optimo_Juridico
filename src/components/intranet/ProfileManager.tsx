import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { Camera, Building2, Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MonitoringManager from './MonitoringManager'

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
  const [profileErrors, setProfileErrors] = useState<any>({})

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdErrors, setPwdErrors] = useState<any>({})

  const [org, setOrg] = useState<any>(null)
  const [orgName, setOrgName] = useState('')
  const [orgCnpj, setOrgCnpj] = useState('')
  const [orgAddress, setOrgAddress] = useState('')
  const [orgEmail, setOrgEmail] = useState('')
  const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(null)
  const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null)
  const orgLogoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.active_organization) {
      pb.collection('organizations')
        .getOne(user.active_organization)
        .then((o) => {
          setOrg(o)
          setOrgName(o.name || '')
          setOrgCnpj(o.cnpj || '')
          setOrgAddress(o.address || '')
          setOrgEmail(o.email || '')
          if (o.logo) setOrgLogoPreview(pb.files.getURL(o, o.logo))
        })
    }
  }, [user])

  const handleOrgLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setOrgLogoFile(file)
      setOrgLogoPreview(URL.createObjectURL(file))
    }
  }

  const [orgs, setOrgs] = useState<any[]>([])
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgCnpj, setNewOrgCnpj] = useState('')
  const [newOrgAddress, setNewOrgAddress] = useState('')
  const [newOrgEmail, setNewOrgEmail] = useState('')
  const [newOrgLogoFile, setNewOrgLogoFile] = useState<File | null>(null)
  const [newOrgLogoPreview, setNewOrgLogoPreview] = useState<string | null>(null)
  const newOrgLogoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        if (user?.organizations && user.organizations.length > 0) {
          const orgList = await pb.collection('organizations').getFullList({
            filter: user.organizations.map((id: string) => `id="${id}"`).join(' || '),
          })
          setOrgs(orgList)
        } else if (user?.active_organization) {
          const activeOrg = await pb.collection('organizations').getOne(user.active_organization)
          setOrgs([activeOrg])
        }
      } catch (err) {
        console.error('Error fetching orgs', err)
      }
    }
    fetchOrgs()
  }, [user])

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return
    try {
      const formData = new FormData()
      formData.append('name', orgName)
      formData.append('cnpj', orgCnpj)
      formData.append('address', orgAddress)
      formData.append('email', orgEmail)
      if (orgLogoFile) formData.append('logo', orgLogoFile)

      await pb.collection('organizations').update(org.id, formData)
      toast({ title: 'Organização atualizada com sucesso!' })
      window.location.reload()
    } catch (err) {
      toast({ title: 'Erro ao atualizar organização', variant: 'destructive' })
    }
  }

  const handleNewOrgLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewOrgLogoFile(file)
      setNewOrgLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName) return
    try {
      const fd = new FormData()
      fd.append('name', newOrgName)
      fd.append('cnpj', newOrgCnpj)
      fd.append('address', newOrgAddress)
      fd.append('email', newOrgEmail)
      if (newOrgLogoFile) fd.append('logo', newOrgLogoFile)

      const newOrg = await pb.collection('organizations').create(fd)
      await pb.collection('users').update(user.id, {
        'organizations+': newOrg.id,
        active_organization: newOrg.id,
      })
      toast({ title: 'Organização criada com sucesso!' })
      window.location.reload()
    } catch (err) {
      toast({ title: 'Erro ao criar organização', variant: 'destructive' })
    }
  }

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === user.active_organization) return
    try {
      await pb.collection('users').update(user.id, {
        active_organization: orgId,
      })
      toast({ title: 'Organização alterada com sucesso!' })
      window.location.reload()
    } catch (err) {
      toast({ title: 'Erro ao alterar organização', variant: 'destructive' })
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileErrors({})
    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('name', fullName) // also keep base name updated
      if (avatarFile) formData.append('avatar', avatarFile)

      await pb.collection('users').update(user.id, formData)
      toast({ title: 'Perfil atualizado com sucesso!' })
    } catch (err) {
      setProfileErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' })
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdErrors({})
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
    } catch (err) {
      setPwdErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao atualizar senha', variant: 'destructive' })
    }
  }

  return (
    <Tabs defaultValue="perfil" className="w-full">
      <TabsList className="mb-6 flex-wrap">
        <TabsTrigger value="perfil">Perfil e Segurança</TabsTrigger>
        <TabsTrigger value="monitoramento">Monitoramento & Push</TabsTrigger>
        <TabsTrigger value="organizacao">Minha Organização</TabsTrigger>
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
                      onChange={handleAvatarChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" value={email} disabled className="bg-slate-50" />
                  <p className="text-xs text-muted-foreground">
                    O e-mail não pode ser alterado por aqui.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  {profileErrors.fullName && (
                    <p className="text-xs text-destructive">{profileErrors.fullName}</p>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  Salvar Perfil
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Senha Atual</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                  {pwdErrors.oldPassword && (
                    <p className="text-xs text-destructive">{pwdErrors.oldPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  {pwdErrors.password && (
                    <p className="text-xs text-destructive">{pwdErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {pwdErrors.passwordConfirm && (
                    <p className="text-xs text-destructive">{pwdErrors.passwordConfirm}</p>
                  )}
                </div>

                <Button type="submit" variant="secondary" className="w-full">
                  Atualizar Senha
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="monitoramento">
        <MonitoringManager />
      </TabsContent>

      <TabsContent value="organizacao">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Dados da Organização Ativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {org ? (
                <form onSubmit={handleOrgSubmit} className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <Label>Logotipo do Escritório</Label>
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => orgLogoRef.current?.click()}
                    >
                      <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shadow-sm">
                        {orgLogoPreview ? (
                          <img
                            src={orgLogoPreview}
                            alt="Logo"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <Building2 className="w-10 h-10 text-slate-300" />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-6 h-6" />
                      </div>
                      <input
                        type="file"
                        ref={orgLogoRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleOrgLogoChange}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Recomendado: Imagem PNG ou SVG com fundo transparente.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Razão Social</Label>
                      <Input
                        id="orgName"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgCnpj">CNPJ</Label>
                      <Input
                        id="orgCnpj"
                        value={orgCnpj}
                        onChange={(e) => setOrgCnpj(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgAddress">Endereço Completo</Label>
                      <Input
                        id="orgAddress"
                        value={orgAddress}
                        onChange={(e) => setOrgAddress(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgEmail">E-mail Institucional</Label>
                      <Input
                        id="orgEmail"
                        type="email"
                        value={orgEmail}
                        onChange={(e) => setOrgEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    Salvar Organização
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Nenhuma organização ativa encontrada.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Minhas Organizações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Alternar Organização Ativa</Label>
                <div className="flex flex-col gap-3">
                  {orgs.map((o) => (
                    <div
                      key={o.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${o.id === user.active_organization ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-primary/30 hover:bg-slate-50/50'}`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-base text-foreground">{o.name}</span>
                        {o.cnpj && <span className="text-xs text-muted-foreground">{o.cnpj}</span>}
                      </div>
                      {o.id === user.active_organization ? (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-md uppercase tracking-wider">
                          Ativa
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSwitchOrg(o.id)}
                          className="h-8 text-xs font-medium"
                        >
                          Trocar
                        </Button>
                      )}
                    </div>
                  ))}
                  {orgs.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma organização associada.</p>
                  )}
                </div>
              </div>

              {['admin', 'manager'].includes(user?.role) && (
                <div className="pt-6 mt-6 border-t border-slate-100">
                  {!isCreatingOrg ? (
                    <Button
                      variant="outline"
                      className="w-full py-6 border-dashed"
                      onClick={() => setIsCreatingOrg(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Organização
                    </Button>
                  ) : (
                    <form
                      onSubmit={handleCreateOrg}
                      className="space-y-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Label>Logotipo</Label>
                        <div
                          className="relative group cursor-pointer"
                          onClick={() => newOrgLogoRef.current?.click()}
                        >
                          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden">
                            {newOrgLogoPreview ? (
                              <img
                                src={newOrgLogoPreview}
                                alt="Logo"
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <Camera className="w-6 h-6 text-slate-300" />
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Plus className="w-5 h-5" />
                          </div>
                          <input
                            type="file"
                            ref={newOrgLogoRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleNewOrgLogoChange}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="newOrgName">Razão Social</Label>
                          <Input
                            id="newOrgName"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            placeholder="Ex: Novo Escritório Advocacia"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newOrgCnpj">CNPJ</Label>
                          <Input
                            id="newOrgCnpj"
                            value={newOrgCnpj}
                            onChange={(e) => setNewOrgCnpj(e.target.value)}
                            placeholder="00.000.000/0000-00"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newOrgAddress">Endereço</Label>
                          <Input
                            id="newOrgAddress"
                            value={newOrgAddress}
                            onChange={(e) => setNewOrgAddress(e.target.value)}
                            placeholder="Av. Paulista, 1000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newOrgEmail">E-mail Institucional</Label>
                          <Input
                            id="newOrgEmail"
                            type="email"
                            value={newOrgEmail}
                            onChange={(e) => setNewOrgEmail(e.target.value)}
                            placeholder="contato@escritorio.com.br"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button type="submit" className="w-full">
                          Criar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => setIsCreatingOrg(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}

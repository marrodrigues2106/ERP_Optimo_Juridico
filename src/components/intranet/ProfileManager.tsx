import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Camera, Save, Loader2, Building2 } from 'lucide-react'
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

  const [orgData, setOrgData] = useState({ name: '', cnpj: '', address: '', email: '' })
  const [savingOrg, setSavingOrg] = useState(false)

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
      </Tabs>
    </div>
  )
}

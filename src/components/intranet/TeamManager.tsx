import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserPlus, Mail, Phone, Trash2, Edit2, FileBadge, Loader2, Camera } from 'lucide-react'
import {
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
} from '@/services/collaborators'
import { getLegalCases } from '@/services/legal_cases'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'

export default function TeamManager() {
  const [team, setTeam] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  // Filters
  const [roleFilter, setRoleFilter] = useState<string[]>([])
  const [caseFilter, setCaseFilter] = useState<string>('all')

  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<any[]>([])

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    try {
      setTeam(await getCollaborators())
      const allCases = await getLegalCases()
      setCases(
        allCases.filter((c) => c.responsible_collaborator && c.lifecycle_status !== 'Excluído'),
      )
      if (
        currentUser?.isAdmin ||
        currentUser?.role === 'admin' ||
        currentUser?.role === 'manager'
      ) {
        const uList = await pb.collection('users').getFullList()
        setUsers(uList)
      }
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('collaborators', loadData)

  const handleOpenNew = () => {
    setEditingItem(null)
    setAvatarFile(null)
    setAvatarPreview(null)
    setOpen(true)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setAvatarFile(null)
    if (item.avatar) {
      setAvatarPreview(pb.files.getURL(item, item.avatar))
    } else {
      setAvatarPreview(null)
    }
    setOpen(true)
  }

  const [submitting, setSubmitting] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)

    const fullName = fd.get('fullName') as string
    if (fullName) fd.set('name', fullName)

    if (fd.get('user') === 'none') fd.delete('user')

    const birthDate = fd.get('birthDate') as string
    if (birthDate) {
      const d = new Date(birthDate)
      if (!isNaN(d.getTime())) fd.set('birthDate', d.toISOString())
    } else {
      fd.delete('birthDate')
    }

    if (avatarFile) {
      fd.set('avatar', avatarFile)
    } else {
      fd.delete('avatar')
    }

    try {
      if (editingItem) {
        await updateCollaborator(editingItem.id, fd)
        toast({ title: 'Membro da equipe atualizado' })
      } else {
        await createCollaborator(fd)
        toast({ title: 'Membro da equipe adicionado' })
      }
      setOpen(false)
      loadData()
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este membro?')) {
      await deleteCollaborator(id)
    }
  }

  const roles = ['Advogado', 'Associado', 'Administrativo']

  const filteredTeam = team.filter((member) => {
    const matchRole = roleFilter.length === 0 || roleFilter.includes(member.role)
    const matchCase =
      caseFilter === 'all' ||
      cases.some((c) => {
        if (Array.isArray(c.responsible_collaborator)) {
          return c.id === caseFilter && c.responsible_collaborator.includes(member.id)
        }
        return c.id === caseFilter && c.responsible_collaborator === member.id
      })
    return matchRole && matchCase
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Gestão de Equipe</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <UserPlus className="w-4 h-4 mr-2" /> Adicionar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Membro' : 'Novo Membro da Equipe'}</DialogTitle>
            </DialogHeader>
            <form key={editingItem?.id || 'new'} onSubmit={handleSubmit} className="space-y-6 pt-2">
              <div className="flex justify-center mb-6">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Avatar className="w-24 h-24 border-2 border-slate-100 shadow-sm">
                    <AvatarImage
                      src={
                        avatarPreview ||
                        (editingItem
                          ? `https://img.usecurling.com/ppl/thumbnail?seed=${editingItem.id}`
                          : '')
                      }
                    />
                    <AvatarFallback className="bg-slate-50 text-slate-400">
                      <Camera className="w-8 h-8" />
                    </AvatarFallback>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nome Completo</Label>
                  <Input
                    name="fullName"
                    required
                    defaultValue={editingItem?.fullName || editingItem?.name}
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input name="email" type="email" defaultValue={editingItem?.email} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input name="phone" defaultValue={editingItem?.phone} />
                </div>
                <div>
                  <Label>Função</Label>
                  <Select name="role" defaultValue={editingItem?.role || 'Advogado'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Advogado">Advogado</SelectItem>
                      <SelectItem value="Associado">Associado</SelectItem>
                      <SelectItem value="Administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data Nascimento</Label>
                  <Input
                    name="birthDate"
                    type="date"
                    defaultValue={editingItem?.birthDate?.split('T')[0]}
                  />
                </div>
                <div>
                  <Label>n.º OAB</Label>
                  <Input name="oabNumber" defaultValue={editingItem?.oabNumber} />
                </div>
                <div>
                  <Label>Termos D.O. (Monitoramento)</Label>
                  <Input
                    name="personalSearchTerms"
                    placeholder="Ex: Nome Completo"
                    defaultValue={editingItem?.personalSearchTerms}
                  />
                </div>
                {(currentUser?.isAdmin ||
                  currentUser?.role === 'admin' ||
                  currentUser?.role === 'manager') && (
                  <div className="md:col-span-2">
                    <Label>Vincular a Usuário do Sistema</Label>
                    <Select name="user" defaultValue={editingItem?.user || 'none'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="md:col-span-2 mt-2">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Membro'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Filter */}
        <Card className="w-full md:w-64 shrink-0 md:sticky md:top-6">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm">Filtros de Equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">Cargo</h4>
              {roles.map((r) => (
                <label key={r} className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={roleFilter.includes(r)}
                    onCheckedChange={(c) =>
                      setRoleFilter((prev) => (c ? [...prev, r] : prev.filter((x) => x !== r)))
                    }
                  />
                  <span className="text-sm text-slate-600">{r}</span>
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">Atribuído ao Processo</h4>
              <Select value={caseFilter} onValueChange={setCaseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um processo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os processos</SelectItem>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.case_number || c.parties}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Area */}
        <div className="flex-1 w-full">
          {filteredTeam.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border rounded-xl border-dashed">
              Nenhum colaborador encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeam.map((member) => (
                <Card
                  key={member.id}
                  className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(member.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <CardContent className="p-6 text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-slate-50">
                      <AvatarImage
                        src={
                          member.avatar
                            ? pb.files.getURL(member, member.avatar)
                            : `https://img.usecurling.com/ppl/thumbnail?seed=${member.id}`
                        }
                      />
                      <AvatarFallback className="text-xl bg-primary text-white">
                        {(member.fullName || member.name || 'M').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-primary text-lg">
                        {member.fullName || member.name}
                      </h3>
                      <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary text-xs rounded-full font-medium mb-2">
                        {member.role}
                      </span>
                      <div className="flex flex-col gap-1 pt-3 border-t">
                        {member.email && (
                          <a
                            href={`mailto:${member.email}`}
                            className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-2"
                          >
                            <Mail className="w-3 h-3" />{' '}
                            <span className="truncate">{member.email}</span>
                          </a>
                        )}
                        {member.phone && (
                          <a
                            href={`tel:${member.phone.replace(/\D/g, '')}`}
                            className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-2"
                          >
                            <Phone className="w-3 h-3" /> {member.phone}
                          </a>
                        )}
                        {member.oabNumber && (
                          <span className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                            <FileBadge className="w-3 h-3" /> OAB: {member.oabNumber}{' '}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

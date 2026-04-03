import { useState, useEffect } from 'react'
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
import { UserPlus, Mail, Phone, Trash2, Edit2, FileBadge } from 'lucide-react'
import {
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
} from '@/services/collaborators'
import { getLegalCases } from '@/services/legal_cases'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

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
    setOpen(true)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setOpen(true)
  }

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    const data: any = Object.fromEntries(fd.entries())
    data.name = data.fullName
    if (data.user === 'none') data.user = null

    try {
      if (editingItem) {
        await updateCollaborator(editingItem.id, data)
        toast({ title: 'Membro da equipe atualizado' })
      } else {
        await createCollaborator(data)
        toast({ title: 'Membro da equipe adicionado' })
      }
      setOpen(false)
      loadData()
    } catch (error: any) {
      const msg = error?.response?.data?.user?.message || error.message || 'Erro ao salvar'
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' })
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
      cases.some((c) => c.id === caseFilter && c.responsible_collaborator === member.id)
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Membro' : 'Novo Membro da Equipe'}</DialogTitle>
            </DialogHeader>
            <form
              key={editingItem?.id || 'new'}
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
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
              <div className="md:col-span-2 mt-4">
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Salvar Membro'}
                </Button>
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
                        src={`https://img.usecurling.com/ppl/thumbnail?seed=${member.id}&gender=male`}
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

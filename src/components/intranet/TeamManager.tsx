import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

export default function TeamManager() {
  const [team, setTeam] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setTeam(await getCollaborators())
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())

    // Maintain fallback 'name' field
    data.name = data.fullName

    try {
      if (editingItem) {
        await updateCollaborator(editingItem.id, data)
        toast({ title: 'Membro da equipe atualizado' })
      } else {
        await createCollaborator(data)
        toast({
          title: 'Membro da equipe adicionado',
          description: 'Uma conta de usuário será criada automaticamente.',
        })
      }
      setOpen(false)
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este membro da equipe?')) {
      await deleteCollaborator(id)
    }
  }

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
              <div className="md:col-span-2 mt-4">
                <Button type="submit" className="w-full">
                  Salvar Membro
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {team.map((member) => (
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
                      <Mail className="w-3 h-3" /> <span className="truncate">{member.email}</span>
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
    </div>
  )
}

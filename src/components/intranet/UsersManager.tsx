import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  Mail,
  Phone,
  Users as UsersIcon,
  FileText,
  DollarSign,
} from 'lucide-react'
import { getUsers, createUser, updateUser, deleteUser } from '@/services/users'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

export default function UsersManager() {
  const [users, setUsers] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('admin_user')
  const [errors, setErrors] = useState<any>({})

  const { toast } = useToast()
  const { user: currentUser } = useAuth()

  const loadData = async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setCpf('')
    setIdNumber('')
    setPhone('')
    setAddress('')
    setBirthDate('')
    setPassword('')
    setRole('admin_user')
    setEditingId(null)
    setErrors({})
  }

  const handleOpenNew = () => {
    resetForm()
    setOpen(true)
  }

  const handleEdit = (u: any) => {
    resetForm()
    setEditingId(u.id)
    setFullName(u.fullName || u.name || '')
    setEmail(u.email || '')
    setCpf(u.cpf || '')
    setIdNumber(u.idNumber || '')
    setPhone(u.phone || '')
    setAddress(u.address || '')
    setBirthDate(u.birthDate?.split('T')[0] || '')
    setRole(u.role || (u.isAdmin ? 'admin' : 'admin_user'))
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    try {
      const data: any = {
        name: fullName,
        fullName,
        email,
        cpf,
        idNumber,
        phone,
        address,
        birthDate: birthDate ? new Date(birthDate).toISOString() : null,
        role,
        isAdmin: role === 'admin',
      }

      if (password) {
        data.password = password
        data.passwordConfirm = password
      }

      if (editingId) {
        await updateUser(editingId, data)
        toast({ title: 'Usuário atualizado com sucesso' })
      } else {
        if (!password) {
          setErrors({ password: 'Senha é obrigatória para novos usuários' })
          return
        }
        if (currentUser?.active_organization) {
          data.organizations = [currentUser.active_organization]
          data.active_organization = currentUser.active_organization
        }
        await createUser(data)
        toast({ title: 'Usuário criado com sucesso' })
      }
      setOpen(false)
      loadData()
    } catch (err) {
      setErrors(extractFieldErrors(err))
    }
  }

  const handleDelete = async (id: string) => {
    if (id === currentUser.id) {
      toast({ title: 'Você não pode excluir a si mesmo', variant: 'destructive' })
      return
    }
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await deleteUser(id)
        toast({ title: 'Usuário excluído' })
        loadData()
      } catch (err) {
        toast({ title: 'Erro ao excluir', variant: 'destructive' })
      }
    }
  }

  const RoleBadge = ({ r }: { r: string }) => {
    switch (r) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            <ShieldCheck className="w-3 h-3 mr-1" /> Admin
          </span>
        )
      case 'legal_team':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <UsersIcon className="w-3 h-3 mr-1" /> Jurídico
          </span>
        )
      case 'financial_user':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
            <DollarSign className="w-3 h-3 mr-1" /> Financeiro
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-800">
            <FileText className="w-3 h-3 mr-1" /> Administrativo
          </span>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <CardTitle>Gerenciamento de Usuários</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-2" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Perfil de Acesso</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="legal_team">Equipe Jurídica</SelectItem>
                    <SelectItem value="admin_user">Administrativo</SelectItem>
                    <SelectItem value="financial_user">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="password">
                  Senha {editingId && '(Deixe em branco para manter a atual)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingId}
                />
              </div>
              <div className="md:col-span-2 pt-2">
                <Button type="submit" className="w-full">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.fullName || u.name || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Mail className="w-3 h-3 mr-2" /> {u.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadge r={u.role || (u.isAdmin ? 'admin' : 'admin_user')} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                    <Edit2 className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(u.id)}
                    disabled={u.id === currentUser.id}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

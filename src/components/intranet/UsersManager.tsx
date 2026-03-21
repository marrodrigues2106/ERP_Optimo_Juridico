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
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, Edit2, ShieldCheck, Mail, Phone } from 'lucide-react'
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
  const [isAdmin, setIsAdmin] = useState(false)
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
    setIsAdmin(false)
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
    setIsAdmin(!!u.isAdmin)
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
        isAdmin,
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
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
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
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">Identidade</Label>
                <Input
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
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
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <div className="md:col-span-2 flex items-center space-x-2 pt-2">
                <Switch id="isAdmin" checked={isAdmin} onCheckedChange={setIsAdmin} />
                <Label htmlFor="isAdmin">Privilégios de Administrador</Label>
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
              <TableHead>CPF</TableHead>
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
                    {u.phone && (
                      <span className="flex items-center">
                        <Phone className="w-3 h-3 mr-2" /> {u.phone}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.cpf || '-'}</TableCell>
                <TableCell>
                  {u.isAdmin ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      Membro
                    </span>
                  )}
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

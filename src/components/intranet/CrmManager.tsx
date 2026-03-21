import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, UserPlus, Phone, Mail, Trash2, Edit2 } from 'lucide-react'
import { getClients, createClient, updateClient, deleteClient } from '@/services/clients'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

export default function CrmManager() {
  const [clients, setClients] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setClients(await getClients())
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('clients', loadData)

  const filtered = clients.filter((c) => {
    const term = searchTerm.toLowerCase()
    return (
      (c.fullName || c.name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.cpf || '').includes(term)
    )
  })

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
        await updateClient(editingItem.id, data)
        toast({ title: 'Cliente atualizado' })
      } else {
        await createClient(data)
        toast({ title: 'Cliente cadastrado' })
      }
      setOpen(false)
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await deleteClient(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">CRM & Clientes</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <UserPlus className="w-4 h-4 mr-2" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Cliente' : 'Cadastrar Cliente'}</DialogTitle>
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
                <Label>Classificação</Label>
                <Select name="classification" defaultValue={editingItem?.classification || 'Lead'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CPF</Label>
                <Input name="cpf" defaultValue={editingItem?.cpf} />
              </div>
              <div>
                <Label>Identidade</Label>
                <Input name="idNumber" defaultValue={editingItem?.idNumber} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input name="email" type="email" defaultValue={editingItem?.email} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input name="phone" defaultValue={editingItem?.phone} />
              </div>
              <div className="md:col-span-2">
                <Label>Endereço</Label>
                <Input name="address" defaultValue={editingItem?.address} />
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
                <Label>Nacionalidade</Label>
                <Input name="nationality" defaultValue={editingItem?.nationality} />
              </div>
              <div>
                <Label>Estado Civil</Label>
                <Input name="maritalStatus" defaultValue={editingItem?.maritalStatus} />
              </div>
              <div>
                <Label>Profissão</Label>
                <Input name="profession" defaultValue={editingItem?.profession} />
              </div>
              <div className="md:col-span-2 mt-4">
                <Button type="submit" className="w-full">
                  Salvar Cliente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <CardTitle>Base de Contatos</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.fullName || client.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {client.email && (
                        <span className="flex items-center">
                          <Mail className="w-3 h-3 mr-2 shrink-0" />{' '}
                          <span className="truncate max-w-[150px]">{client.email}</span>
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-2 shrink-0" /> {client.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {client.cpf || '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.classification === 'Ativo'
                          ? 'bg-green-100 text-green-700'
                          : client.classification === 'Inativo'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {client.classification || 'Lead'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getClients, createClient, updateClient, deleteClient } from '@/services/clients'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Loader2, Plus, Search, Trash2, Edit, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function CrmContactsTab() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.isAdmin || user?.role === 'admin'

  const loadData = async () => {
    try {
      const data = await getClients()
      setClients(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length <= 11) {
      v = v
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    } else {
      v = v
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18)
    }
    e.target.value = v
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())

    try {
      const parsedData = { ...data }
      if (parsedData.birthDate) {
        parsedData.birthDate = new Date(parsedData.birthDate as string).toISOString()
      }

      if (editing) {
        await updateClient(editing.id, parsedData)
        toast({ title: 'Cliente atualizado com sucesso!' })
      } else {
        await createClient(parsedData)
        toast({ title: 'Cliente criado com sucesso!' })
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
    if (!confirm('Tem certeza que deseja excluir permanentemente este cliente?')) return
    try {
      await deleteClient(id)
      toast({ title: 'Cliente excluído!' })
      loadData()
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const filtered = clients.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar contatos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Contato
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
          </DialogHeader>
          <form key={editing?.id || 'new'} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Nome Completo *</Label>
                <Input name="name" defaultValue={editing?.name} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>CPF / CNPJ</Label>
                <Input
                  name="cpf"
                  defaultValue={editing?.cpf}
                  onChange={handleCpfChange}
                  maxLength={18}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editing?.email} />
              </div>
              <div className="col-span-2 sm:col-span-1 grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <Label>Tipo</Label>
                  <Select name="phone_type" defaultValue={editing?.phone_type || 'Celular'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fixo">Fixo</SelectItem>
                      <SelectItem value="Celular">Celular</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Telefone</Label>
                  <Input name="phone" defaultValue={editing?.phone} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Data de Nascimento</Label>
                <Input
                  name="birthDate"
                  type="date"
                  defaultValue={editing?.birthDate ? editing.birthDate.split('T')[0] : ''}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Estado Civil</Label>
                <Select name="maritalStatus" defaultValue={editing?.maritalStatus || 'Solteiro(a)'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                    <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                    <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                    <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                    <SelectItem value="União Estável">União Estável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Nacionalidade</Label>
                <Input name="nationality" defaultValue={editing?.nationality || 'Brasileiro(a)'} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Profissão</Label>
                <Input name="profession" defaultValue={editing?.profession} />
              </div>
            </div>
            <div>
              <Label>Classificação</Label>
              <Select name="classification" defaultValue={editing?.classification || 'Ativo'}>
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
            <Button type="submit" className="w-full mt-2" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {submitting ? 'Salvando...' : 'Salvar Contato'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum contato encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{c.email}</div>
                      <div className="text-xs text-slate-500 flex items-center">
                        {c.phone}
                        {c.phone_type === 'WhatsApp' && (
                          <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded">
                            WA
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{c.classification}</TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/intranet/clientes/${c.id}`)}
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(c)
                          setOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!isAdmin || c.classification !== 'Inativo'}
                        onClick={() => handleDelete(c.id)}
                        title={
                          !isAdmin || c.classification !== 'Inativo'
                            ? 'Apenas admins podem excluir clientes inativos'
                            : 'Excluir'
                        }
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

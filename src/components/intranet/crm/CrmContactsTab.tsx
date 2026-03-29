import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { getLegalCases } from '@/services/legal_cases'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

export function CrmContactsTab() {
  const [clients, setClients] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClass, setFilterClass] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [clientsData, casesData] = await Promise.all([getClients(), getLegalCases()])
      setClients(clientsData)
      setCases(casesData)
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('clients', loadData)
  useRealtime('legal_cases', loadData)

  const classifications = ['Ativo', 'Inativo', 'Lead', 'Parte Envolvida']

  const enrichedClients = clients.map((c) => {
    const isLinked = cases.some((lc) => lc.client === c.id)
    let dynamicClass = c.classification || 'Lead'
    if (isLinked && dynamicClass === 'Lead') {
      dynamicClass = 'Parte Envolvida'
    }
    return { ...c, dynamicClassification: dynamicClass }
  })

  const filtered = enrichedClients.filter((c) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      (c.fullName || c.name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.cpf || '').includes(term)
    const matchesClass = filterClass.length === 0 || filterClass.includes(c.dynamicClassification)
    return matchesSearch && matchesClass
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
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
    if (confirm('Tem certeza que deseja excluir?')) await deleteClient(id)
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start mt-4">
      <Card className="w-full md:w-64 shrink-0 md:sticky md:top-6">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm">Classificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {classifications.map((c) => (
            <label key={c} className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={filterClass.includes(c)}
                onCheckedChange={(ch) =>
                  setFilterClass((prev) => (ch ? [...prev, c] : prev.filter((x) => x !== c)))
                }
              />
              <span className="text-sm text-slate-700">{c}</span>
            </label>
          ))}
        </CardContent>
      </Card>
      <div className="flex-1 w-full">
        <Card>
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <CardTitle className="text-lg">Base de Contatos</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingItem(null)}>
                      <UserPlus className="w-4 h-4 mr-2" /> Novo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? 'Editar Cliente' : 'Cadastrar Cliente'}
                      </DialogTitle>
                    </DialogHeader>
                    <form
                      key={editingItem?.id || 'new'}
                      onSubmit={handleSubmit}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
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
                        <Select
                          name="classification"
                          defaultValue={editingItem?.classification || 'Lead'}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ativo">Ativo</SelectItem>
                            <SelectItem value="Inativo">Inativo</SelectItem>
                            <SelectItem value="Lead">Lead</SelectItem>
                            <SelectItem value="Parte Envolvida">Parte Envolvida</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Estágio no Funil (Leads)</Label>
                        <Select
                          name="funnel_stage"
                          defaultValue={editingItem?.funnel_stage || 'Contact'}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Contact">Contato Inicial</SelectItem>
                            <SelectItem value="Proposal">Proposta</SelectItem>
                            <SelectItem value="Negotiation">Negociação</SelectItem>
                            <SelectItem value="Closed">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>CPF</Label>
                        <Input name="cpf" defaultValue={editingItem?.cpf} />
                      </div>
                      <div>
                        <Label>E-mail</Label>
                        <Input name="email" type="email" defaultValue={editingItem?.email} />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input name="phone" defaultValue={editingItem?.phone} />
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
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium pl-6">
                      {client.fullName || client.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        {client.email && (
                          <span className="flex items-center">
                            <Mail className="w-3 h-3 mr-2" /> {client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center">
                            <Phone className="w-3 h-3 mr-2" /> {client.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100">
                        {client.dynamicClassification}
                      </span>
                      {client.dynamicClassification === 'Lead' && client.funnel_stage && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {client.funnel_stage}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(client)
                          setOpen(true)
                        }}
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

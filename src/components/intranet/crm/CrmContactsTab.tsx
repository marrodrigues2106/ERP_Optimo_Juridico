import { useState, useEffect, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getClients, deleteClient } from '@/services/clients'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Loader2, Plus, Search, Trash2, Edit, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ClientFormModal } from '../clients/ClientFormModal'

export function CrmContactsTab() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name_asc')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.isAdmin || user?.role === 'admin'

  const loadData = async () => {
    try {
      setClients(await getClients())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '')
      return new Date(b.created).getTime() - new Date(a.created).getTime()
    })
    return arr
  }, [filtered, sortBy])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Mais Recentes</SelectItem>
              <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
              <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar contatos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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

      <ClientFormModal
        open={open}
        onOpenChange={setOpen}
        editingClient={editing}
        onSuccess={() => {
          loadData()
        }}
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Classificação</TableHead>
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
              ) : sortedFiltered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum contato encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                sortedFiltered.map((c) => (
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

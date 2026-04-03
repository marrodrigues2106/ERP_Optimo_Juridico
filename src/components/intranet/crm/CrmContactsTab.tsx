import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClients, createClient } from '@/services/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, Plus, Search, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'

export function CrmContactsTab() {
  const [clients, setClients] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await getClients()
      setClients(data)
      setFiltered(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('clients', loadData)

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      clients.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.cpf || '').toLowerCase().includes(q),
      ),
    )
  }, [search, clients])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      const newClient = await createClient({
        name: fd.get('name'),
        fullName: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        cpf: fd.get('cpf'),
        status: 'Prospect',
        classification: 'Lead',
        funnel_stage: 'Contact',
      })
      toast({ title: 'Cliente criado com sucesso!' })
      setOpen(false)
      navigate(`/intranet/clientes/${newClient.id}`)
    } catch (err: any) {
      toast({ title: 'Erro ao criar cliente', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Carteira de Clientes
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 bg-white"
            />
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum cliente encontrado.</div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
              >
                <div>
                  <h4 className="font-semibold text-slate-800">{c.name || c.fullName}</h4>
                  <div className="flex gap-3 text-sm text-slate-500 mt-1">
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.cpf && <span>CPF: {c.cpf}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${c.classification === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}
                  >
                    {c.classification || 'Lead'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/intranet/clientes/${c.id}`)}
                  >
                    <Eye className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input name="name" required placeholder="Nome do cliente ou empresa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-mail</Label>
                <Input name="email" type="email" placeholder="contato@email.com" />
              </div>
              <div>
                <Label>Telefone / WhatsApp</Label>
                <Input name="phone" placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div>
              <Label>CPF / CNPJ</Label>
              <Input name="cpf" placeholder="000.000.000-00" />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar e Ver Detalhes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Search,
  MessageSquare,
  Plus,
  CalendarClock,
  Scale,
  Paperclip,
  Tag,
  Briefcase,
} from 'lucide-react'
import { createInteraction, updateInteraction } from '@/services/crm_interactions'
import { RichTextEditor } from './RichTextEditor'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'

export default function AtendimentosManager() {
  const [interactions, setInteractions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingInt, setEditingInt] = useState<any>(null)

  const [selectedClient, setSelectedClient] = useState<string>('none')
  const [linkedCase, setLinkedCase] = useState<string>('none')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')

  const [openClientCombo, setOpenClientCombo] = useState(false)
  const [openCaseCombo, setOpenCaseCombo] = useState(false)

  const { toast } = useToast()

  const loadData = async () => {
    try {
      const orgId = pb.authStore.record?.active_organization
      const [ints, clis, cas] = await Promise.all([
        pb.collection('crm_interactions').getFullList({
          filter: orgId ? `organization = "${orgId}"` : '',
          sort: '-date',
          expand: 'client,responsible,linked_case,parent_interaction',
        }),
        pb.collection('clients').getFullList({
          filter: orgId ? `organization = "${orgId}" && deleted_at = ""` : '',
        }),
        pb.collection('legal_cases').getFullList({
          filter: orgId ? `organization = "${orgId}" && deleted_at = ""` : '',
        }),
      ])
      setInteractions(ints)
      setClients(clis)
      setCases(cas)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('crm_interactions', loadData)

  const handleNew = () => {
    setEditingInt(null)
    setSelectedClient('none')
    setLinkedCase('none')
    setDescription('')
    setTags('')
    setFormOpen(true)
  }

  const handleEdit = (int: any) => {
    setEditingInt(int)
    setSelectedClient(int.client || 'none')
    setLinkedCase(int.linked_case || 'none')
    setDescription(int.description || '')
    setTags(int.tags ? int.tags.join(', ') : '')
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedClient === 'none') {
      toast({ title: 'Aviso', description: 'Selecione um cliente.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    const files = fd.getAll('attachments') as File[]
    const validFiles = files.filter((f) => f.size > 0)

    try {
      const dateVal = editingInt ? editingInt.date : new Date().toISOString()
      const data: any = {
        title: fd.get('title'),
        client: selectedClient,
        type: fd.get('type'),
        description: description || fd.get('description'),
        date: dateVal,
        follow_up_date: fd.get('follow_up_date')
          ? new Date(fd.get('follow_up_date') as string).toISOString()
          : null,
        linked_case: linkedCase !== 'none' ? linkedCase : null,
        status: fd.get('status') || 'open',
        parent_interaction:
          fd.get('parent_interaction') !== 'none' ? fd.get('parent_interaction') : null,
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      }
      if (validFiles.length > 0) {
        data.attachments = validFiles
      }

      if (editingInt) {
        await updateInteraction(editingInt.id, data)
        toast({ title: 'Atendimento atualizado com sucesso.' })
      } else {
        await createInteraction(data)
        toast({ title: 'Atendimento registrado com sucesso.' })
      }

      setFormOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = interactions.filter((int) => {
    if (statusFilter !== 'all' && int.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const title = (int.title || '').toLowerCase()
      const clientName = (int.expand?.client?.name || '').toLowerCase()
      if (!title.includes(s) && !clientName.includes(s)) return false
    }
    return true
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" /> Gestão de Atendimentos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os registros de contato e serviços de clientes.
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" /> Registrar Atendimento
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/50 pb-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Histórico Geral
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Buscar assunto ou cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhum atendimento encontrado.</div>
            ) : (
              filtered.map((int) => (
                <div key={int.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {int.type}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-semibold border',
                            int.status === 'closed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700',
                          )}
                        >
                          {int.status === 'closed' ? 'Fechado' : 'Aberto'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(int.date).toLocaleDateString()}
                        </span>
                        {int.expand?.parent_interaction && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center">
                            Sub-atendimento
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {int.title || 'Sem Assunto'}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1 font-medium">
                        Cliente: {int.expand?.client?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {int.follow_up_date && (
                        <div className="text-xs flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                          <CalendarClock className="w-3 h-3 mr-1" />
                          Follow-up: {new Date(int.follow_up_date).toLocaleDateString()}
                        </div>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(int)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                  {int.expand?.linked_case && (
                    <div className="text-xs text-blue-600 flex items-center bg-blue-50 w-fit px-2 py-1 rounded">
                      <Scale className="w-3 h-3 mr-1" /> Processo Vinculado:{' '}
                      {int.expand.linked_case.case_number || int.expand.linked_case.parties}
                    </div>
                  )}
                  {int.tags && int.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {int.tags.map((t: string) => (
                        <span
                          key={t}
                          className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center"
                        >
                          <Tag className="w-3 h-3 mr-1" /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInt ? 'Editar Atendimento' : 'Registrar Atendimento'}</DialogTitle>
          </DialogHeader>
          <form key={editingInt?.id || 'new'} onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Cliente *</Label>
                <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal text-left px-3"
                    >
                      <span className="truncate pr-4">
                        {selectedClient !== 'none'
                          ? clients.find((c) => c.id === selectedClient)?.name
                          : 'Selecione um cliente'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clients.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                setSelectedClient(c.id)
                                setOpenClientCombo(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedClient === c.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-2 justify-end">
                <Label>Assunto *</Label>
                <Input
                  name="title"
                  defaultValue={editingInt?.title}
                  required
                  placeholder="Ex: Reunião Inicial"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select name="type" defaultValue={editingInt?.type || 'Meeting'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meeting">Reunião</SelectItem>
                    <SelectItem value="Call">Ligação</SelectItem>
                    <SelectItem value="Email">E-mail</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Note">Anotação Interna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select name="status" defaultValue={editingInt?.status || 'open'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Follow-up</Label>
                <Input
                  type="date"
                  name="follow_up_date"
                  defaultValue={
                    editingInt?.follow_up_date ? editingInt.follow_up_date.substring(0, 10) : ''
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Processo Vinculado</Label>
                <Popover open={openCaseCombo} onOpenChange={setOpenCaseCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal text-left px-3"
                    >
                      <span className="truncate pr-4">
                        {linkedCase !== 'none'
                          ? cases.find((c) => c.id === linkedCase)?.parties ||
                            cases.find((c) => c.id === linkedCase)?.case_number
                          : 'Nenhum'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar processo..." />
                      <CommandList>
                        <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setLinkedCase('none')
                              setOpenCaseCombo(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                linkedCase === 'none' ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            Nenhum
                          </CommandItem>
                          {cases
                            .filter((c) => selectedClient === 'none' || c.client === selectedClient)
                            .map((c) => (
                              <CommandItem
                                key={c.id}
                                value={`${c.parties} ${c.case_number || ''}`}
                                onSelect={() => {
                                  setLinkedCase(c.id)
                                  setOpenCaseCombo(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    linkedCase === c.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <div className="flex flex-col overflow-hidden">
                                  <span className="truncate">{c.parties}</span>
                                  {c.case_number && (
                                    <span className="text-xs text-slate-500">{c.case_number}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Atendimento Pai (Sub-serviço)</Label>
                <Select
                  name="parent_interaction"
                  defaultValue={editingInt?.parent_interaction || 'none'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Raiz)</SelectItem>
                    {interactions
                      .filter(
                        (i) =>
                          !i.parent_interaction &&
                          i.id !== editingInt?.id &&
                          (selectedClient === 'none' || i.client === selectedClient),
                      )
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {new Date(c.date).toLocaleDateString()} - {c.title || c.type}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição / Notas *</Label>
              <RichTextEditor value={description} onChange={setDescription} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="urgente, acordo, proposta"
                />
              </div>
              <div>
                <Label>Anexos</Label>
                <Input type="file" name="attachments" multiple className="cursor-pointer" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Atendimento'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

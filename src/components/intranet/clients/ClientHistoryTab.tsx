import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
import { getClientInteractions, createInteraction } from '@/services/crm_interactions'
import { Plus, MessageSquare, CalendarClock, Scale, Check, ChevronsUpDown } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function ClientHistoryTab({ clientId }: { clientId: string }) {
  const [interactions, setInteractions] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [openCaseCombo, setOpenCaseCombo] = useState(false)
  const [linkedCase, setLinkedCase] = useState<string>('none')

  const navigate = useNavigate()
  const { toast } = useToast()

  const loadData = async () => {
    const [ints, clientCases, collabs] = await Promise.all([
      getClientInteractions(clientId),
      pb
        .collection('legal_cases')
        .getFullList({ filter: `client = '${clientId}' && deleted_at = ""` }),
      pb.collection('collaborators').getFullList({ filter: `deleted_at = ""` }),
    ])
    setInteractions(ints)
    setCases(clientCases)
    setCollaborators(collabs)
  }

  useEffect(() => {
    loadData()
  }, [clientId])
  useRealtime('crm_interactions', loadData)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      await createInteraction({
        client: clientId,
        type: fd.get('type'),
        description: fd.get('description'),
        date: new Date().toISOString(),
        follow_up_date: fd.get('follow_up_date')
          ? new Date(fd.get('follow_up_date') as string).toISOString()
          : null,
        linked_case: linkedCase !== 'none' ? linkedCase : null,
        status: 'Pending',
        responsible: fd.get('responsible') !== 'none' ? fd.get('responsible') : null,
      })
      toast({ title: 'Interação registrada com sucesso.' })
      setFormOpen(false)
      setLinkedCase('none')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg">Linha do Tempo de Interações</CardTitle>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Registrar Interação
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {interactions.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto opacity-20 mb-2" />
            <p>Nenhuma interação registrada.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">
            {interactions.map((int) => (
              <div key={int.id} className="relative group">
                <div className="absolute -left-[31px] top-1 w-4 h-4 bg-primary rounded-full ring-4 ring-white" />
                <div className="bg-white p-4 border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-2">
                        {int.type}
                      </span>
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">
                        {int.description}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded">
                      {new Date(int.date).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-50">
                    {int.follow_up_date && (
                      <span className="flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                        <CalendarClock className="w-3 h-3 mr-1.5" /> Follow-up:{' '}
                        {new Date(int.follow_up_date).toLocaleDateString()}
                      </span>
                    )}
                    {int.expand?.linked_case && (
                      <span
                        className="flex items-center text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full cursor-pointer hover:bg-blue-100"
                        onClick={() => navigate(`/intranet/processos/${int.linked_case}`)}
                      >
                        <Scale className="w-3 h-3 mr-1.5" /> Ref:{' '}
                        {int.expand.linked_case.case_number || int.expand.linked_case.parties}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Interação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select name="type" defaultValue="Call">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Call">Ligação</SelectItem>
                    <SelectItem value="Email">E-mail</SelectItem>
                    <SelectItem value="Meeting">Reunião</SelectItem>
                    <SelectItem value="Follow-up">Acompanhamento</SelectItem>
                    <SelectItem value="Note">Anotação</SelectItem>
                    <SelectItem value="Task">Tarefa</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Follow-up</Label>
                <Input type="date" name="follow_up_date" />
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
                      aria-expanded={openCaseCombo}
                      className="w-full justify-between font-normal text-left px-3"
                    >
                      <span className="truncate pr-4">
                        {linkedCase !== 'none'
                          ? cases.find((c) => c.id === linkedCase)?.parties ||
                            cases.find((c) => c.id === linkedCase)?.case_number
                          : 'Nenhum processo'}
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
                          {cases.map((c) => (
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
                <Label>Responsável</Label>
                <Select name="responsible" defaultValue="none">
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input name="description" required className="h-20" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Interação'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

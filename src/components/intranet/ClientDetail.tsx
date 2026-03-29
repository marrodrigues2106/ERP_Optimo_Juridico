import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient } from '@/services/clients'
import { getClientInteractions, createInteraction } from '@/services/crm_interactions'
import { getLegalCases } from '@/services/legal_cases'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  UserCircle,
  CalendarClock,
  Plus,
  MessageSquare,
  Scale,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [client, setClient] = useState<any>(null)
  const [interactions, setInteractions] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const clientData = await getClient(id)
      setClient(clientData)

      const [ints, clientCases] = await Promise.all([
        getClientInteractions(id),
        pb.collection('legal_cases').getFullList({ filter: `client = '${id}'` }),
      ])
      setInteractions(ints)
      setCases(clientCases)
    } catch (e) {
      console.error(e)
      navigate('/intranet/crm')
    }
  }

  useEffect(() => {
    loadData()
  }, [id, navigate])

  useRealtime('crm_interactions', loadData)

  const handleCreateInteraction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      await createInteraction({
        client: id,
        type: fd.get('type'),
        description: fd.get('description'),
        date: new Date().toISOString(),
        follow_up_date: fd.get('follow_up_date')
          ? new Date(fd.get('follow_up_date') as string).toISOString()
          : null,
        linked_case: fd.get('linked_case') !== 'none' ? fd.get('linked_case') : null,
        status: 'Pending',
      })
      toast({ title: 'Interação registrada no CRM com sucesso.' })
      setFormOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Carregando detalhes do cliente...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary flex items-center">
            <UserCircle className="w-6 h-6 mr-2 text-secondary" />
            {client.fullName || client.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Classificação:{' '}
            <span
              className={`px-2 py-0.5 rounded-md text-xs ml-1 ${
                client.classification === 'Ativo'
                  ? 'bg-green-100 text-green-800'
                  : client.classification === 'Inativo'
                    ? 'bg-slate-100 text-slate-800'
                    : 'bg-blue-100 text-blue-800'
              }`}
            >
              {client.classification || 'Lead'}
            </span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="crm" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Histórico CRM (Timeline)
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <UserCircle className="w-4 h-4" /> Ficha Cadastral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crm" className="space-y-6">
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
                  <p>Nenhuma interação registrada. Comece a rastrear o relacionamento.</p>
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
                              <CalendarClock className="w-3 h-3 mr-1.5" />
                              Follow-up: {new Date(int.follow_up_date).toLocaleDateString()}
                            </span>
                          )}
                          {int.expand?.linked_case && (
                            <span
                              className="flex items-center text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full cursor-pointer hover:bg-blue-100"
                              onClick={() => navigate(`/intranet/processos/${int.linked_case}`)}
                            >
                              <Scale className="w-3 h-3 mr-1.5" />
                              Ref: {int.expand.linked_case.case_number || 'Processo vinculado'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg">Informações Completas</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                      Contato
                    </span>
                    <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                      <p className="text-sm flex items-center font-medium">
                        <Mail className="w-4 h-4 mr-2 text-slate-400" />{' '}
                        {client.email || 'Não informado'}
                      </p>
                      <p className="text-sm flex items-center font-medium">
                        <Phone className="w-4 h-4 mr-2 text-slate-400" />{' '}
                        {client.phone || 'Não informado'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                      Documentos
                    </span>
                    <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                      <p className="text-sm">
                        <span className="text-muted-foreground">CPF:</span>{' '}
                        <span className="font-medium">{client.cpf || 'Não informado'}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Identidade:</span>{' '}
                        <span className="font-medium">{client.idNumber || 'Não informado'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                      Pessoal
                    </span>
                    <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Nacionalidade:</span>{' '}
                        <span className="font-medium">{client.nationality || 'Não informado'}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Estado Civil:</span>{' '}
                        <span className="font-medium">
                          {client.maritalStatus || 'Não informado'}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Data Nasc.:</span>{' '}
                        <span className="font-medium">
                          {client.birthDate
                            ? new Date(client.birthDate).toLocaleDateString()
                            : 'Não informado'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                      Profissional & Endereço
                    </span>
                    <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                      <p className="text-sm flex items-center">
                        <Briefcase className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                        <span className="font-medium truncate">
                          {client.profession || 'Não informado'}
                        </span>
                      </p>
                      <p className="text-sm flex items-start mt-2">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{client.address || 'Não informado'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Interação (CRM)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInteraction} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Interação *</Label>
                <Select name="type" defaultValue="Call">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Call">Ligação Telefônica</SelectItem>
                    <SelectItem value="Email">E-mail</SelectItem>
                    <SelectItem value="Meeting">Reunião</SelectItem>
                    <SelectItem value="Follow-up">Acompanhamento</SelectItem>
                    <SelectItem value="Note">Anotação Interna</SelectItem>
                    <SelectItem value="Task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agendar Follow-up (Opcional)</Label>
                <Input type="date" name="follow_up_date" />
              </div>
            </div>
            <div>
              <Label>Processo Vinculado (Opcional)</Label>
              <Select name="linked_case" defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum processo</SelectItem>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.case_number || c.parties}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição / Notas *</Label>
              <Input
                name="description"
                required
                placeholder="Resumo do que foi conversado ou realizado..."
                className="h-20"
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Interação'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

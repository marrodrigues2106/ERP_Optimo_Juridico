import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient } from '@/services/clients'
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
import { ArrowLeft, UserCircle, MessageSquare, FileText, CheckSquare, Scale } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

import { ClientOverviewTab } from './clients/ClientOverviewTab'
import { ClientHistoryTab } from './clients/ClientHistoryTab'
import { ClientDocumentsTab } from './clients/ClientDocumentsTab'
import { ClientTasksTab } from './clients/ClientTasksTab'
import { ClientCasesTab } from './clients/ClientCasesTab'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [client, setClient] = useState<any>(null)
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const clientData = await getClient(id)
      setClient(clientData)
    } catch (e) {
      console.error(e)
      navigate('/intranet/crm')
    }
  }

  useEffect(() => {
    loadData()
  }, [id, navigate])

  const [classification, setClassification] = useState('Lead')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (client) {
      setClassification(client.classification || 'Lead')
      setStatus(client.status || '')
    }
  }, [client])

  const handleClassificationChange = (val: string) => {
    setClassification(val)
    if (val === 'Lead') setStatus('Prospect')
    else if (val === 'Potencial') setStatus('Negociação')
    else if (val === 'Ativo') setStatus('Ativo')
    else if (val === 'Inativo') setStatus('Inativo')
  }

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

  const handleEditClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('clients').update(id as string, {
        status,
        classification,
        funnel_stage: fd.get('funnel_stage'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        cpf: fd.get('cpf'),
        address: fd.get('address'),
        phone_type: fd.get('phone_type'),
        nationality: fd.get('nationality'),
        maritalStatus: fd.get('maritalStatus'),
        birthDate: fd.get('birthDate')
          ? new Date(fd.get('birthDate') as string).toISOString()
          : null,
        profession: fd.get('profession'),
      })
      toast({ title: 'Cliente atualizado.' })
      setEditClientOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClient = async () => {
    if (client?.classification !== 'Inativo' && client?.status !== 'Inativo') return
    if (confirm('Tem certeza que deseja arquivar/excluir este cliente?')) {
      try {
        await pb
          .collection('clients')
          .update(id as string, { status: 'Excluído', classification: 'Inativo' })
        toast({ title: 'Cliente excluído.' })
        navigate('/intranet/crm')
      } catch (err: any) {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' })
      }
    }
  }

  if (!client) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Carregando cliente...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-serif font-bold text-primary flex items-center">
              <UserCircle className="w-6 h-6 mr-2 text-secondary" />{' '}
              {client.fullName || client.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
              <span>Status: {client.status || '-'}</span>
              <span>•</span>
              <span>
                Classificação:
                <span
                  className={`px-2 py-0.5 rounded-md text-xs ml-1 ${client.classification === 'Ativo' ? 'bg-green-100 text-green-800' : client.classification === 'Inativo' ? 'bg-slate-100 text-slate-800' : 'bg-blue-100 text-blue-800'}`}
                >
                  {client.classification || 'Lead'}
                </span>
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {client.classification === 'Inativo' && (
            <Button variant="destructive" onClick={handleDeleteClient}>
              Excluir Cliente
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditClientOpen(true)}>
            Editar Cliente
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <UserCircle className="w-4 h-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Histórico CRM
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documentos
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Tarefas & Agenda
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <Scale className="w-4 h-4" /> Processos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ClientOverviewTab client={client} />
        </TabsContent>
        <TabsContent value="crm">
          <ClientHistoryTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="documents">
          <ClientDocumentsTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="tasks">
          <ClientTasksTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="cases">
          <ClientCasesTab clientId={client.id} />
        </TabsContent>
      </Tabs>

      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Relacionamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditClient} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Classificação</Label>
                <Select value={classification} onValueChange={handleClassificationChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Potencial">Potencial</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Input name="status" value={status} onChange={(e) => setStatus(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Fase no Funil</Label>
              <Select name="funnel_stage" defaultValue={client.funnel_stage || 'Contact'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contact">Contato</SelectItem>
                  <SelectItem value="Proposal">Proposta</SelectItem>
                  <SelectItem value="Negotiation">Negociação</SelectItem>
                  <SelectItem value="Closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-mail</Label>
                <Input name="email" type="email" defaultValue={client.email || ''} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <Label>Tipo</Label>
                  <Select name="phone_type" defaultValue={client.phone_type || 'Celular'}>
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
                  <Input name="phone" defaultValue={client.phone || ''} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CPF / CNPJ</Label>
                <Input
                  name="cpf"
                  defaultValue={client.cpf || ''}
                  onChange={handleCpfChange}
                  maxLength={18}
                />
              </div>
              <div>
                <Label>Data Nasc.</Label>
                <Input
                  name="birthDate"
                  type="date"
                  defaultValue={client.birthDate ? client.birthDate.split('T')[0] : ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estado Civil</Label>
                <Select name="maritalStatus" defaultValue={client.maritalStatus || 'Solteiro(a)'}>
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
              <div>
                <Label>Nacionalidade</Label>
                <Input name="nationality" defaultValue={client.nationality || 'Brasileiro(a)'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Profissão</Label>
                <Input name="profession" defaultValue={client.profession || ''} />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input name="address" defaultValue={client.address || ''} />
              </div>
            </div>
            <Button type="submit" className="w-full mt-2" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

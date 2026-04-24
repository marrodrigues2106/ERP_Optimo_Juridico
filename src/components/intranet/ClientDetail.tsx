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
import {
  ArrowLeft,
  UserCircle,
  MessageSquare,
  FileText,
  CheckSquare,
  Scale,
  Plus,
  Trash2,
} from 'lucide-react'
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
  const [classification, setClassification] = useState('Lead')
  const [phoneNumbers, setPhoneNumbers] = useState<{ number: string; type: string }[]>([])

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

  useEffect(() => {
    if (client) {
      setClassification(client.classification || 'Lead')
      if (client.phone_numbers && Array.isArray(client.phone_numbers)) {
        setPhoneNumbers(client.phone_numbers)
      } else if (client.phone) {
        setPhoneNumbers([{ number: client.phone, type: client.phone_type || 'Celular' }])
      } else {
        setPhoneNumbers([])
      }
    }
  }, [client])

  const handleClassificationChange = (val: string) => {
    setClassification(val)
  }

  const addPhone = () => setPhoneNumbers([...phoneNumbers, { number: '', type: 'Celular' }])
  const updatePhone = (index: number, field: string, val: string) => {
    const newPhones = [...phoneNumbers]
    newPhones[index] = { ...newPhones[index], [field]: val }
    setPhoneNumbers(newPhones)
  }
  const removePhone = (index: number) => {
    setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index))
  }

  const handleEditClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      let status = 'Prospect'
      if (classification === 'Potencial') status = 'Negociação'
      if (classification === 'Ativo') status = 'Active'
      if (classification === 'Inativo') status = 'Inactive'

      const cleanedPhones = phoneNumbers.filter((p) => p.number.trim() !== '')

      const updateData: any = {
        status,
        classification,
        funnel_stage: fd.get('funnel_stage'),
        email: fd.get('email'),
        address: fd.get('address'),
        nationality: fd.get('nationality'),
        maritalStatus: fd.get('maritalStatus'),
        profession: fd.get('profession'),
        phone_numbers: cleanedPhones,
        phone: cleanedPhones.length > 0 ? cleanedPhones[0].number : '',
        phone_type: cleanedPhones.length > 0 ? cleanedPhones[0].type : '',
      }

      if (fd.get('birthDate')) {
        updateData.birthDate = new Date(`${fd.get('birthDate')}T12:00:00Z`).toISOString()
      } else {
        updateData.birthDate = ''
      }

      await pb.collection('clients').update(id as string, updateData)
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
              <span>Situação:</span>
              <span
                className={`px-2 py-0.5 rounded-md text-xs ${client.classification === 'Ativo' ? 'bg-green-100 text-green-800' : client.classification === 'Inativo' ? 'bg-slate-100 text-slate-800' : 'bg-blue-100 text-blue-800'}`}
              >
                {client.classification || 'Lead'}
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Relacionamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditClient} className="space-y-4 pt-4">
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-md mb-2 border border-blue-100">
              Para editar <strong>CPF</strong> ou <strong>RG</strong>, utilize a aba{' '}
              <strong>Documentos</strong>.
            </div>
            <div>
              <Label>Situação / Classificação</Label>
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
            <div>
              <Label>E-mail</Label>
              <Input name="email" type="email" defaultValue={client.email || ''} />
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-slate-700">Telefones / Contatos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPhone}
                  className="h-7 text-xs bg-white"
                >
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {phoneNumbers.map((phone, i) => (
                  <div
                    key={i}
                    className="flex gap-2 items-center bg-white p-1 rounded border border-slate-100"
                  >
                    <Select value={phone.type} onValueChange={(val) => updatePhone(i, 'type', val)}>
                      <SelectTrigger className="w-[110px] h-8 text-xs border-none shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fixo">Fixo</SelectItem>
                        <SelectItem value="Celular">Celular</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="w-[1px] h-4 bg-slate-200"></div>
                    <Input
                      value={phone.number}
                      onChange={(e) => updatePhone(i, 'number', e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="flex-1 h-8 text-sm border-none shadow-none focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                      onClick={() => removePhone(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {phoneNumbers.length === 0 && (
                  <p className="text-xs text-slate-500 italic px-2">Nenhum telefone cadastrado.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nacionalidade</Label>
                <Input name="nationality" defaultValue={client.nationality || 'Brasileiro(a)'} />
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
                <Label>Profissão</Label>
                <Input name="profession" defaultValue={client.profession || ''} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
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

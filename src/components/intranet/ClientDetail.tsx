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
import { ClientFormModal } from './clients/ClientFormModal'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [client, setClient] = useState<any>(null)
  const [editClientOpen, setEditClientOpen] = useState(false)

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

      <ClientFormModal
        open={editClientOpen}
        onOpenChange={setEditClientOpen}
        editingClient={client}
        onSuccess={() => loadData()}
      />
    </div>
  )
}

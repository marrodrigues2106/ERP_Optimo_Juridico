import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['Meeting', 'Call', 'Hearing', 'Task', 'Email']),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().optional(),
  collaborator: z.string().optional(),
  linked_lawsuit: z.string().optional(),
  client: z.string().optional(),
  sync_provider: z.enum(['Google', 'iCloud', 'Outlook', 'Local']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

type EventFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  lawsuitId?: string
  prefilledDescription?: string
  defaultDate?: Date
  onSuccess?: () => void
  editingEvent?: any
}

export function EventFormModal({
  open,
  onOpenChange,
  lawsuitId,
  prefilledDescription,
  defaultDate,
  onSuccess,
  editingEvent,
}: Props) {
  const { toast } = useToast()
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const isEditing = !!editingEvent

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: 'Task', sync_provider: 'Local' },
  })

  useEffect(() => {
    if (open) {
      Promise.all([
        pb.collection('collaborators').getFullList(),
        pb.collection('clients').getFullList(),
        pb.collection('legal_cases').getFullList(),
      ])
        .then(([colRes, cliRes, caseRes]) => {
          setCollaborators(colRes)
          setClients(cliRes)
          setCases(caseRes)
        })
        .catch(console.error)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      if (isEditing) {
        reset({
          title: editingEvent.title || '',
          description: editingEvent.description || '',
          type: editingEvent.type || 'Task',
          start_date: editingEvent.start_date
            ? new Date(editingEvent.start_date).toISOString().substring(0, 16)
            : '',
          end_date: editingEvent.end_date
            ? new Date(editingEvent.end_date).toISOString().substring(0, 16)
            : '',
          collaborator: editingEvent.collaborator || 'none',
          client: editingEvent.client || 'none',
          linked_lawsuit: editingEvent.linked_lawsuit || 'none',
          sync_provider: editingEvent.sync_provider || 'Local',
          priority: editingEvent.priority || 'medium',
        })
      } else {
        const initDate = defaultDate ? new Date(defaultDate) : new Date()
        if (defaultDate && initDate.getHours() === 0 && initDate.getMinutes() === 0) {
          initDate.setHours(9, 0, 0, 0)
        }
        const tzOffset = initDate.getTimezoneOffset() * 60000

        reset({
          title: '',
          description: prefilledDescription || '',
          type: 'Task',
          start_date: new Date(initDate.getTime() - tzOffset).toISOString().substring(0, 16),
          end_date: new Date(initDate.getTime() + 3600000 - tzOffset)
            .toISOString()
            .substring(0, 16),
          collaborator: 'none',
          client: 'none',
          linked_lawsuit: lawsuitId || 'none',
          sync_provider: 'Local',
          priority: 'medium',
        })
      }
    }
  }, [open, prefilledDescription, lawsuitId, defaultDate, reset, editingEvent, isEditing])

  const onSubmit = async (data: EventFormValues) => {
    try {
      const startD = new Date(data.start_date)
      if (isNaN(startD.getTime())) throw new Error('Data inicial inválida.')

      const payload: any = {
        title: data.title,
        description: data.description,
        type: data.type,
        start_date: startD.toISOString(),
        organization: pb.authStore.record?.active_organization,
        sync_provider: data.sync_provider,
        sync_status: data.sync_provider === 'Local' ? 'Local Only' : 'Pending',
      }

      if (data.end_date) {
        const endD = new Date(data.end_date)
        if (!isNaN(endD.getTime())) payload.end_date = endD.toISOString()
      }

      if (data.collaborator && data.collaborator !== 'none')
        payload.collaborator = data.collaborator
      else payload.collaborator = null

      if (data.linked_lawsuit && data.linked_lawsuit !== 'none')
        payload.linked_lawsuit = data.linked_lawsuit
      else payload.linked_lawsuit = null

      if (data.client && data.client !== 'none') payload.client = data.client
      else payload.client = null

      if (data.type === 'Task') {
        const taskPayload = {
          title: data.title,
          description: data.description,
          due_date: startD.toISOString(),
          priority: data.priority || 'medium',
          collaborator: payload.collaborator,
          client: payload.client,
          linked_lawsuit: payload.linked_lawsuit,
          organization: payload.organization,
          status: 'todo',
        }
        if (isEditing && editingEvent.isTask) {
          await pb.collection('tasks').update(editingEvent.id, taskPayload)
          toast({ title: 'Tarefa atualizada com sucesso' })
        } else {
          await pb.collection('tasks').create(taskPayload)
          toast({ title: 'Tarefa criada com sucesso' })
        }
      } else {
        if (isEditing && !editingEvent.isTask) {
          await pb.collection('agenda_events').update(editingEvent.id, payload)
          toast({ title: 'Evento atualizado com sucesso' })
        } else {
          await pb.collection('agenda_events').create(payload)
          toast({ title: 'Evento criado com sucesso' })
        }
      }

      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast({
        title: isEditing ? 'Erro ao atualizar evento' : 'Erro ao criar evento',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja remover este item?')) {
      try {
        const collection = editingEvent.isTask ? 'tasks' : 'agenda_events'
        await pb
          .collection(collection)
          .update(editingEvent.id, { deleted_at: new Date().toISOString() })
        toast({ title: 'Item excluído com sucesso.' })
        if (onSuccess) onSuccess()
        onOpenChange(false)
      } catch (e) {
        toast({
          title: 'Erro ao excluir evento',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Evento/Alerta' : 'Vincular Evento/Alerta'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do evento na agenda.'
              : 'Crie um evento na agenda integrado ao sistema e notificações.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Título / Assunto *</Label>
              <Input {...register('title')} placeholder="Ex: Audiência de Conciliação..." />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label>Data Inicial *</Label>
              <Input type="datetime-local" {...register('start_date')} />
              {errors.start_date && (
                <p className="text-xs text-red-500 mt-1">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <Label>Data Final</Label>
              <Input type="datetime-local" {...register('end_date')} />
            </div>

            <div>
              <Label>Tipo de Evento</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hearing">Audiência</SelectItem>
                      <SelectItem value="Meeting">Reunião</SelectItem>
                      <SelectItem value="Call">Ligação</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Task">Tarefa</SelectItem>
                    </SelectContent>{' '}
                  </Select>
                )}
              />
            </div>

            {control._formValues.type === 'Task' && (
              <div>
                <Label>Prioridade da Tarefa</Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'medium'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div>
              <Label>Provedor de Nuvem</Label>
              <Controller
                name="sync_provider"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Local">Somente Local</SelectItem>
                      <SelectItem value="Google">Google Calendar</SelectItem>
                      <SelectItem value="Outlook">Outlook 365</SelectItem>
                      <SelectItem value="iCloud">Apple iCloud</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>Cliente Vinculado</Label>
              <Controller
                name="client"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name || c.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>Processo Vinculado</Label>
              <Controller
                name="linked_lawsuit"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.case_number || c.parties}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Responsável Primário</Label>
              <Controller
                name="collaborator"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
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
                )}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Descrição / Links</Label>
              <Input {...register('description')} placeholder="Pauta da reunião, link do meet..." />
            </div>
          </div>

          <div className="flex justify-between pt-4 gap-4">
            {isEditing && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            )}
            <Button
              type="submit"
              className={isEditing ? 'flex-1' : 'w-full'}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                'Salvar Alterações'
              ) : (
                'Confirmar Agendamento'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

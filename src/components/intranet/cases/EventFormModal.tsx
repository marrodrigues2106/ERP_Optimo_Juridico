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
import { Switch } from '@/components/ui/switch'
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
  type: z.enum(['Meeting', 'Call', 'Hearing', 'Task', 'Email', 'Reminder', 'Note']),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().optional(),
  collaborator: z.string().optional(),
  linked_lawsuit: z.string().optional(),
  client: z.string().optional(),
  sync_provider: z.enum(['Google', 'iCloud', 'Outlook', 'Local']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  is_all_day: z.boolean().optional(),
  modality: z.enum(['Presencial', 'Virtual', 'Híbrido', 'N/A']).optional(),
  location: z.string().optional(),
  alert_time: z.enum(['none', '15m', '30m', '1h', '1d']).optional(),
  alert_type: z.enum(['none', 'in-app', 'email', 'both']).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_type: z.enum(['daily', 'weekly', 'monthly', 'annual', 'custom']).optional(),
  recurrence_end: z.string().optional(),
  kanban_column: z.string().optional(),
  linked_interaction: z.string().optional(),
})

type EventFormValues = z.infer<typeof formSchema>

export function EventFormModal({
  open,
  onOpenChange,
  lawsuitId,
  prefilledDescription,
  defaultDate,
  onSuccess,
  editingEvent,
  defaultColumn,
}: any) {
  const { toast } = useToast()
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [interactions, setInteractions] = useState<any[]>([])
  const isEditing = !!editingEvent && !!editingEvent.id

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'Task',
      sync_provider: 'Local',
      alert_time: 'none',
      alert_type: 'none',
      modality: 'N/A',
      is_recurring: false,
      is_all_day: false,
    },
  })

  const watchType = watch('type')
  const watchIsAllDay = watch('is_all_day')
  const watchIsRecurring = watch('is_recurring')

  useEffect(() => {
    if (open) {
      Promise.all([
        pb.collection('collaborators').getFullList(),
        pb.collection('clients').getFullList(),
        pb.collection('legal_cases').getFullList(),
        pb.collection('kanban_columns').getFullList({ expand: 'board' }),
        pb.collection('crm_interactions').getFullList({ sort: '-date', expand: 'client' }),
      ])
        .then(([colRes, cliRes, caseRes, colCols, intRes]) => {
          setCollaborators(colRes)
          setClients(cliRes)
          setCases(caseRes)
          setColumns(colCols)
          setInteractions(intRes)
        })
        .catch(console.error)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      if (editingEvent) {
        reset({
          title: editingEvent.title || '',
          description: editingEvent.description || prefilledDescription || '',
          type: editingEvent.type || 'Task',
          start_date:
            editingEvent.start_date || editingEvent.due_date
              ? editingEvent.is_all_day
                ? new Date(editingEvent.start_date || editingEvent.due_date)
                    .toISOString()
                    .substring(0, 10)
                : new Date(editingEvent.start_date || editingEvent.due_date)
                    .toISOString()
                    .substring(0, 16)
              : '',
          end_date: editingEvent.end_date
            ? editingEvent.is_all_day
              ? new Date(editingEvent.end_date).toISOString().substring(0, 10)
              : new Date(editingEvent.end_date).toISOString().substring(0, 16)
            : '',
          collaborator: editingEvent.collaborator || 'none',
          client: editingEvent.client || 'none',
          linked_lawsuit: editingEvent.linked_lawsuit || lawsuitId || 'none',
          sync_provider: editingEvent.sync_provider || 'Local',
          priority: editingEvent.priority || 'medium',
          is_all_day: editingEvent.is_all_day || false,
          modality: editingEvent.modality || 'N/A',
          location: editingEvent.location || '',
          alert_time: editingEvent.alert_time || 'none',
          alert_type: editingEvent.alert_type || 'none',
          is_recurring: editingEvent.is_recurring || false,
          recurrence_type: editingEvent.recurrence_type || 'weekly',
          recurrence_end: editingEvent.recurrence_end
            ? editingEvent.recurrence_end.substring(0, 10)
            : '',
          kanban_column: editingEvent.kanban_column || defaultColumn || 'none',
          linked_interaction: editingEvent.linked_interaction || 'none',
        })
      } else {
        const initDate = defaultDate ? new Date(defaultDate) : new Date()
        if (defaultDate && initDate.getHours() === 0 && initDate.getMinutes() === 0)
          initDate.setHours(9, 0, 0, 0)
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
          alert_time: 'none',
          alert_type: 'none',
          modality: 'N/A',
          is_all_day: false,
          is_recurring: false,
          kanban_column: defaultColumn || 'none',
          linked_interaction: 'none',
        })
      }
    }
  }, [open, defaultDate, reset, editingEvent, defaultColumn, prefilledDescription, lawsuitId])

  const onSubmit = async (data: EventFormValues) => {
    try {
      const startD = new Date(data.start_date)
      if (isNaN(startD.getTime())) throw new Error('Data inicial inválida.')

      const payload: any = {
        title: data.title,
        description: data.description,
        organization: pb.authStore.record?.active_organization,
        kanban_column: data.kanban_column !== 'none' ? data.kanban_column : null,
        collaborator: data.collaborator !== 'none' ? data.collaborator : null,
        client: data.client !== 'none' ? data.client : null,
        linked_lawsuit: data.linked_lawsuit !== 'none' ? data.linked_lawsuit : null,
        linked_interaction: data.linked_interaction !== 'none' ? data.linked_interaction : null,
        is_recurring: data.is_recurring,
        is_all_day: data.is_all_day,
      }

      if (data.is_recurring) {
        payload.recurrence_type = data.recurrence_type
        if (data.recurrence_end)
          payload.recurrence_end = new Date(data.recurrence_end).toISOString()
      }

      if (data.type === 'Task') {
        payload.due_date = startD.toISOString()
        payload.priority = data.priority || 'medium'
        payload.status = 'todo'

        if (isEditing && editingEvent.isTask) {
          await pb.collection('tasks').update(editingEvent.id, payload)
        } else {
          await pb.collection('tasks').create(payload)
        }
      } else {
        payload.type = data.type
        payload.start_date = startD.toISOString()
        if (data.end_date) payload.end_date = new Date(data.end_date).toISOString()
        payload.sync_provider = data.sync_provider
        payload.sync_status = data.sync_provider === 'Local' ? 'Local Only' : 'Pending'
        payload.modality = data.modality
        payload.location = data.location
        payload.alert_time = data.alert_time
        payload.alert_type = data.alert_type

        if (isEditing && !editingEvent.isTask) {
          await pb.collection('agenda_events').update(editingEvent.id, payload)
        } else {
          await pb.collection('agenda_events').create(payload)
        }
      }

      toast({ title: 'Salvo com sucesso' })
      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
          <DialogDescription>Crie uma tarefa ou agende um evento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Título / Assunto *</Label>
              <Input {...register('title')} placeholder="Ex: Protocolar recurso..." />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label>Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Task">Tarefa / Rotina</SelectItem>
                      <SelectItem value="Meeting">Reunião</SelectItem>
                      <SelectItem value="Hearing">Audiência</SelectItem>
                      <SelectItem value="Call">Ligação</SelectItem>
                      <SelectItem value="Reminder">Lembrete</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>Coluna Kanban (Opcional)</Label>
              <Controller
                name="kanban_column"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {columns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.expand?.board?.name} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:col-span-2 border p-3 rounded-lg bg-slate-50/50">
              <div>
                <Label>{watchIsAllDay ? 'Data Inicial *' : 'Data/Hora Inicial *'}</Label>
                <Input
                  type={watchIsAllDay ? 'date' : 'datetime-local'}
                  {...register('start_date')}
                />
              </div>
              <div>
                <Label>{watchIsAllDay ? 'Data Final' : 'Data/Hora Final'}</Label>
                <Input type={watchIsAllDay ? 'date' : 'datetime-local'} {...register('end_date')} />
              </div>
              <div className="col-span-2 flex items-center space-x-2 mt-2">
                <Controller
                  name="is_all_day"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={(val) => {
                        field.onChange(val)
                        const currentStart = watch('start_date')
                        if (currentStart) {
                          if (val && currentStart.length > 10) {
                            setValue('start_date', currentStart.substring(0, 10))
                          } else if (!val && currentStart.length === 10) {
                            setValue('start_date', `${currentStart}T09:00`)
                          }
                        }
                        const currentEnd = watch('end_date')
                        if (currentEnd) {
                          if (val && currentEnd.length > 10) {
                            setValue('end_date', currentEnd.substring(0, 10))
                          } else if (!val && currentEnd.length === 10) {
                            setValue('end_date', `${currentEnd}T10:00`)
                          }
                        }
                      }}
                      id="all-day"
                    />
                  )}
                />
                <Label htmlFor="all-day">Dia Inteiro</Label>
              </div>
            </div>

            {watchType === 'Task' && (
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

            {watchType !== 'Task' && (
              <>
                <div>
                  <Label>Modalidade</Label>
                  <Controller
                    name="modality"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'N/A'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="N/A">N/A</SelectItem>
                          <SelectItem value="Presencial">Presencial</SelectItem>
                          <SelectItem value="Virtual">Virtual</SelectItem>
                          <SelectItem value="Híbrido">Híbrido</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Local / Link</Label>
                  <Input {...register('location')} placeholder="Sala 3 ou Link do Meet" />
                </div>
              </>
            )}

            <div className="md:col-span-2 flex flex-col gap-3 border p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Controller
                  name="is_recurring"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} id="recurring" />
                  )}
                />
                <Label htmlFor="recurring">Repetir esta atividade</Label>
              </div>

              {watchIsRecurring && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label>Repetição</Label>
                    <Controller
                      name="recurrence_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || 'weekly'}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diariamente</SelectItem>
                            <SelectItem value="weekly">Semanalmente</SelectItem>
                            <SelectItem value="monthly">Mensalmente</SelectItem>
                            <SelectItem value="annual">Anualmente</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Fim da repetição (Opcional)</Label>
                    <Input type="date" {...register('recurrence_end')} />
                  </div>
                </div>
              )}
            </div>

            {watchType !== 'Task' && (
              <div className="grid grid-cols-2 gap-4 md:col-span-2 border p-3 rounded-lg">
                <div>
                  <Label>Alerta Prévio</Label>
                  <Controller
                    name="alert_time"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="15m">15 minutos antes</SelectItem>
                          <SelectItem value="30m">30 minutos antes</SelectItem>
                          <SelectItem value="1h">1 hora antes</SelectItem>
                          <SelectItem value="1d">1 dia antes</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Tipo de Alerta</Label>
                  <Controller
                    name="alert_type"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="in-app">Notificação no Sistema</SelectItem>
                          <SelectItem value="email">Por E-mail</SelectItem>
                          <SelectItem value="both">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Atendimento Vinculado</Label>
              <Controller
                name="linked_interaction"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {interactions.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {new Date(i.date).toLocaleDateString('pt-BR')} - {i.type}{' '}
                          {i.expand?.client?.name ? `(${i.expand.client.name})` : ''}
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
                      <SelectValue placeholder="Nenhum" />
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

            <div>
              <Label>Responsável</Label>
              <Controller
                name="collaborator"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
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
                )}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Descrição / Notas</Label>
              <Input
                {...register('description')}
                className="h-20"
                placeholder="Pauta, anotações rápidas..."
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                'Salvar Atividade'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

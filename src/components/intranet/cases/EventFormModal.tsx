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
import { createAgendaEvent } from '@/services/agenda'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['Note', 'Meeting', 'Call', 'Deadline', 'Reminder', 'Hearing', 'Task', 'Email']),
  start_date: z.string().min(1, 'Data é obrigatória'),
  collaborator: z.string().optional(),
})

type EventFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  lawsuitId: string
  prefilledDescription?: string
  onSuccess: () => void
}

export function EventFormModal({
  open,
  onOpenChange,
  lawsuitId,
  prefilledDescription,
  onSuccess,
}: Props) {
  const { toast } = useToast()
  const [collaborators, setCollaborators] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: 'Task', start_date: new Date().toISOString().substring(0, 16) },
  })

  useEffect(() => {
    pb.collection('collaborators')
      .getFullList()
      .then(setCollaborators)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: prefilledDescription || '',
        type: 'Task',
        start_date: new Date().toISOString().substring(0, 16),
        collaborator: 'none',
      })
    }
  }, [open, prefilledDescription, reset])

  const onSubmit = async (data: EventFormValues) => {
    try {
      await createAgendaEvent({
        title: data.title,
        description: data.description,
        type: data.type,
        start_date: new Date(data.start_date).toISOString(),
        collaborator: !data.collaborator || data.collaborator === 'none' ? null : data.collaborator,
        linked_lawsuit: lawsuitId,
      })
      toast({ title: 'Evento criado com sucesso' })
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: 'Erro ao criar evento', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vincular Evento/Alerta</DialogTitle>
          <DialogDescription>
            Crie um evento na agenda vinculado a este processo ou movimento.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <Label>Título *</Label>
            <Input {...register('title')} placeholder="Ex: Peticionar recurso..." />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label>Descrição</Label>
            <Input {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="Deadline">Prazo</SelectItem>
                      <SelectItem value="Reminder">Lembrete</SelectItem>
                      <SelectItem value="Task">Tarefa</SelectItem>
                      <SelectItem value="Hearing">Audiência</SelectItem>
                      <SelectItem value="Meeting">Reunião</SelectItem>
                      <SelectItem value="Call">Chamada</SelectItem>
                      <SelectItem value="Email">E-mail</SelectItem>
                      <SelectItem value="Note">Anotação</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Data e Hora *</Label>
              <Input type="datetime-local" {...register('start_date')} />
              {errors.start_date && (
                <p className="text-xs text-red-500 mt-1">{errors.start_date.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Responsável</Label>
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Evento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { createLegalCase, updateLegalCase } from '@/services/legal_cases'
import { useToast } from '@/hooks/use-toast'

const formSchema = z
  .object({
    type: z.enum(['Processo', 'Serviço Jurídico']),
    case_number: z.string().optional(),
    parties: z.string().min(1, 'As partes são obrigatórias'),
    court: z.string().optional(),
    status: z.string().optional(),
    lifecycle_status: z.enum(['Ativo', 'Arquivado', 'Suspenso']),
    client: z.string().optional(),
    responsible_collaborator: z.string().optional(),
    deadline: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'Processo') {
        return !data.case_number || /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(data.case_number)
      }
      return true
    },
    {
      message: 'Padrão CNJ inválido (ex: 0000000-00.0000.0.00.0000)',
      path: ['case_number'],
    },
  )

type CaseFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCase: any | null
  clients: any[]
  collaborators: any[]
  onSuccess: () => void
}

export function CaseFormModal({
  open,
  onOpenChange,
  editingCase,
  clients,
  collaborators,
  onSuccess,
}: Props) {
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: 'Processo', lifecycle_status: 'Ativo' },
  })

  useEffect(() => {
    if (open) {
      if (editingCase) {
        reset({
          type: editingCase.type,
          case_number: editingCase.case_number || '',
          parties: editingCase.parties || '',
          court: editingCase.court || '',
          status: editingCase.status || '',
          lifecycle_status: editingCase.lifecycle_status,
          client: editingCase.client || '',
          responsible_collaborator: editingCase.responsible_collaborator || '',
          deadline: editingCase.deadline ? editingCase.deadline.substring(0, 10) : '',
        })
      } else {
        reset({ type: 'Processo', lifecycle_status: 'Ativo' })
      }
    }
  }, [open, editingCase, reset])

  const onSubmit = async (data: CaseFormValues) => {
    const payload = {
      ...data,
      client: data.client || null,
      responsible_collaborator: data.responsible_collaborator || null,
      deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
    }

    try {
      if (editingCase) {
        await updateLegalCase(editingCase.id, payload)
        toast({ title: 'Caso atualizado com sucesso' })
      } else {
        await createLegalCase(payload)
        toast({ title: 'Caso criado com sucesso' })
      }
      onSuccess()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  const selectedType = watch('type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingCase ? 'Editar Registro' : 'Novo Registro de Caso'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
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
                      <SelectItem value="Processo">Processo</SelectItem>
                      <SelectItem value="Serviço Jurídico">Serviço Jurídico</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Número do Processo {selectedType === 'Processo' && '*'}</Label>
              <Input {...register('case_number')} placeholder="0000000-00.0000.0.00.0000" />
              {errors.case_number && (
                <p className="text-xs text-red-500 mt-1">{errors.case_number.message}</p>
              )}
            </div>
            <div className="col-span-2">
              <Label>Partes / Título do Serviço *</Label>
              <Input {...register('parties')} />
              {errors.parties && (
                <p className="text-xs text-red-500 mt-1">{errors.parties.message}</p>
              )}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Tribunal / Órgão</Label>
              <Input {...register('court')} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Fase / Status</Label>
              <Input {...register('status')} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Status do Ciclo</Label>
              <Controller
                name="lifecycle_status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Arquivado">Arquivado</SelectItem>
                      <SelectItem value="Suspenso">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Data de Prazo</Label>
              <Input type="date" {...register('deadline')} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Cliente</Label>
              <Controller
                name="client"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Responsável</Label>
              <Controller
                name="responsible_collaborator"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
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
          </div>
          <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

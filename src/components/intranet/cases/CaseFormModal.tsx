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
import { createLegalCase, updateLegalCase } from '@/services/legal_cases'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Search, Loader2 } from 'lucide-react'

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
    subject: z.string().optional(),
    action_class: z.string().optional(),
    process_type: z.string().optional(),
    distribution_date: z.string().optional(),
    court_alias: z.string().optional(),
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
  const [isSearching, setIsSearching] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
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
          client: editingCase.client || 'none',
          responsible_collaborator: editingCase.responsible_collaborator || 'none',
          deadline: editingCase.deadline ? editingCase.deadline.substring(0, 10) : '',
          subject: editingCase.metadata?.subject || '',
          action_class: editingCase.metadata?.action_class || '',
          process_type: editingCase.metadata?.process_type || '',
          distribution_date: editingCase.metadata?.distribution_date || '',
          court_alias: editingCase.court_alias || '',
        })
      } else {
        reset({ type: 'Processo', lifecycle_status: 'Ativo' })
      }
    }
  }, [open, editingCase, reset])

  const handleDataJudSearch = async () => {
    const num = watch('case_number')
    if (!num) {
      toast({
        title: 'Aviso',
        description: 'Digite o número CNJ primeiro.',
        variant: 'destructive',
      })
      return
    }

    setIsSearching(true)
    try {
      const res = await pb.send('/backend/v1/datajud/autofill', {
        method: 'POST',
        body: JSON.stringify({ number: num }),
      })

      if (res.success && res.data) {
        setValue('court', res.data.court || '')
        setValue('parties', res.data.parties || '')
        setValue('subject', res.data.subject || '')
        setValue('action_class', res.data.class || '')
        setValue('process_type', res.data.processType || '')
        if (res.data.distributionDate) {
          setValue('distribution_date', res.data.distributionDate.substring(0, 10))
        }
        setValue('court_alias', res.data.alias || '')
        toast({ title: 'Sucesso', description: 'Dados preenchidos via DataJud.' })
      } else {
        toast({
          title: 'Atenção',
          description: res.message || 'Processo não encontrado.',
          variant: 'destructive',
        })
      }
    } catch (e: any) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível consultar o DataJud agora.',
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  const onSubmit = async (data: CaseFormValues) => {
    const payload = {
      type: data.type,
      case_number: data.case_number,
      parties: data.parties,
      court: data.court,
      status: data.status,
      lifecycle_status: data.lifecycle_status,
      client: !data.client || data.client === 'none' ? null : data.client,
      responsible_collaborator:
        !data.responsible_collaborator || data.responsible_collaborator === 'none'
          ? null
          : data.responsible_collaborator,
      deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
      court_alias: data.court_alias,
      metadata: {
        subject: data.subject,
        action_class: data.action_class,
        process_type: data.process_type,
        distribution_date: data.distribution_date,
      },
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingCase ? 'Editar Registro' : 'Novo Registro de Caso'}</DialogTitle>
          <DialogDescription>
            Preencha os dados manualmente ou busque no DataJud pelo CNJ.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="col-span-1 md:col-span-2">
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

            <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 w-full">
                <Label>Número do Processo {selectedType === 'Processo' && '*'}</Label>
                <Input {...register('case_number')} placeholder="0000000-00.0000.0.00.0000" />
                {errors.case_number && (
                  <p className="text-xs text-red-500 mt-1">{errors.case_number.message}</p>
                )}
              </div>
              {selectedType === 'Processo' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDataJudSearch}
                  disabled={isSearching}
                  className="w-full sm:w-auto"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Autopreencher DataJud
                </Button>
              )}
            </div>

            <div className="col-span-1 md:col-span-2">
              <Label>Partes / Título do Serviço *</Label>
              <Input {...register('parties')} placeholder="Ex: João da Silva x INSS" />
              {errors.parties && (
                <p className="text-xs text-red-500 mt-1">{errors.parties.message}</p>
              )}
            </div>

            <div className="col-span-1">
              <Label>Tribunal / Órgão</Label>
              <Input {...register('court')} />
            </div>

            <div className="col-span-1">
              <Label>Classe / Espécie da Ação</Label>
              <Input {...register('action_class')} placeholder="Ex: Procedimento Comum Cível" />
            </div>

            <div className="col-span-1">
              <Label>Assunto</Label>
              <Input {...register('subject')} placeholder="Ex: Benefício Assistencial" />
            </div>

            <div className="col-span-1">
              <Label>Data de Distribuição</Label>
              <Input type="date" {...register('distribution_date')} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1">
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

            <div className="col-span-1">
              <Label>Fase / Status Atual</Label>
              <Input {...register('status')} placeholder="Ex: Conhecimento, Recursal..." />
            </div>

            <div className="col-span-1">
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
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="col-span-1">
              <Label>Responsável</Label>
              <Controller
                name="responsible_collaborator"
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

            <div className="col-span-1 md:col-span-2">
              <Label>Prazo / Alerta Principal</Label>
              <Input type="date" {...register('deadline')} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

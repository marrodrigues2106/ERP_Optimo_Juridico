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
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Search, Loader2 } from 'lucide-react'

const formSchema = z
  .object({
    type: z.enum(['Processo', 'Serviço Jurídico']),
    case_number: z.string().optional(),
    parties: z.string().min(1, 'As partes são obrigatórias'),
    court: z.string().optional(),
    court_organ: z.string().optional(),
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
    tags: z.string().optional(),
    estimated_duration: z.coerce.number().min(0).optional(),
    duration_unit: z.enum(['semanas', 'meses']).optional(),
    allocated_fixed_cost: z.coerce.number().min(0).optional(),
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
          court_organ: editingCase.court_organ || '',
          status: editingCase.status || '',
          lifecycle_status: editingCase.lifecycle_status,
          client: editingCase.client || 'none',
          responsible_collaborator: editingCase.responsible_collaborator || 'none',
          deadline: editingCase.deadline ? editingCase.deadline.substring(0, 10) : '',
          subject: editingCase.metadata?.subject || '',
          action_class: editingCase.metadata?.action_class || '',
          process_type: editingCase.metadata?.process_type || '',
          distribution_date: editingCase.distribution_date
            ? editingCase.distribution_date.substring(0, 10)
            : editingCase.metadata?.distribution_date || '',
          court_alias: editingCase.court_alias || '',
          tags: Array.isArray(editingCase.tags) ? editingCase.tags.join(', ') : '',
          estimated_duration: editingCase.estimated_duration || 0,
          duration_unit: editingCase.duration_unit || 'meses',
          allocated_fixed_cost: editingCase.allocated_fixed_cost || 0,
        })
      } else {
        reset({
          type: 'Processo',
          lifecycle_status: 'Ativo',
          tags: '',
          estimated_duration: 0,
          duration_unit: 'meses',
          allocated_fixed_cost: 0,
        })
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
        if (res.data.court) setValue('court', res.data.court)
        if (res.data.courtOrgan) setValue('court_organ', res.data.courtOrgan)
        if (res.data.parties) setValue('parties', res.data.parties)
        if (res.data.subject) setValue('subject', res.data.subject)
        if (res.data.class) setValue('action_class', res.data.class)
        if (res.data.processType) setValue('process_type', res.data.processType)
        if (res.data.status) {
          setValue('status', res.data.status)
        }
        if (res.data.distributionDate) {
          try {
            setValue('distribution_date', res.data.distributionDate.substring(0, 10))
          } catch (err) {
            // Ignorar
          }
        }
        if (res.data.alias) setValue('court_alias', res.data.alias)
        toast({ title: 'Sucesso', description: 'Dados preenchidos via DataJud.' })
      } else {
        toast({
          title: 'Atenção',
          description: res.message || 'Processo não encontrado.',
          variant: 'destructive',
        })
      }
    } catch (e: any) {
      let errorMsg = 'Não foi possível consultar o DataJud agora.'
      let isPermissionError = e.status === 403 || e.status === 401

      if (e.response?.error) {
        errorMsg = e.response.error
        if (errorMsg.includes('permissão de leitura para o tribunal')) {
          isPermissionError = true
        }
      }

      if (isPermissionError || errorMsg.includes('Erro de Autorização')) {
        const tAlias = watch('court_alias') || watch('court') || 'selecionado'
        errorMsg = `Erro de Autorização: A chave não tem permissão para acessar ${tAlias}.`
        isPermissionError = true
      }

      toast({
        title: isPermissionError ? 'Acesso Negado' : 'Erro',
        description: errorMsg,
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
      court_organ: data.court_organ,
      status: data.status,
      lifecycle_status: data.lifecycle_status,
      client: !data.client || data.client === 'none' ? null : data.client,
      responsible_collaborator:
        !data.responsible_collaborator || data.responsible_collaborator === 'none'
          ? null
          : data.responsible_collaborator,
      deadline:
        data.deadline && !isNaN(new Date(data.deadline).getTime())
          ? new Date(data.deadline).toISOString()
          : null,
      distribution_date:
        data.distribution_date && !isNaN(new Date(data.distribution_date).getTime())
          ? new Date(data.distribution_date).toISOString()
          : null,
      court_alias: data.court_alias,
      tags: data.tags
        ? data.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      estimated_duration: data.estimated_duration,
      duration_unit: data.duration_unit,
      allocated_fixed_cost: data.allocated_fixed_cost,
      metadata: {
        subject: data.subject,
        action_class: data.action_class,
        process_type: data.process_type,
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
      toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    }
  }

  const selectedType = watch('type')
  const currentCaseNumber = watch('case_number')

  useEffect(() => {
    if (selectedType === 'Serviço Jurídico') {
      setValue('case_number', '')
    }
  }, [selectedType, setValue])

  useEffect(() => {
    if (selectedType === 'Processo' && currentCaseNumber && !editingCase) {
      const justNumbers = currentCaseNumber.replace(/\D/g, '')
      if (justNumbers.length === 20 && !isSearching) {
        const timeout = setTimeout(() => {
          handleDataJudSearch()
        }, 1000)
        return () => clearTimeout(timeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCaseNumber, selectedType, editingCase])

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
                <Input
                  {...register('case_number')}
                  placeholder="0000000-00.0000.0.00.0000"
                  disabled={selectedType === 'Serviço Jurídico'}
                />
                {errors.case_number && selectedType === 'Processo' && (
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
              <Label>Tribunal</Label>
              <Input {...register('court')} placeholder="Ex: TJ-SP" />
            </div>

            <div className="col-span-1">
              <Label>Órgão Julgador</Label>
              <Input {...register('court_organ')} placeholder="Ex: 1ª Vara Cível" />
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
            <div className="col-span-1 md:col-span-2">
              <Label>Etiquetas (separadas por vírgula)</Label>
              <Input {...register('tags')} placeholder="Ex: Trabalhista, Urgente, Cliente Vip" />
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="col-span-1 md:col-span-3">
              <h4 className="font-semibold text-sm text-slate-800">Estimativa de Prazo</h4>
            </div>
            <div className="col-span-1">
              <Label>Duração do Trabalho</Label>
              <Input
                type="number"
                step="0.1"
                {...register('estimated_duration')}
                placeholder="Ex: 6"
              />
            </div>
            <div className="col-span-1">
              <Label>Unidade</Label>
              <Controller
                name="duration_unit"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'meses'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanas">Semanas</SelectItem>
                      <SelectItem value="meses">Meses</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="col-span-1">
              <Label>Custo Fixo Alocado (Mensal)</Label>
              <Input
                type="number"
                step="0.01"
                {...register('allocated_fixed_cost')}
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Registro'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

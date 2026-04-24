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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createLegalCase, updateLegalCase } from '@/services/legal_cases'
import { createClient } from '@/services/clients'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Search, Loader2, X, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const formSchema = z
  .object({
    title: z.string().min(1, 'O título é obrigatório'),
    type: z.enum(['Processo', 'Serviço Jurídico']),
    case_number: z.string().optional(),
    parties: z.string().min(1, 'As partes são obrigatórias'),
    court: z.string().optional(),
    court_organ: z.string().optional(),
    status: z.string().optional(),
    lifecycle_status: z.enum(['Ativo', 'Inativo', 'Arquivado', 'Suspenso']),
    client: z.union([z.string(), z.array(z.string())]).optional(),
    responsible_collaborator: z.union([z.string(), z.array(z.string())]).optional(),
    deadline: z.string().optional(),
    subject: z.string().optional(),
    action_class: z.string().optional(),
    process_type: z.string().optional(),
    distribution_date: z.string().optional(),
    court_alias: z.string().optional(),
    tags: z.array(z.string()).optional(),
    estimated_duration: z.coerce.number().min(0).optional(),
    duration_unit: z.enum(['semanas', 'meses']).optional(),
    allocated_fixed_cost: z.coerce.number().min(0).optional(),
    description: z.string().optional(),
    observations: z.string().optional(),
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
  clients: externalClients,
  collaborators,
  onSuccess,
}: Props) {
  const { toast } = useToast()
  const [isSearching, setIsSearching] = useState(false)
  const [tribunals, setTribunals] = useState<any[]>([])
  const [tagInput, setTagInput] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [openClientCombo, setOpenClientCombo] = useState(false)
  const [openCollabCombo, setOpenCollabCombo] = useState(false)
  const [openCourtCombo, setOpenCourtCombo] = useState(false)

  const [localClients, setLocalClients] = useState<any[]>([])
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    cpf: '',
    idNumber: '',
    address: '',
    birthDate: '',
    nationality: '',
    maritalStatus: '',
    profession: '',
    classification: 'Ativo',
  })
  const [phoneNumbers, setPhoneNumbers] = useState([{ number: '', type: 'Celular' }])

  useEffect(() => {
    setLocalClients(externalClients)
  }, [externalClients])

  useEffect(() => {
    pb.collection('tribunals').getFullList({ sort: 'name' }).then(setTribunals).catch(console.error)

    const orgId = pb.authStore.record?.active_organization
    pb.collection('legal_cases')
      .getFullList({ fields: 'tags', filter: orgId ? `organization = "${orgId}"` : '' })
      .then((cases) => {
        const tagSet = new Set<string>()
        cases.forEach((c) => {
          if (Array.isArray(c.tags)) c.tags.forEach((t: string) => tagSet.add(t))
        })
        setAllTags(Array.from(tagSet).sort())
      })
      .catch(() => {})
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: 'Processo', lifecycle_status: 'Ativo' },
  })

  useEffect(() => {
    if (open) {
      if (editingCase) {
        reset({
          title: editingCase.title || editingCase.parties || '',
          type: editingCase.type,
          case_number: editingCase.case_number || '',
          parties: editingCase.parties || '',
          court: (editingCase.court_alias || editingCase.court || '').toLowerCase(),
          court_organ: editingCase.court_organ || '',
          status: editingCase.status || '',
          lifecycle_status: editingCase.lifecycle_status,
          client: Array.isArray(editingCase.client)
            ? editingCase.client
            : editingCase.client
              ? [editingCase.client]
              : [],
          responsible_collaborator: editingCase.responsible_collaborator || [],
          deadline: editingCase.deadline ? editingCase.deadline.substring(0, 10) : '',
          subject: editingCase.metadata?.subject || '',
          action_class: editingCase.metadata?.action_class || '',
          process_type: editingCase.metadata?.process_type || '',
          distribution_date: editingCase.distribution_date
            ? editingCase.distribution_date.substring(0, 10)
            : editingCase.metadata?.distribution_date || '',
          court_alias: (editingCase.court_alias || editingCase.court || '').toLowerCase(),
          tags: Array.isArray(editingCase.tags) ? editingCase.tags : [],
          estimated_duration: editingCase.estimated_duration || 0,
          duration_unit: editingCase.duration_unit || 'meses',
          allocated_fixed_cost: editingCase.allocated_fixed_cost || 0,
          description: editingCase.description || '',
          observations: editingCase.observations || '',
        })
      } else {
        reset({
          title: '',
          type: 'Processo',
          lifecycle_status: 'Ativo',
          client: [],
          responsible_collaborator: [],
          tags: [],
          estimated_duration: 0,
          duration_unit: 'meses',
          allocated_fixed_cost: 0,
          description: '',
          observations: '',
        })
      }
    }
  }, [open, editingCase, reset])

  const [pjeMovements, setPjeMovements] = useState<any[]>([])

  const handleCreateClient = async () => {
    try {
      const phones = phoneNumbers.filter((p) => p.number.trim() !== '')

      const record = await createClient({
        ...newClientData,
        fullName: newClientData.name,
        phone_numbers: phones,
        phone: phones.length > 0 ? phones[0].number : '',
        phone_type: phones.length > 0 ? phones[0].type : '',
        status: 'Active',
      })
      setLocalClients((prev) => [...prev, record])
      const current = getValues('client')
      const currentArray = Array.isArray(current)
        ? current
        : current && current !== 'none'
          ? [current]
          : []
      setValue('client', [...currentArray, record.id])
      setIsNewClientOpen(false)
      setNewClientData({
        name: '',
        email: '',
        cpf: '',
        idNumber: '',
        address: '',
        birthDate: '',
        nationality: '',
        maritalStatus: '',
        profession: '',
        classification: 'Ativo',
      })
      setPhoneNumbers([{ number: '', type: 'Celular' }])
      toast({ title: 'Cliente cadastrado com sucesso' })
      onSuccess() // refresh parent data
    } catch (e: any) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' })
    }
  }

  const handlePjeSearch = async () => {
    const rawNum = watch('case_number')
    const num = rawNum?.replace(/\D/g, '')
    if (!num || num.length !== 20) {
      toast({
        title: 'Aviso',
        description: 'Digite um número CNJ válido com 20 dígitos primeiro.',
        variant: 'destructive',
      })
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(
        `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${num}`,
      )
      if (!res.ok) {
        throw new Error('Processo não encontrado ou serviço PJe indisponível no momento.')
      }
      const data = await res.json()

      const items = data.items || (Array.isArray(data) ? data : [])
      if (!Array.isArray(items) || items.length === 0) {
        toast({
          title: 'Atenção',
          description: 'Processo não encontrado ou serviço PJe indisponível no momento.',
          variant: 'destructive',
        })
        return
      }

      const item = items[0]
      const court = item.siglaTribunal || ''
      if (court) {
        setValue('court', court.toLowerCase())
        setValue('court_alias', court.toLowerCase())
      }

      if (item.orgaoJulgador) {
        setValue('court_organ', item.orgaoJulgador)
      }

      const classe = item.classe || item.classeProcessual || ''
      if (classe) {
        setValue('action_class', classe)
      }

      const assunto = item.assunto || (item.assuntos ? item.assuntos.join(', ') : '')
      if (assunto) {
        setValue('subject', assunto)
      }

      const currentDesc = getValues('description') || ''
      let newDesc = currentDesc
      if (classe && !newDesc.includes(classe))
        newDesc += (newDesc ? '\n' : '') + `Classe: ${classe}`
      if (assunto && !newDesc.includes(assunto))
        newDesc += (newDesc ? '\n' : '') + `Assunto: ${assunto}`
      setValue('description', newDesc)

      const distDate = item.dataAjuizamento || item.dataAutuacao
      if (distDate) {
        setValue('distribution_date', distDate.substring(0, 10))
      }

      const allParties = new Set<string>()
      items.forEach((item: any) => {
        if (Array.isArray(item.destinatarios)) {
          item.destinatarios.forEach((d: any) => {
            if (d.nome) allParties.add(d.nome)
          })
        }
      })
      if (allParties.size > 0) {
        setValue('parties', Array.from(allParties).join(' x '))
      }

      const parsedMovements = items.map((item: any) => ({
        event_date: item.dataDisponibilizacao,
        description: item.tipoComunicacao || 'Comunicação PJe',
        details: item.texto || '',
        source: 'PJe',
        external_id: item.id?.toString() || item.hash || '',
        movement_details: item,
      }))

      setPjeMovements(parsedMovements)
      toast({ title: 'Sucesso', description: 'Dados preenchidos via PJe.' })
    } catch (e: any) {
      toast({
        title: 'Atenção',
        description: 'Processo não encontrado ou serviço PJe indisponível no momento.',
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  const onSubmit = async (data: CaseFormValues) => {
    let finalClients = data.client
    if (finalClients === 'none') finalClients = []
    else if (typeof finalClients === 'string') finalClients = [finalClients]
    if (Array.isArray(finalClients) && finalClients.length === 0) finalClients = null as any

    const payload = {
      title: data.title,
      type: data.type,
      case_number: data.type === 'Serviço Jurídico' ? '' : data.case_number,
      parties: data.parties,
      court: data.court?.toLowerCase(),
      court_organ: data.court_organ,
      status: data.status,
      lifecycle_status: data.lifecycle_status,
      client: finalClients,
      responsible_collaborator:
        !data.responsible_collaborator ||
        (Array.isArray(data.responsible_collaborator) &&
          data.responsible_collaborator.length === 0) ||
        data.responsible_collaborator === 'none'
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
      court_alias: data.court_alias?.toLowerCase(),
      tags: data.tags || [],
      estimated_duration: data.estimated_duration,
      duration_unit: data.duration_unit,
      allocated_fixed_cost: data.allocated_fixed_cost,
      description: data.description,
      observations: data.observations,
      metadata: {
        subject: data.subject,
        action_class: data.action_class,
        process_type: data.process_type,
      },
    }

    try {
      let caseId = ''
      if (editingCase) {
        const record = await updateLegalCase(editingCase.id, payload)
        caseId = record.id
        toast({ title: 'Caso atualizado com sucesso' })
      } else {
        const record = await createLegalCase(payload)
        caseId = record.id
        toast({ title: 'Caso criado com sucesso' })
      }

      if (pjeMovements.length > 0 && caseId) {
        const existingMovements = await pb.collection('case_movements').getFullList({
          filter: `case = "${caseId}" && deleted_at = ""`,
          fields: 'external_id,description,event_date',
        })
        const existingExternalIds = new Set(
          existingMovements.map((m) => m.external_id).filter(Boolean),
        )

        for (const mov of pjeMovements) {
          const extId = mov.external_id ? `pje-${mov.external_id}` : undefined
          if (extId && existingExternalIds.has(extId)) {
            continue
          }

          const dateStr = mov.event_date
            ? mov.event_date.substring(0, 10)
            : new Date().toISOString().substring(0, 10)
          const isDuplicate = existingMovements.some((m) => {
            return m.description === mov.description && m.event_date?.startsWith(dateStr)
          })

          if (isDuplicate) {
            continue
          }

          try {
            await pb.collection('case_movements').create({
              case: caseId,
              event_date: mov.event_date
                ? new Date(mov.event_date).toISOString()
                : new Date().toISOString(),
              description: mov.description,
              details: mov.details,
              source: 'PJe',
              external_id: extId,
              movement_details: mov.movement_details,
              organization: pb.authStore.record?.active_organization,
            })
          } catch (err) {
            console.error('Failed to create movement', err)
          }
        }
      }

      onSuccess()
      onOpenChange(false)
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
          handlePjeSearch()
        }, 1000)
        return () => clearTimeout(timeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCaseNumber, selectedType, editingCase])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCase ? 'Editar Registro' : 'Novo Registro de Caso'}</DialogTitle>
            <DialogDescription>
              Preencha os dados manualmente ou busque no PJe pelo CNJ.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="col-span-1 md:col-span-2">
                <Label>Título / Identificação do Caso *</Label>
                <Input
                  {...register('title')}
                  placeholder="Ex: Ação Indenizatória - Cliente X"
                  className="font-medium text-lg bg-white"
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="col-span-1 md:col-span-2">
                <Label>Tipo</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-white">
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
                <div className="flex-1 w-full relative">
                  <Label>Número do Processo {selectedType === 'Processo' && '*'}</Label>
                  <div className="relative">
                    <Input
                      {...register('case_number')}
                      placeholder="0000000-00.0000.0.00.0000"
                      disabled={selectedType === 'Serviço Jurídico'}
                      className={cn(
                        'bg-white',
                        selectedType === 'Serviço Jurídico' && 'bg-slate-100',
                      )}
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                  {errors.case_number && selectedType === 'Processo' && (
                    <p className="text-xs text-red-500 mt-1">{errors.case_number.message}</p>
                  )}
                </div>
                {selectedType === 'Processo' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePjeSearch}
                    disabled={isSearching}
                    className="w-full sm:w-auto bg-white"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Autopreencher PJe
                  </Button>
                )}
              </div>

              <div className="col-span-1 md:col-span-2">
                <Label>Partes / Título do Serviço *</Label>
                <Input
                  {...register('parties')}
                  placeholder="Ex: João da Silva x INSS"
                  className="bg-white"
                />
                {errors.parties && (
                  <p className="text-xs text-red-500 mt-1">{errors.parties.message}</p>
                )}
              </div>

              <div className="col-span-1">
                <Label>Tribunal</Label>
                <Controller
                  name="court"
                  control={control}
                  render={({ field }) => {
                    const currentCourt = field.value || ''
                    const courtOptions = [...tribunals]
                    if (
                      currentCourt &&
                      !courtOptions.find(
                        (t) => t.alias?.toLowerCase() === currentCourt.toLowerCase(),
                      )
                    ) {
                      courtOptions.push({
                        id: 'custom',
                        name: currentCourt.toUpperCase(),
                        alias: currentCourt.toLowerCase(),
                      })
                    }

                    return (
                      <Popover open={openCourtCombo} onOpenChange={setOpenCourtCombo}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCourtCombo}
                            className={cn(
                              'w-full justify-between font-normal px-3 uppercase bg-white',
                              selectedType === 'Serviço Jurídico' &&
                                'opacity-50 pointer-events-none bg-slate-100',
                            )}
                            disabled={selectedType === 'Serviço Jurídico'}
                          >
                            <span className="truncate pr-4">
                              {currentCourt ? currentCourt : 'Selecione o tribunal...'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          align="start"
                        >
                          <Command>
                            <CommandInput placeholder="Buscar tribunal..." />
                            <CommandList>
                              <CommandEmpty>Nenhum tribunal encontrado.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="none"
                                  onSelect={() => {
                                    field.onChange('')
                                    setValue('court_alias', '')
                                    setOpenCourtCombo(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      !currentCourt ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  Nenhum tribunal
                                </CommandItem>
                                {courtOptions.map((t) => (
                                  <CommandItem
                                    key={t.id || t.alias}
                                    value={`${t.alias} ${t.name}`}
                                    onSelect={() => {
                                      field.onChange(t.alias?.toLowerCase())
                                      setValue('court_alias', t.alias?.toLowerCase())
                                      setOpenCourtCombo(false)
                                    }}
                                    className="uppercase"
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        currentCourt === t.alias?.toLowerCase()
                                          ? 'opacity-100'
                                          : 'opacity-0',
                                      )}
                                    />
                                    {t.alias?.toLowerCase()}{' '}
                                    {t.name && t.name.toLowerCase() !== t.alias?.toLowerCase()
                                      ? `- ${t.name}`
                                      : ''}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )
                  }}
                />
              </div>

              <div className="col-span-1">
                <Label>Órgão Julgador</Label>
                <Input
                  {...register('court_organ')}
                  placeholder="Ex: 1ª Vara Cível"
                  disabled={selectedType === 'Serviço Jurídico'}
                  className={cn(
                    'bg-white',
                    selectedType === 'Serviço Jurídico' && 'opacity-50 bg-slate-100',
                  )}
                />
              </div>

              <div className="col-span-1">
                <Label>Classe / Espécie da Ação</Label>
                <Input
                  {...register('action_class')}
                  placeholder="Ex: Procedimento Comum Cível"
                  disabled={selectedType === 'Serviço Jurídico'}
                  className={cn(
                    'bg-white',
                    selectedType === 'Serviço Jurídico' && 'opacity-50 bg-slate-100',
                  )}
                />
              </div>

              <div className="col-span-1">
                <Label>Assunto</Label>
                <Input
                  {...register('subject')}
                  placeholder="Ex: Benefício Assistencial"
                  disabled={selectedType === 'Serviço Jurídico'}
                  className={cn(
                    'bg-white',
                    selectedType === 'Serviço Jurídico' && 'opacity-50 bg-slate-100',
                  )}
                />
              </div>

              <div className="col-span-1">
                <Label>Data de Distribuição</Label>
                <Input
                  type="date"
                  {...register('distribution_date')}
                  disabled={selectedType === 'Serviço Jurídico'}
                  className={cn(
                    'bg-white',
                    selectedType === 'Serviço Jurídico' && 'opacity-50 bg-slate-100',
                  )}
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <Label>Etiquetas</Label>
                <div className="flex flex-col gap-2 mt-1">
                  <Popover open={showTagSuggestions} onOpenChange={setShowTagSuggestions}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={showTagSuggestions}
                        className="w-full justify-between font-normal bg-white"
                      >
                        {watch('tags')?.length
                          ? `${watch('tags')?.length} etiqueta(s) selecionada(s)`
                          : 'Selecione ou crie etiquetas...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder="Buscar ou criar etiqueta..."
                          value={tagInput}
                          onValueChange={setTagInput}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {tagInput.trim() ? (
                              <Button
                                variant="ghost"
                                className="w-full justify-start px-2 py-1.5 text-sm font-medium text-primary"
                                onClick={() => {
                                  const current = watch('tags') || []
                                  if (!current.includes(tagInput.trim())) {
                                    setValue('tags', [...current, tagInput.trim()])
                                    setAllTags((prev) =>
                                      Array.from(new Set([...prev, tagInput.trim()])).sort(),
                                    )
                                  }
                                  setTagInput('')
                                  setShowTagSuggestions(false)
                                }}
                              >
                                Criar nova etiqueta: "{tagInput.trim()}"
                              </Button>
                            ) : (
                              'Nenhuma etiqueta encontrada.'
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {allTags
                              .filter((t) => !(watch('tags') || []).includes(t))
                              .map((t) => (
                                <CommandItem
                                  key={t}
                                  value={t}
                                  onSelect={() => {
                                    const current = watch('tags') || []
                                    if (!current.includes(t)) {
                                      setValue('tags', [...current, t])
                                    }
                                    setTagInput('')
                                  }}
                                >
                                  {t}
                                </CommandItem>
                              ))}
                            {tagInput.trim() &&
                              !allTags.find(
                                (t) => t.toLowerCase() === tagInput.trim().toLowerCase(),
                              ) && (
                                <CommandItem
                                  value={tagInput.trim()}
                                  onSelect={() => {
                                    const current = watch('tags') || []
                                    if (!current.includes(tagInput.trim())) {
                                      setValue('tags', [...current, tagInput.trim()])
                                      setAllTags((prev) =>
                                        Array.from(new Set([...prev, tagInput.trim()])).sort(),
                                      )
                                    }
                                    setTagInput('')
                                  }}
                                  className="text-primary font-medium"
                                >
                                  Criar nova etiqueta: "{tagInput.trim()}"
                                </CommandItem>
                              )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {(watch('tags')?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {watch('tags')?.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200"
                        >
                          {tag}
                          <button
                            type="button"
                            className="hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                            onClick={() => {
                              const current = watch('tags') || []
                              setValue(
                                'tags',
                                current.filter((_, i) => i !== index),
                              )
                            }}
                          >
                            <X className="w-3 h-3 text-slate-500 hover:text-slate-800" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
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
                        <SelectItem value="Inativo">Inativo</SelectItem>
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

              <div className="col-span-1 flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Clientes Vinculados</Label>
                  <Controller
                    name="client"
                    control={control}
                    render={({ field }) => {
                      const selectedIds = Array.isArray(field.value)
                        ? field.value
                        : field.value && field.value !== 'none'
                          ? [field.value]
                          : []
                      return (
                        <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openClientCombo}
                              className="w-full justify-between font-normal h-auto min-h-10 py-2 px-3"
                            >
                              <div className="flex flex-wrap gap-1 items-center">
                                {selectedIds.length > 0 ? (
                                  selectedIds.map((id) => {
                                    const c = localClients.find((x) => x.id === id)
                                    return c ? (
                                      <Badge
                                        variant="secondary"
                                        key={id}
                                        className="text-xs font-medium"
                                      >
                                        {c.name}
                                      </Badge>
                                    ) : null
                                  })
                                ) : (
                                  <span className="text-slate-500">Selecionar clientes...</span>
                                )}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Buscar cliente..." />
                              <CommandList>
                                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {localClients.map((c) => {
                                    const isSelected = selectedIds.includes(c.id)
                                    return (
                                      <CommandItem
                                        key={c.id}
                                        value={c.name}
                                        onSelect={() => {
                                          if (isSelected) {
                                            field.onChange(selectedIds.filter((id) => id !== c.id))
                                          } else {
                                            field.onChange([...selectedIds, c.id])
                                          }
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            isSelected ? 'opacity-100' : 'opacity-0',
                                          )}
                                        />
                                        {c.name}
                                      </CommandItem>
                                    )
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="px-3"
                  onClick={() => setIsNewClientOpen(true)}
                  title="Novo Cliente Rápido"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="col-span-1">
                <Label>Equipe Responsável</Label>
                <Controller
                  name="responsible_collaborator"
                  control={control}
                  render={({ field }) => {
                    const selectedIds = Array.isArray(field.value)
                      ? field.value
                      : field.value && field.value !== 'none'
                        ? [field.value]
                        : []
                    return (
                      <Popover open={openCollabCombo} onOpenChange={setOpenCollabCombo}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCollabCombo}
                            className="w-full justify-between font-normal h-auto min-h-10 py-2 px-3"
                          >
                            <div className="flex flex-wrap gap-1 items-center">
                              {selectedIds.length > 0 ? (
                                selectedIds.map((id) => {
                                  const c = collaborators.find((x) => x.id === id)
                                  return c ? (
                                    <Badge
                                      variant="secondary"
                                      key={id}
                                      className="text-xs font-medium"
                                    >
                                      {c.name}
                                    </Badge>
                                  ) : null
                                })
                              ) : (
                                <span className="text-slate-500">Selecionar equipe...</span>
                              )}
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          align="start"
                        >
                          <Command>
                            <CommandInput placeholder="Buscar colaborador..." />
                            <CommandList>
                              <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                              <CommandGroup>
                                {collaborators.map((c) => {
                                  const isSelected = selectedIds.includes(c.id)
                                  return (
                                    <CommandItem
                                      key={c.id}
                                      value={c.name}
                                      onSelect={() => {
                                        if (isSelected) {
                                          field.onChange(selectedIds.filter((id) => id !== c.id))
                                        } else {
                                          field.onChange([...selectedIds, c.id])
                                        }
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          isSelected ? 'opacity-100' : 'opacity-0',
                                        )}
                                      />
                                      {c.name}
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )
                  }}
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <Label>Prazo / Alerta Principal</Label>
                <Input type="date" {...register('deadline')} />
              </div>

              <div className="col-span-1 md:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  {...register('description')}
                  placeholder="Descrição do caso/serviço..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  {...register('observations')}
                  placeholder="Observações adicionais..."
                  className="min-h-[80px]"
                />
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
                  className="bg-white"
                />
              </div>
              <div className="col-span-1">
                <Label>Unidade</Label>
                <Controller
                  name="duration_unit"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'meses'}>
                      <SelectTrigger className="bg-white">
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
                  className="bg-white"
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

      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Novo Cliente Rápido</DialogTitle>
            <DialogDescription>
              Cadastre um novo cliente para vinculá-lo imediatamente a este processo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4 overflow-y-auto px-1 pb-6 custom-scrollbar">
            <div>
              <Label>Nome Completo / Razão Social *</Label>
              <Input
                value={newClientData.name}
                onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                placeholder="Ex: Maria Souza"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>CPF / CNPJ</Label>
                <Input
                  value={newClientData.cpf}
                  onChange={(e) => setNewClientData({ ...newClientData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label>RG / Inscrição Estadual</Label>
                <Input
                  value={newClientData.idNumber}
                  onChange={(e) => setNewClientData({ ...newClientData, idNumber: e.target.value })}
                  placeholder="00.000.000-0"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={newClientData.email}
                onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                placeholder="Ex: maria@email.com"
                type="email"
              />
            </div>

            <div>
              <Label className="mb-2 block">Telefones</Label>
              <div className="space-y-2">
                {phoneNumbers.map((phone, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={phone.number}
                      onChange={(e) => {
                        const newPhones = [...phoneNumbers]
                        newPhones[idx].number = e.target.value
                        setPhoneNumbers(newPhones)
                      }}
                      placeholder="(00) 00000-0000"
                      className="flex-1"
                    />
                    <Select
                      value={phone.type}
                      onValueChange={(val) => {
                        const newPhones = [...phoneNumbers]
                        newPhones[idx].type = val
                        setPhoneNumbers(newPhones)
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Celular">Celular</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Fixo">Fixo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPhoneNumbers(phoneNumbers.filter((_, i) => i !== idx))
                      }}
                      disabled={phoneNumbers.length === 1 && !phone.number}
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPhoneNumbers([...phoneNumbers, { number: '', type: 'Celular' }])
                  }
                  className="mt-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Telefone
                </Button>
              </div>
            </div>

            <div>
              <Label>Endereço Completo</Label>
              <Input
                value={newClientData.address}
                onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={newClientData.birthDate}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, birthDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Nacionalidade</Label>
                <Input
                  value={newClientData.nationality}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, nationality: e.target.value })
                  }
                  placeholder="Ex: Brasileiro"
                />
              </div>
              <div>
                <Label>Estado Civil</Label>
                <Select
                  value={newClientData.maritalStatus}
                  onValueChange={(val) =>
                    setNewClientData({ ...newClientData, maritalStatus: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
                <Input
                  value={newClientData.profession}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, profession: e.target.value })
                  }
                  placeholder="Ex: Engenheiro"
                />
              </div>
            </div>

            <div>
              <Label>Classificação</Label>
              <Select
                value={newClientData.classification}
                onValueChange={(val) => setNewClientData({ ...newClientData, classification: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCreateClient}
              className="w-full mt-4 shrink-0"
              disabled={!newClientData.name.trim()}
            >
              Cadastrar e Vincular
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

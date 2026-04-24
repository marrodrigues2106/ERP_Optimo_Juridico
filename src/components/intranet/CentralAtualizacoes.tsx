import { useState, useEffect, useMemo, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import {
  Activity,
  BookOpen,
  Landmark,
  CheckCircle2,
  Archive,
  Calendar as CalendarIcon,
  CheckSquare,
  Eye,
  FileText,
  Bookmark,
  Trash2,
  MoreVertical,
  FileEdit,
  Check,
  XCircle,
  Wallet,
  ListTodo,
  MessageCircle,
  Mail,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { EmailSenderModal } from './EmailSenderModal'

type UnifiedItem = {
  id: string
  collection: string
  type:
    | 'PJe'
    | 'DOU'
    | 'Processo Novo'
    | 'Ocorrência'
    | 'Movimentação'
    | 'Tarefa'
    | 'Agenda'
    | 'Financeiro'
  title: string
  description: string
  date: string
  isRead: boolean
  isArchived: boolean
  isSaved?: boolean
  treatmentStatus?: string
  caseNumber?: string
  caseTitle?: string
  parties?: string
  caseId?: string
  clientId?: string
  clientName?: string
  clientPhone?: string
  raw: any
}

export default function CentralAtualizacoes() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [items, setItems] = useState<UnifiedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('inbox')
  const [currentPage, setCurrentPage] = useState(1)

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const stored = localStorage.getItem('alert_center_per_page')
    return stored ? Number(stored) : 10
  })

  useEffect(() => {
    localStorage.setItem('alert_center_per_page', itemsPerPage.toString())
  }, [itemsPerPage])

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [shareTemplate, setShareTemplate] = useState('custom')
  const [shareClientId, setShareClientId] = useState('')
  const [sharePhone, setSharePhone] = useState('')
  const [shareClients, setShareClients] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null)

  useEffect(() => {
    if (shareDialogOpen && shareClients.length === 0) {
      pb.collection('clients')
        .getFullList({ filter: 'deleted_at=""', sort: 'name' })
        .then(setShareClients)
        .catch(console.error)
    }
  }, [shareDialogOpen])

  const generateShareMessage = (cId: string, tpl: string, item: UnifiedItem | null) => {
    const c = shareClients.find((x) => x.id === cId)
    const cName = c?.fullName || c?.name || item?.clientName || ''
    const orgName = pb.authStore.record?.expand?.active_organization?.name || 'Nosso Escritório'
    const dataAlerta = item?.date
      ? format(new Date(item.date), 'dd/MM/yyyy')
      : format(new Date(), 'dd/MM/yyyy')
    const movementDesc = item?.description?.replace(/<[^>]*>?/gm, '').trim() || ''

    let msg = `Olá, ${cName}.`
    if (tpl === 'aniversario') {
      msg = `Olá, ${cName}. O escritório ${orgName} gostaria de parabenizá-lo e lhe desejar muita saúde e anos de vida nesta data especial do seu aniversário. Att. Equipe ${orgName}`
    } else if (tpl === 'processual' && item) {
      const processInfo = item.caseNumber
        ? `${item.caseNumber} (${item.parties || item.caseTitle || ''})`
        : item.caseTitle || ''
      msg = `Olá, ${cName}.\n\nInformamos sobre a seguinte movimentação no processo ${processInfo}:\n\nData do Alerta: ${dataAlerta}\nAndamento: ${movementDesc}\n\nAtt. Equipe ${orgName}`
    } else if (tpl === 'financeiro' && item) {
      msg = `Olá, ${cName}.\n\nInformamos sobre a seguinte movimentação financeira:\n\n*Descrição:* ${item.title}\n${movementDesc}\n\nAtt. Equipe ${orgName}`
    }

    return msg
      .replace(/\{data_alerta\}/gi, dataAlerta)
      .replace(/\{\{alert_date\}\}/gi, dataAlerta)
      .replace(/\{nome_organizacao\}/gi, orgName)
      .replace(/\{nome organização\}/gi, orgName)
      .replace(/\{\{org_name\}\}/gi, orgName)
      .replace(/\{\{movement_description\}\}/gi, movementDesc)
  }

  const handleClientSelect = (cId: string) => {
    setShareClientId(cId)
    const c = shareClients.find((x) => x.id === cId)
    if (c) {
      setSharePhone(c.phone || '')
      setShareMessage(generateShareMessage(cId, shareTemplate, selectedItem))
    }
  }

  const handleTemplateChange = (tpl: string) => {
    setShareTemplate(tpl)
    setShareMessage(generateShareMessage(shareClientId, tpl, selectedItem))
  }

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)

  const isProcessingBatchRef = useRef(isProcessingBatch)
  useEffect(() => {
    isProcessingBatchRef.current = isProcessingBatch
  }, [isProcessingBatch])

  useRealtime('pje_communications', () => {
    if (!isProcessingBatchRef.current) loadData()
  })
  useRealtime('gazette_publications', () => {
    if (!isProcessingBatchRef.current) loadData()
  })
  useRealtime('ocorrencias_dou', () => {
    if (!isProcessingBatchRef.current) loadData()
  })
  useRealtime('case_movements', () => {
    if (!isProcessingBatchRef.current) loadData()
  })
  useRealtime('tasks', () => {
    if (!isProcessingBatchRef.current) loadData()
  })
  useRealtime('agenda_events', () => {
    if (!isProcessingBatchRef.current) loadData()
  })
  useRealtime('finances', () => {
    if (!isProcessingBatchRef.current) loadData()
  })
  useRealtime('notifications', () => {
    if (!isProcessingBatchRef.current) loadData()
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const orgId = pb.authStore.record?.active_organization
      const orgFilter = orgId ? ` && organization = "${orgId}"` : ''
      const isArchivedFilter =
        activeTab === 'arquivados' ? 'is_archived = true' : 'is_archived = false'

      const [pjeRes, douPub, douOcc, moveRes, tasksRes, agendaRes, finRes, notifRes, casesRes] =
        await Promise.all([
          pb.collection('pje_communications').getList(1, 300, {
            filter: `${isArchivedFilter}${orgFilter}`,
            sort: '-dataDisponibilizacao',
            expand: 'linked_case',
          }),
          pb.collection('gazette_publications').getList(1, 300, {
            filter: `${isArchivedFilter}${orgFilter}`,
            sort: '-data_publicacao',
          }),
          pb
            .collection('ocorrencias_dou')
            .getList(1, 300, { filter: isArchivedFilter, sort: '-created' }),
          pb.collection('case_movements').getList(1, 50, {
            filter: `notified_client = false && deleted_at = ""${orgFilter}`,
            sort: '-event_date',
            expand: 'case.client',
          }),
          pb.collection('tasks').getList(1, 50, {
            filter: `status = "todo" && deleted_at = ""${orgFilter}`,
            sort: 'due_date',
            expand: 'linked_lawsuit.client',
          }),
          pb.collection('agenda_events').getList(1, 50, {
            filter: `start_date >= "${new Date().toISOString().split('T')[0]} 00:00:00" && deleted_at = ""${orgFilter}`,
            sort: 'start_date',
            expand: 'linked_lawsuit.client',
          }),
          pb.collection('finances').getList(1, 50, {
            filter: `${isArchivedFilter} && status != "pago" && status != "recebida" && status != "realizada" && deleted_at = ""${orgFilter}`,
            sort: 'date',
            expand: 'linked_lawsuit.client',
          }),
          pb.collection('notifications').getList(1, 50, {
            filter: `${isArchivedFilter} && user_id = "${pb.authStore.record?.id}"`,
            sort: '-created',
            expand: 'client',
          }),
          pb.collection('legal_cases').getFullList({
            fields:
              'id,case_number,title,parties,client,expand.client.name,expand.client.fullName,expand.client.phone,expand.client.email',
            expand: 'client',
          }),
        ])

      const casesMap = new Map()
      casesRes.forEach((c) => {
        if (c.case_number) casesMap.set(c.case_number.replace(/\D/g, ''), c)
        casesMap.set(c.id, c)
      })

      const mappedPje: UnifiedItem[] = pjeRes.items.map((i) => {
        const numClean = i.numeroProcesso ? i.numeroProcesso.replace(/\D/g, '') : ''
        const isNew = numClean && !casesMap.has(numClean)
        const linkedCaseId = i.linked_case || casesMap.get(numClean)?.id
        const caseObj = linkedCaseId ? casesMap.get(linkedCaseId) : null
        const clientObj = caseObj?.expand?.client
        return {
          id: i.id,
          collection: 'pje_communications',
          type: isNew ? 'Processo Novo' : 'PJe',
          title: `Processo: ${i.numeroProcesso || 'N/A'} - ${i.siglaTribunal || ''}`,
          description: `${i.tipoComunicacao ? `[${i.tipoComunicacao}] ` : ''}${i.texto || ''}`,
          date: i.dataDisponibilizacao || i.created,
          isRead: !!i.is_read,
          isArchived: !!i.is_archived,
          isSaved: !!i.is_saved,
          treatmentStatus: i.treatment_status,
          caseNumber: caseObj?.case_number || i.numeroProcesso,
          caseTitle: caseObj?.title,
          parties: caseObj?.parties,
          caseId: linkedCaseId,
          clientId: caseObj?.client,
          clientName: clientObj?.fullName || clientObj?.name,
          clientPhone: clientObj?.phone,
          raw: i,
        }
      })

      const mappedDouPub: UnifiedItem[] = douPub.items.map((i) => {
        let numList: string[] = []
        if (typeof i.numero_processo === 'string') numList.push(i.numero_processo)
        else if (Array.isArray(i.numero_processo)) numList.push(...i.numero_processo)
        let primaryNum = numList[0] || ''
        let numClean = primaryNum.replace(/\D/g, '')
        const isNew = numClean && !casesMap.has(numClean)
        const linkedCase = casesMap.get(numClean)
        const clientObj = linkedCase?.expand?.client
        return {
          id: i.id,
          collection: 'gazette_publications',
          type: isNew ? 'Processo Novo' : 'DOU',
          title: `Publicação DOU: ${i.orgao || 'Órgão Desconhecido'}`,
          description: i.texto_normalizado || '',
          date: i.data_publicacao || i.created,
          isRead: !!i.is_read,
          isArchived: !!i.is_archived,
          treatmentStatus: i.treatment_status,
          caseNumber: linkedCase?.case_number || primaryNum,
          caseTitle: linkedCase?.title,
          parties: linkedCase?.parties,
          caseId: linkedCase?.id,
          clientId: linkedCase?.client,
          clientName: clientObj?.fullName || clientObj?.name,
          clientPhone: clientObj?.phone,
          raw: i,
        }
      })

      const mappedDouOcc: UnifiedItem[] = douOcc.items.map((i) => ({
        id: i.id,
        collection: 'ocorrencias_dou',
        type: 'Ocorrência',
        title: `Ocorrência DOU - Termo encontrado`,
        description: i.trecho_encontrado || '',
        date: i.data_deteccao || i.created,
        isRead: i.status_alerta === 'visualizado',
        isArchived: !!i.is_archived,
        raw: i,
      }))

      const mappedMovements: UnifiedItem[] = moveRes.items.map((i) => {
        const cObj = casesMap.get(i.case) || i.expand?.case
        const clientObj = cObj?.expand?.client
        return {
          id: i.id,
          collection: 'case_movements',
          type: 'Movimentação',
          title: `Movimentação: ${cObj?.case_number || 'Processo'}`,
          description: i.description || '',
          date: i.event_date || i.created,
          isRead: !!i.notified_client,
          isArchived: false,
          caseId: i.case,
          caseNumber: cObj?.case_number,
          caseTitle: cObj?.title,
          parties: cObj?.parties,
          clientId: cObj?.client,
          clientName: clientObj?.fullName || clientObj?.name,
          clientPhone: clientObj?.phone,
          raw: i,
        }
      })

      const mappedTasks: UnifiedItem[] = tasksRes.items.map((i) => {
        const cObj = casesMap.get(i.linked_lawsuit) || i.expand?.linked_lawsuit
        const clientObj = cObj?.expand?.client
        return {
          id: i.id,
          collection: 'tasks',
          type: 'Tarefa',
          title: `Tarefa Pendente: ${i.title}`,
          description: i.description || '',
          date: i.due_date || i.created,
          isRead: false,
          isArchived: false,
          caseId: i.linked_lawsuit,
          caseNumber: cObj?.case_number,
          caseTitle: cObj?.title,
          parties: cObj?.parties,
          clientId: cObj?.client,
          clientName: clientObj?.fullName || clientObj?.name,
          clientPhone: clientObj?.phone,
          raw: i,
        }
      })

      const mappedAgenda: UnifiedItem[] = agendaRes.items.map((i) => {
        const cObj = casesMap.get(i.linked_lawsuit) || i.expand?.linked_lawsuit
        const clientObj = cObj?.expand?.client
        return {
          id: i.id,
          collection: 'agenda_events',
          type: 'Agenda',
          title: `Agenda: ${i.title}`,
          description: i.description || '',
          date: i.start_date || i.created,
          isRead: false,
          isArchived: false,
          caseId: i.linked_lawsuit,
          caseNumber: cObj?.case_number,
          caseTitle: cObj?.title,
          parties: cObj?.parties,
          clientId: cObj?.client,
          clientName: clientObj?.fullName || clientObj?.name,
          clientPhone: clientObj?.phone,
          raw: i,
        }
      })

      const mappedFinances: UnifiedItem[] = finRes.items.map((i) => {
        const cObj = casesMap.get(i.linked_lawsuit) || i.expand?.linked_lawsuit
        const clientObj = cObj?.expand?.client
        return {
          id: i.id,
          collection: 'finances',
          type: 'Financeiro',
          title: `Financeiro: ${i.description}`,
          description: `Valor: R$ ${i.amount} - Tipo: ${i.type === 'inflow' ? 'Receita' : 'Despesa'} - Status: ${i.status}`,
          date: i.date || i.created,
          isRead: !!i.is_read,
          isArchived: !!i.is_archived,
          caseId: i.linked_lawsuit,
          caseNumber: cObj?.case_number,
          caseTitle: cObj?.title,
          parties: cObj?.parties,
          clientId: cObj?.client,
          clientName: clientObj?.fullName || clientObj?.name,
          clientPhone: clientObj?.phone,
          raw: i,
        }
      })

      const mappedNotifs: UnifiedItem[] = notifRes.items.map((i) => ({
        id: i.id,
        collection: 'notifications',
        type: i.message.toLowerCase().includes('aniversário')
          ? 'Aniversário'
          : ('Notificação' as any),
        title: i.message.toLowerCase().includes('aniversário')
          ? 'Alerta de Aniversário'
          : 'Notificação do Sistema',
        description: i.message,
        date: i.created,
        isRead: !!i.is_read,
        isArchived: !!i.is_archived,
        isSaved: !!i.is_saved,
        clientId: i.client,
        clientName: i.expand?.client?.fullName || i.expand?.client?.name,
        clientPhone: i.expand?.client?.phone,
        raw: i,
      }))

      const all = [
        ...mappedPje,
        ...mappedDouPub,
        ...mappedDouOcc,
        ...mappedMovements,
        ...mappedTasks,
        ...mappedAgenda,
        ...mappedFinances,
        ...mappedNotifs,
      ]
      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setItems(all)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab]) // Trigger fetch on tab change to get fresh archived/unarchived sets

  const processBatch = async (
    action: 'read' | 'unread' | 'archive' | 'unarchive' | 'save' | 'unsave' | 'delete',
    idsToProcess?: Set<string>,
  ) => {
    const targetIds = idsToProcess || selectedIds
    const itemsToProcess = items.filter((i) => targetIds.has(`${i.collection}-${i.id}`))
    if (itemsToProcess.length === 0) return

    if (action === 'delete') {
      if (!confirm('Tem certeza que deseja excluir este item definitivamente?')) return
    }

    setIsProcessingBatch(true)
    setBatchProgress(0)
    setBatchTotal(itemsToProcess.length)

    let successCount = 0
    let hasError = false

    setItems((prev) => {
      if (action === 'delete') return prev.filter((i) => !targetIds.has(`${i.collection}-${i.id}`))
      return prev.map((item) => {
        if (targetIds.has(`${item.collection}-${item.id}`)) {
          return {
            ...item,
            isRead: action === 'read' ? true : action === 'unread' ? false : item.isRead,
            isArchived:
              action === 'archive' ? true : action === 'unarchive' ? false : item.isArchived,
            isSaved: action === 'save' ? true : action === 'unsave' ? false : item.isSaved,
          }
        }
        return item
      })
    })

    const chunkSize = 10
    for (let i = 0; i < itemsToProcess.length; i += chunkSize) {
      const chunk = itemsToProcess.slice(i, i + chunkSize)
      try {
        await Promise.all(
          chunk.map(async (item) => {
            if (action === 'read') {
              if (item.collection === 'pje_communications')
                await pb.collection('pje_communications').update(item.id, { is_read: true })
              else if (item.collection === 'gazette_publications')
                await pb.collection('gazette_publications').update(item.id, { is_read: true })
              else if (item.collection === 'ocorrencias_dou')
                await pb
                  .collection('ocorrencias_dou')
                  .update(item.id, { status_alerta: 'visualizado' })
              else if (item.collection === 'case_movements')
                await pb.collection('case_movements').update(item.id, { notified_client: true })
              else if (item.collection === 'notifications')
                await pb.collection('notifications').update(item.id, { is_read: true })
              else if (item.collection === 'finances')
                await pb.collection('finances').update(item.id, { is_read: true })
            } else if (action === 'unread') {
              if (item.collection === 'pje_communications')
                await pb.collection('pje_communications').update(item.id, { is_read: false })
              else if (item.collection === 'gazette_publications')
                await pb.collection('gazette_publications').update(item.id, { is_read: false })
              else if (item.collection === 'ocorrencias_dou')
                await pb
                  .collection('ocorrencias_dou')
                  .update(item.id, { status_alerta: 'pendente' })
              else if (item.collection === 'case_movements')
                await pb.collection('case_movements').update(item.id, { notified_client: false })
              else if (item.collection === 'notifications')
                await pb.collection('notifications').update(item.id, { is_read: false })
              else if (item.collection === 'finances')
                await pb.collection('finances').update(item.id, { is_read: false })
            } else if (action === 'archive') {
              if (
                [
                  'gazette_publications',
                  'ocorrencias_dou',
                  'pje_communications',
                  'finances',
                  'notifications',
                ].includes(item.collection)
              ) {
                await pb.collection(item.collection).update(item.id, { is_archived: true })
              }
            } else if (action === 'unarchive') {
              if (
                [
                  'gazette_publications',
                  'ocorrencias_dou',
                  'pje_communications',
                  'finances',
                  'notifications',
                ].includes(item.collection)
              ) {
                await pb.collection(item.collection).update(item.id, { is_archived: false })
              }
            } else if (action === 'save') {
              if (item.collection === 'pje_communications' || item.collection === 'notifications')
                await pb.collection(item.collection).update(item.id, { is_saved: true })
            } else if (action === 'unsave') {
              if (item.collection === 'pje_communications' || item.collection === 'notifications')
                await pb.collection(item.collection).update(item.id, { is_saved: false })
            } else if (action === 'delete') {
              await pb.collection(item.collection).delete(item.id)
            }
          }),
        )
        successCount += chunk.length
        setBatchProgress(successCount)
      } catch (err) {
        console.error(err)
        hasError = true
        toast({
          title: 'Erro ao processar lote',
          description: `Operação interrompida após ${successCount} itens.`,
          variant: 'destructive',
        })
        break
      }
    }

    if (!hasError && targetIds.size > 1) {
      toast({ title: `Sucesso`, description: `${successCount} itens atualizados com sucesso.` })
    } else if (!hasError && targetIds.size === 1) {
      const msgs: Record<string, string> = {
        read: 'Marcado como lido',
        unread: 'Marcado como Não Lido',
        archive: 'Movido para Arquivados',
        unarchive: 'Item desarquivado',
        save: 'Item salvo',
        unsave: 'Removido dos salvos',
        delete: 'Item excluído definitivamente',
      }
      toast({ title: msgs[action] || 'Atualizado' })
    }

    if (!idsToProcess) setSelectedIds(new Set())

    setTimeout(async () => {
      setIsProcessingBatch(false)
      await loadData()
    }, 500)
  }

  const recordTreatment = async (item: UnifiedItem, type: string) => {
    try {
      if (item.collection === 'pje_communications' || item.collection === 'gazette_publications') {
        const isArchived = type === 'discarded' || type === 'concluded' ? true : item.isArchived
        await pb.collection(item.collection).update(item.id, {
          treatment_status: type,
          is_archived: isArchived,
          treatment_type: type,
          is_read: true,
        })
      } else if (
        item.collection === 'finances' ||
        item.collection === 'notifications' ||
        item.collection === 'ocorrencias_dou'
      ) {
        const isArchived = type === 'discarded' || type === 'concluded' ? true : item.isArchived
        await pb
          .collection(item.collection)
          .update(item.id, { is_archived: isArchived, is_read: true })
      }

      await pb.collection('system_logs').create({
        level: 'info',
        module: 'Audit',
        message: `Alerta tratado: ${type}`,
        details: { item_id: item.id, collection: item.collection, type },
        user: pb.authStore.record?.id || null,
        organization: pb.authStore.record?.active_organization || null,
      })

      await loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleMarkAsRead = (item: UnifiedItem) =>
    processBatch('read', new Set([`${item.collection}-${item.id}`]))
  const handleMarkAllAsRead = () => {
    const unreadIds = new Set(
      filteredItems.filter((i) => !i.isRead).map((i) => `${i.collection}-${i.id}`),
    )
    if (unreadIds.size > 0) processBatch('read', unreadIds)
  }

  const handleCreateTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('tasks').create({
        title: fd.get('title'),
        description: fd.get('description'),
        priority: fd.get('priority'),
        due_date: fd.get('due_date')
          ? new Date(`${fd.get('due_date')}T12:00:00Z`).toISOString()
          : null,
        status: 'todo',
        linked_lawsuit: selectedItem?.caseId || null,
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Tarefa criada com sucesso!' })
      setTaskDialogOpen(false)
      if (selectedItem) await recordTreatment(selectedItem, 'task_created')
    } catch (err) {
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' })
    }
  }

  const handleCreateEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('agenda_events').create({
        title: fd.get('title'),
        description: fd.get('description'),
        type: fd.get('type'),
        start_date: fd.get('start_date')
          ? new Date(`${fd.get('start_date')}T12:00:00Z`).toISOString()
          : null,
        linked_lawsuit: selectedItem?.caseId || null,
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Evento criado com sucesso!' })
      setEventDialogOpen(false)
      if (selectedItem) await recordTreatment(selectedItem, 'event_created')
    } catch (err) {
      toast({ title: 'Erro ao criar evento', variant: 'destructive' })
    }
  }

  const handleCreateManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('case_movements').create({
        description: fd.get('description'),
        event_date: fd.get('event_date')
          ? new Date(`${fd.get('event_date')}T12:00:00Z`).toISOString()
          : new Date().toISOString(),
        source: 'Manual',
        case: selectedItem?.caseId || null,
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Andamento registrado com sucesso!' })
      setManualDialogOpen(false)
      if (selectedItem) await recordTreatment(selectedItem, 'manual_recorded')
    } catch (err) {
      toast({ title: 'Erro ao registrar andamento', variant: 'destructive' })
    }
  }

  const handleShareWhatsApp = (item: UnifiedItem) => {
    setSelectedItem(item)
    let tpl = 'custom'
    if (item.type === 'Aniversário') tpl = 'aniversario'
    else if (item.type === 'Financeiro') tpl = 'financeiro'
    else if (['Movimentação', 'PJe', 'DOU', 'Processo Novo'].includes(item.type)) tpl = 'processual'

    setShareTemplate(tpl)
    setShareClientId(item.clientId || '')
    setSharePhone(item.clientPhone || '')

    // Defer message generation to properly grab dynamically available states
    setTimeout(() => {
      const msg = generateShareMessage(item.clientId || '', tpl, item)
      setShareMessage(msg)
      setShareDialogOpen(true)
    }, 50)
  }

  const handleCompleteTask = async (item: UnifiedItem) => {
    try {
      await pb.collection('tasks').update(item.id, { status: 'completed' })
      toast({ title: 'Tarefa concluída com sucesso!' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao concluir tarefa', variant: 'destructive' })
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [activeTab, itemsPerPage])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === 'inbox') return !item.isRead && !item.isArchived
      if (activeTab === 'comunicacoes')
        return (
          !item.isArchived &&
          (item.collection === 'pje_communications' ||
            item.collection === 'gazette_publications' ||
            item.collection === 'ocorrencias_dou')
        )
      if (activeTab === 'movimentacoes')
        return !item.isArchived && item.collection === 'case_movements'
      if (activeTab === 'tarefas')
        return (
          !item.isArchived && (item.collection === 'tasks' || item.collection === 'agenda_events')
        )
      if (activeTab === 'financeiro') return !item.isArchived && item.collection === 'finances'
      if (activeTab === 'salvos')
        return (
          item.isSaved &&
          (item.collection === 'pje_communications' || item.collection === 'notifications')
        )
      if (activeTab === 'arquivados') return item.isArchived
      return true
    })
  }, [items, activeTab])

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(start, start + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  const renderItemCard = (item: UnifiedItem) => {
    const itemKey = `${item.collection}-${item.id}`
    const isSelected = selectedIds.has(itemKey)

    return (
      <Card
        key={itemKey}
        className={cn(
          'overflow-hidden border-slate-200 transition-all hover:shadow-md relative',
          !item.isRead ? 'bg-blue-50/30 border-blue-100' : 'bg-white',
          isSelected && 'ring-2 ring-primary border-primary bg-primary/5',
        )}
      >
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold tracking-wider uppercase text-slate-500">
              {item.type === 'DOU' && <Landmark className="w-4 h-4 text-emerald-500" />}
              {item.type === 'PJe' && <Activity className="w-4 h-4 text-blue-500" />}
              {item.type === 'Processo Novo' && <FileText className="w-4 h-4 text-primary" />}
              {item.type === 'Ocorrência' && <Activity className="w-4 h-4 text-amber-500" />}
              {item.type === 'Movimentação' && <FileText className="w-4 h-4 text-indigo-500" />}
              {item.type === 'Tarefa' && <CheckSquare className="w-4 h-4 text-amber-500" />}
              {item.type === 'Agenda' && <CalendarIcon className="w-4 h-4 text-amber-500" />}
              {item.type === 'Financeiro' && <Wallet className="w-4 h-4 text-emerald-500" />}
              {item.type === 'Aniversário' && <CalendarIcon className="w-4 h-4 text-pink-500" />}
              {item.type === 'Notificação' && <Activity className="w-4 h-4 text-slate-500" />}
              {item.type}
              {item.treatmentStatus && item.treatmentStatus !== 'pending' && (
                <Badge
                  variant="outline"
                  className="ml-2 bg-slate-50 text-slate-600 border-slate-200"
                >
                  Tratado: {item.treatmentStatus.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                {item.date ? format(new Date(item.date), 'dd/MM/yyyy HH:mm') : '-'}
              </span>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(c) => {
                  const newSet = new Set(selectedIds)
                  if (c) newSet.add(itemKey)
                  else newSet.delete(itemKey)
                  setSelectedIds(newSet)
                }}
              />
            </div>
          </div>

          <div>
            <h3
              className={cn(
                'text-lg font-bold mb-2 flex items-center flex-wrap gap-2',
                item.isRead ? 'text-slate-800' : 'text-slate-900',
              )}
            >
              {item.caseNumber && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-primary bg-primary/10 border-primary/20 transition-colors',
                    item.caseId && 'hover:bg-primary/20 cursor-pointer',
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.caseId) navigate(`/intranet/processos/${item.caseId}`)
                  }}
                >
                  {item.caseNumber}
                </Badge>
              )}
              <span
                className={cn(
                  'leading-tight',
                  item.caseId &&
                    'cursor-pointer hover:text-primary transition-colors hover:underline',
                )}
                onClick={() => {
                  if (item.caseId) navigate(`/intranet/processos/${item.caseId}`)
                }}
              >
                {item.title}
              </span>
            </h3>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-32 overflow-hidden relative mt-2">
              <p
                className="text-sm text-slate-600 line-clamp-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.description }}
              ></p>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 pt-4 border-t border-slate-100">
            {[
              'pje_communications',
              'gazette_publications',
              'finances',
              'notifications',
              'ocorrencias_dou',
            ].includes(item.collection) &&
              !item.isArchived && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-slate-800 text-white hover:bg-slate-700"
                    >
                      Tratar Alerta <MoreVertical className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedItem(item)
                        setTaskDialogOpen(true)
                      }}
                    >
                      <CheckSquare className="w-4 h-4 mr-2 text-slate-500" /> Incluir Tarefa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedItem(item)
                        setEventDialogOpen(true)
                      }}
                    >
                      <CalendarIcon className="w-4 h-4 mr-2 text-slate-500" /> Incluir Compromisso
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (!item.caseId)
                          return toast({
                            title: 'Aviso',
                            description: 'Vincule o processo primeiro.',
                            variant: 'destructive',
                          })
                        setSelectedItem(item)
                        setManualDialogOpen(true)
                      }}
                    >
                      <FileEdit className="w-4 h-4 mr-2 text-slate-500" /> Registro Manual
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => recordTreatment(item, 'concluded')}>
                      <Check className="w-4 h-4 mr-2 text-emerald-500" /> Concluir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => recordTreatment(item, 'discarded')}>
                      <XCircle className="w-4 h-4 mr-2 text-red-500" /> Descartar (Arquivar)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            {['Tarefa', 'Agenda', 'Financeiro', 'Movimentação'].includes(item.type) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (item.type === 'Tarefa' || item.type === 'Agenda') navigate('/intranet/agenda')
                  if (item.type === 'Financeiro') navigate('/intranet/finance')
                  if (item.type === 'Movimentação')
                    navigate(
                      item.caseId ? `/intranet/processos/${item.caseId}` : '/intranet/processos',
                    )
                }}
              >
                Acessar
              </Button>
            )}

            {['pje_communications', 'notifications'].includes(item.collection) &&
              !item.isArchived && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    processBatch(
                      item.isSaved ? 'unsave' : 'save',
                      new Set([`${item.collection}-${item.id}`]),
                    )
                  }
                >
                  <Bookmark
                    className={cn('w-4 h-4 mr-2', item.isSaved && 'fill-current text-primary')}
                  />
                  {item.isSaved ? 'Salvo' : 'Salvar'}
                </Button>
              )}

            {item.isArchived && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    processBatch('unarchive', new Set([`${item.collection}-${item.id}`]))
                  }
                >
                  <Archive className="w-4 h-4 mr-2" /> Desarquivar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => processBatch('delete', new Set([`${item.collection}-${item.id}`]))}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </Button>
              </>
            )}

            {['pje_communications', 'gazette_publications'].includes(item.collection) && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  if (!item.isRead) await handleMarkAsRead(item)
                  if (item.collection === 'pje_communications')
                    navigate(`/intranet/pje-comunica?id=${item.id}`)
                  else navigate(`/intranet/comunicacoes/${item.id}`)
                }}
              >
                <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
              </Button>
            )}

            {item.type === 'Tarefa' && !item.isArchived && (
              <Button
                size="sm"
                variant="default"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => handleCompleteTask(item)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir
              </Button>
            )}

            {item.type === 'Aniversário' && (
              <Button
                size="sm"
                variant="default"
                className="bg-[#25D366] text-white hover:bg-[#1ebd5a]"
                onClick={() => handleShareWhatsApp(item)}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Enviar Parabéns
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => handleShareWhatsApp(item)}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => {
                setSelectedItem(item)
                setEmailModalOpen(true)
              }}
            >
              <Mail className="w-4 h-4 mr-2" /> Email
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Central de Alertas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inbox integrado para gerenciar comunicações, tarefas, agenda e finanças pendentes com
          ações rápidas de tratamento.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-64 shrink-0 bg-slate-50/50 p-2 rounded-xl border border-slate-200">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            orientation="vertical"
            className="w-full"
          >
            <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-1">
              <TabsTrigger
                value="inbox"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <BookOpen className="w-4 h-4 mr-3 text-slate-400 data-[state=active]:text-primary" />{' '}
                Caixa de Entrada
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                  {items.filter((i) => !i.isRead && !i.isArchived).length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="comunicacoes"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Activity className="w-4 h-4 mr-3 text-blue-500" /> Comunicações
              </TabsTrigger>
              <TabsTrigger
                value="movimentacoes"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <FileText className="w-4 h-4 mr-3 text-indigo-500" /> Movimentações
              </TabsTrigger>
              <TabsTrigger
                value="tarefas"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <ListTodo className="w-4 h-4 mr-3 text-amber-500" /> Tarefas & Agenda
              </TabsTrigger>
              <TabsTrigger
                value="financeiro"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Wallet className="w-4 h-4 mr-3 text-emerald-500" /> Financeiro
              </TabsTrigger>
              <TabsTrigger
                value="salvos"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Bookmark className="w-4 h-4 mr-3 text-primary" /> Salvos
              </TabsTrigger>
              <TabsTrigger
                value="arquivados"
                className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
              >
                <Archive className="w-4 h-4 mr-3 text-slate-500" /> Arquivados
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 w-full min-w-0">
          <div className="bg-white rounded-xl p-1 border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-3 gap-4 sticky top-0 z-20">
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-2 w-full">
                <Checkbox
                  id="select-all"
                  checked={
                    paginatedItems.length > 0 &&
                    paginatedItems.every((i) => selectedIds.has(`${i.collection}-${i.id}`))
                  }
                  onCheckedChange={(c) => {
                    const newSet = new Set(selectedIds)
                    if (c) paginatedItems.forEach((i) => newSet.add(`${i.collection}-${i.id}`))
                    else paginatedItems.forEach((i) => newSet.delete(`${i.collection}-${i.id}`))
                    setSelectedIds(newSet)
                  }}
                />
                <span className="text-sm font-medium text-slate-700 ml-2">
                  {selectedIds.size} selecionado(s)
                </span>
                <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processBatch('read')}
                    disabled={isProcessingBatch}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Lidos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processBatch('unread')}
                    disabled={isProcessingBatch}
                  >
                    Não Lidos
                  </Button>
                  {activeTab === 'arquivados' ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processBatch('unarchive')}
                        disabled={isProcessingBatch}
                      >
                        <Archive className="w-4 h-4 mr-2" /> Desarquivar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 ml-auto"
                        onClick={() => processBatch('delete')}
                        disabled={isProcessingBatch}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => processBatch('archive')}
                      disabled={isProcessingBatch}
                    >
                      <Archive className="w-4 h-4 mr-2" /> Arquivar
                    </Button>
                  )}
                  {activeTab === 'salvos' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 ml-auto"
                      onClick={() => processBatch('delete')}
                      disabled={isProcessingBatch}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                    disabled={isProcessingBatch}
                    className="ml-auto sm:ml-0"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-800 capitalize">
                  {activeTab === 'inbox'
                    ? 'Caixa de Entrada (Não Lidos)'
                    : activeTab.replace('-', ' ')}
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 font-medium">
                    {filteredItems.length} itens
                  </span>
                  {filteredItems.length > 0 && (
                    <div className="flex items-center gap-2 px-2">
                      <Checkbox
                        id="select-all"
                        checked={
                          paginatedItems.length > 0 &&
                          paginatedItems.every((i) => selectedIds.has(`${i.collection}-${i.id}`))
                        }
                        onCheckedChange={(c) => {
                          const newSet = new Set(selectedIds)
                          if (c)
                            paginatedItems.forEach((i) => newSet.add(`${i.collection}-${i.id}`))
                          else
                            paginatedItems.forEach((i) => newSet.delete(`${i.collection}-${i.id}`))
                          setSelectedIds(newSet)
                        }}
                      />
                      <Label
                        htmlFor="select-all"
                        className="text-sm font-medium cursor-pointer text-slate-600"
                      >
                        Selecionar Página
                      </Label>
                    </div>
                  )}
                  {activeTab === 'inbox' && filteredItems.length > 0 && (
                    <Button size="sm" variant="outline" onClick={handleMarkAllAsRead}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar todos lidos
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {loading && items.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Carregando atualizações...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600">Nenhum item nesta pasta.</p>
              <p className="text-sm text-slate-400 mt-1">
                Você está em dia com as atualizações desta categoria.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {paginatedItems.map(renderItemCard)}

              {filteredItems.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 border rounded-xl mt-4 gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Mostrar</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(v) => setItemsPerPage(Number(v))}
                    >
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>por página</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-slate-600 font-medium px-2">
                      Página {currentPage} de {Math.ceil(filteredItems.length / itemsPerPage) || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(Math.ceil(filteredItems.length / itemsPerPage), p + 1),
                        )
                      }
                      disabled={
                        currentPage === Math.ceil(filteredItems.length / itemsPerPage) ||
                        filteredItems.length === 0
                      }
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incluir Tarefa</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateTaskSubmit}>
            <div>
              <Label>Título da Tarefa</Label>
              <Input name="title" defaultValue={`Acompanhar: ${selectedItem?.title}`} required />
            </div>
            <div>
              <Label>Descrição / Contexto</Label>
              <textarea
                name="description"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[80px]"
                defaultValue={selectedItem?.description?.replace(/<[^>]*>?/gm, '').trim()}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Vencimento</Label>
                <Input name="due_date" type="date" required />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit">Criar Tarefa</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incluir Evento na Agenda</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateEventSubmit}>
            <div>
              <Label>Título do Evento</Label>
              <Input
                name="title"
                defaultValue={`Prazo/Audiência: ${selectedItem?.title}`}
                required
              />
            </div>
            <div>
              <Label>Descrição / Contexto</Label>
              <textarea
                name="description"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[80px]"
                defaultValue={selectedItem?.description?.replace(/<[^>]*>?/gm, '').trim()}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select name="type" defaultValue="Hearing">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hearing">Audiência</SelectItem>
                    <SelectItem value="Meeting">Reunião</SelectItem>
                    <SelectItem value="Call">Ligação</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit">Criar Evento</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registro Manual de Andamento</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateManualSubmit}>
            <div>
              <Label>Descrição</Label>
              <textarea
                name="description"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[80px]"
                defaultValue={selectedItem?.description?.replace(/<[^>]*>?/gm, '').trim()}
                required
              />
            </div>
            <div>
              <Label>Data do Evento</Label>
              <Input
                name="event_date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit">Salvar Registro</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartilhar no WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Template de Mensagem</Label>
              <Select value={shareTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  <SelectItem value="processual">Atualização Processual</SelectItem>
                  <SelectItem value="financeiro">Cobrança / Financeiro</SelectItem>
                  <SelectItem value="aniversario">Aniversário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={shareClientId} onValueChange={handleClientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shareClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Telefone (WhatsApp)</Label>
                <Input
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[150px]"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-[#25D366] text-white hover:bg-[#1ebd5a]"
                onClick={() => {
                  let num = sharePhone.replace(/\D/g, '')
                  if (num && !num.startsWith('55')) num = '55' + num
                  const url = num
                    ? `https://web.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(shareMessage)}`
                    : `https://web.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`
                  window.open(url, '_blank')
                  setShareDialogOpen(false)
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EmailSenderModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        client={selectedItem?.clientId ? { id: selectedItem.clientId } : null}
        context={{
          case_number: selectedItem?.caseNumber || '',
          client_name: selectedItem?.clientName || '',
          data_alerta: selectedItem?.date
            ? format(new Date(selectedItem.date), 'dd/MM/yyyy')
            : format(new Date(), 'dd/MM/yyyy'),
          alert_date: selectedItem?.date
            ? format(new Date(selectedItem.date), 'dd/MM/yyyy')
            : format(new Date(), 'dd/MM/yyyy'),
          movement_description: selectedItem?.description?.replace(/<[^>]*>?/gm, '') || '',
          org_name: pb.authStore.record?.expand?.active_organization?.name || 'Nosso Escritório',
        }}
      />

      <Dialog open={isProcessingBatch} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Processando Lote...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <Progress
              value={batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0}
              className="w-full h-3"
            />
            <p className="text-sm text-center text-slate-500 font-medium">
              Atualizando {batchProgress} de {batchTotal} itens. Por favor, aguarde.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

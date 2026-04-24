import { useState, useEffect, useMemo, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import {
  Activity,
  BookOpen,
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
  Wallet,
  ListTodo,
  MessageCircle,
  Mail,
  Inbox,
  ArrowLeft,
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

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

const NavButton = ({ id, icon: Icon, label, count, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
      active
        ? 'bg-slate-200/70 text-slate-900'
        : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900',
    )}
  >
    <div className="flex items-center gap-3">
      <Icon className={cn('w-4 h-4', active ? 'text-primary' : 'text-slate-400')} />
      {label}
    </div>
    {count !== undefined && count > 0 && (
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-bold',
          active ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-700',
        )}
      >
        {count}
      </span>
    )}
  </button>
)

export default function CentralAtualizacoes() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [items, setItems] = useState<UnifiedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('inbox')
  const [currentPage, setCurrentPage] = useState(1)

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const stored = localStorage.getItem('alert_center_per_page')
    return stored ? Number(stored) : 50
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
  }, [activeTab])

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

    if (
      action === 'archive' &&
      selectedItem &&
      targetIds.has(`${selectedItem.collection}-${selectedItem.id}`)
    ) {
      setSelectedItem(null)
    }

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
              } else if (item.collection === 'case_movements') {
                await pb.collection('case_movements').update(item.id, { notified_client: true })
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
          title: 'Erro ao processar',
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

      if (type === 'concluded' || type === 'discarded') {
        setSelectedItem(null)
      }
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

    setTimeout(() => {
      const msg = generateShareMessage(item.clientId || '', tpl, item)
      setShareMessage(msg)
      setShareDialogOpen(true)
    }, 50)
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

  return (
    <TooltipProvider>
      <div className="max-w-screen-2xl mx-auto flex flex-col h-[calc(100vh-80px)] overflow-hidden p-4 md:p-6 animate-fade-in-up">
        <div className="flex flex-col gap-1 mb-4 shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Inbox className="w-6 h-6" /> Caixa Postal (Alertas)
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie comunicações, andamentos e notificações do seu escritório de forma
            centralizada.
          </p>
        </div>

        <div className="flex flex-1 overflow-hidden border rounded-xl bg-white shadow-sm">
          {/* Sidebar */}
          <div className="hidden md:flex w-64 flex-col border-r bg-slate-50/40">
            <div className="p-4 border-b">
              <span className="font-semibold text-sm text-slate-600 uppercase tracking-wider">
                Pastas
              </span>
            </div>
            <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
              <NavButton
                id="inbox"
                icon={BookOpen}
                label="Caixa de Entrada"
                count={items.filter((i) => !i.isRead && !i.isArchived).length}
                active={activeTab === 'inbox'}
                onClick={() => {
                  setActiveTab('inbox')
                  setSelectedItem(null)
                }}
              />
              <NavButton
                id="comunicacoes"
                icon={Activity}
                label="Comunicações"
                active={activeTab === 'comunicacoes'}
                onClick={() => {
                  setActiveTab('comunicacoes')
                  setSelectedItem(null)
                }}
              />
              <NavButton
                id="movimentacoes"
                icon={FileText}
                label="Movimentações"
                active={activeTab === 'movimentacoes'}
                onClick={() => {
                  setActiveTab('movimentacoes')
                  setSelectedItem(null)
                }}
              />
              <NavButton
                id="tarefas"
                icon={ListTodo}
                label="Tarefas & Agenda"
                active={activeTab === 'tarefas'}
                onClick={() => {
                  setActiveTab('tarefas')
                  setSelectedItem(null)
                }}
              />
              <NavButton
                id="financeiro"
                icon={Wallet}
                label="Financeiro"
                active={activeTab === 'financeiro'}
                onClick={() => {
                  setActiveTab('financeiro')
                  setSelectedItem(null)
                }}
              />
              <Separator className="my-2" />
              <NavButton
                id="salvos"
                icon={Bookmark}
                label="Salvos"
                active={activeTab === 'salvos'}
                onClick={() => {
                  setActiveTab('salvos')
                  setSelectedItem(null)
                }}
              />
              <NavButton
                id="arquivados"
                icon={Archive}
                label="Arquivados"
                active={activeTab === 'arquivados'}
                onClick={() => {
                  setActiveTab('arquivados')
                  setSelectedItem(null)
                }}
              />
            </nav>
          </div>

          {/* List View */}
          <div
            className={cn(
              'flex flex-col border-r bg-white',
              selectedItem ? 'hidden lg:flex w-[350px] xl:w-[400px]' : 'flex-1',
            )}
          >
            <div className="p-3 border-b flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                {selectedItem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSelectedItem(null)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                <span className="font-semibold text-slate-800 capitalize">
                  {activeTab.replace('-', ' ')}
                </span>
              </div>
              {activeTab === 'inbox' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleMarkAllAsRead}>
                      <CheckCircle2 className="w-4 h-4 text-slate-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Marcar todos como lidos</TooltipContent>
                </Tooltip>
              )}
            </div>

            {loading && items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Carregando mensagens...</div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {paginatedItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex flex-col cursor-pointer p-3 rounded-lg border transition-colors',
                        selectedItem?.id === item.id
                          ? 'bg-primary/5 border-primary/20'
                          : 'border-transparent hover:bg-slate-50',
                        !item.isRead && 'bg-blue-50/40',
                      )}
                      onClick={() => {
                        setSelectedItem(item)
                        if (!item.isRead) handleMarkAsRead(item)
                      }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={cn(
                            'text-xs font-bold tracking-wider uppercase',
                            !item.isRead ? 'text-blue-700' : 'text-slate-500',
                          )}
                        >
                          {item.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {format(new Date(item.date), 'dd/MM HH:mm')}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'text-sm line-clamp-1 mb-1',
                          !item.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700',
                        )}
                      >
                        {item.title}
                      </div>
                      <div
                        className="text-xs text-slate-500 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    </div>
                  ))}
                  {paginatedItems.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Nenhum item nesta pasta.
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {filteredItems.length > 0 && (
              <div className="p-2 border-t flex justify-between items-center bg-slate-50/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Ant
                </Button>
                <span className="text-xs text-slate-500 font-medium">
                  {currentPage} / {Math.ceil(filteredItems.length / itemsPerPage)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(Math.ceil(filteredItems.length / itemsPerPage), p + 1),
                    )
                  }
                  disabled={currentPage * itemsPerPage >= filteredItems.length}
                >
                  Próx
                </Button>
              </div>
            )}
          </div>

          {/* Detail View */}
          <div className={cn('flex-1 flex-col bg-white', selectedItem ? 'flex' : 'hidden lg:flex')}>
            {selectedItem ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center p-3 border-b gap-2 bg-slate-50/50">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden mr-1"
                    onClick={() => setSelectedItem(null)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          processBatch(
                            'archive',
                            new Set([`${selectedItem.collection}-${selectedItem.id}`]),
                          )
                        }
                      >
                        <Archive className="w-4 h-4 text-slate-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Arquivar</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() =>
                          processBatch(
                            'delete',
                            new Set([`${selectedItem.collection}-${selectedItem.id}`]),
                          )
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir Definitivamente</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-6 mx-1" />

                  {['pje_communications', 'notifications'].includes(selectedItem.collection) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            processBatch(
                              selectedItem.isSaved ? 'unsave' : 'save',
                              new Set([`${selectedItem.collection}-${selectedItem.id}`]),
                            )
                          }
                        >
                          <Bookmark
                            className={cn(
                              'w-4 h-4',
                              selectedItem.isSaved ? 'fill-current text-primary' : 'text-slate-600',
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {selectedItem.isSaved ? 'Remover dos Salvos' : 'Salvar'}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="hidden sm:flex border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleShareWhatsApp(selectedItem)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hidden sm:flex border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => setEmailModalOpen(true)}
                    >
                      <Mail className="w-4 h-4 mr-2" /> Email
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="secondary">
                          Tratar <MoreVertical className="w-4 h-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="sm:hidden"
                          onClick={() => handleShareWhatsApp(selectedItem)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2 text-emerald-600" /> Enviar
                          WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="sm:hidden"
                          onClick={() => setEmailModalOpen(true)}
                        >
                          <Mail className="w-4 h-4 mr-2 text-blue-600" /> Enviar Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="sm:hidden" />
                        <DropdownMenuItem onClick={() => setTaskDialogOpen(true)}>
                          <CheckSquare className="w-4 h-4 mr-2" /> Incluir Tarefa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEventDialogOpen(true)}>
                          <CalendarIcon className="w-4 h-4 mr-2" /> Incluir Compromisso
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setManualDialogOpen(true)}>
                          <FileEdit className="w-4 h-4 mr-2" /> Registro Manual
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            processBatch(
                              'unread',
                              new Set([`${selectedItem.collection}-${selectedItem.id}`]),
                            )
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" /> Marcar Não Lido
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => recordTreatment(selectedItem, 'concluded')}
                        >
                          <Check className="w-4 h-4 mr-2 text-emerald-600" /> Concluir e Arquivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-6 md:p-8">
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="bg-slate-100">
                          {selectedItem.type}
                        </Badge>
                        <span className="text-sm font-medium text-slate-500">
                          {format(new Date(selectedItem.date), "dd 'de' MMMM 'de' yyyy, HH:mm")}
                        </span>
                        {selectedItem.treatmentStatus &&
                          selectedItem.treatmentStatus !== 'pending' && (
                            <Badge
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 bg-emerald-50 ml-auto"
                            >
                              Tratado
                            </Badge>
                          )}
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
                        {selectedItem.title}
                      </h2>
                      {selectedItem.caseNumber && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded-md border border-slate-100 w-fit">
                          <span className="font-semibold">Processo vinculado:</span>
                          <Button
                            variant="link"
                            className="h-auto p-0 text-primary font-bold"
                            onClick={() =>
                              selectedItem.caseId &&
                              navigate(`/intranet/processos/${selectedItem.caseId}`)
                            }
                          >
                            {selectedItem.caseNumber}{' '}
                            {selectedItem.parties && `(${selectedItem.parties})`}
                          </Button>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="prose prose-sm max-w-none text-slate-800 bg-slate-50/50 p-6 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed shadow-sm">
                      <div dangerouslySetInnerHTML={{ __html: selectedItem.description }} />
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col flex-1 items-center justify-center text-slate-400 gap-4 p-8 text-center bg-slate-50/30">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                  <Mail className="h-10 w-10 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-600">Nenhum alerta selecionado</h3>
                  <p className="text-sm mt-1 max-w-xs mx-auto">
                    Selecione um item na lista ao lado para visualizar o conteúdo completo e as
                    opções de tratamento.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dialogs remain identical logic-wise */}
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
            type: selectedItem?.type || '',
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
    </TooltipProvider>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegalCase } from '@/services/legal_cases'
import { getPaginatedCaseMovements } from '@/services/case_movements'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  ArrowLeft,
  RefreshCw,
  User,
  Briefcase,
  Info,
  Calendar,
  CheckSquare,
  Scale,
  FileText,
  Tags,
  AlertTriangle,
  FileSignature,
  Paperclip,
  FileStack,
  Bell,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const MovementItem = ({
  mov,
  isNew,
  recordId,
  caseNumber,
}: {
  mov: any
  isNew: boolean
  recordId: string
  caseNumber?: string
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { toast } = useToast()

  const [viewingDoc, setViewingDoc] = useState<any>(null)
  const [docContent, setDocContent] = useState<{ tipo: string; conteudo: string } | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [docError, setDocError] = useState('')

  const isDecision =
    /decisão|despacho|sentença|julgamento|acórdão|liminar/i.test(mov.description || '') ||
    /decisão|despacho|sentença|julgamento|acórdão|liminar/i.test(
      mov.movement_details?.tipoComunicacao || '',
    ) ||
    String(mov.movement_details?.codigo) === '3' ||
    String(mov.movement_details?.codigo) === '193'

  const dotColorClass = isDecision ? 'bg-amber-500 ring-amber-100' : 'bg-primary ring-white'
  const headerBgClass = isDecision ? 'bg-amber-50/50' : 'bg-slate-50/80'
  const borderColorClass = isDecision ? 'border-amber-200' : 'border-slate-200'

  const fixEncoding = (str: string | undefined | null) => {
    if (!str) return ''
    return str
      .replace(/ï¿½RGï¿½O/g, 'ÓRGÃO')
      .replace(/ï¿½rgï¿½o/g, 'Órgão')
      .replace(/Aï¿½ï¿½O/g, 'AÇÃO')
      .replace(/aï¿½ï¿½o/g, 'ação')
      .replace(/DECISï¿½O/g, 'DECISÃO')
      .replace(/decisï¿½o/g, 'decisão')
      .replace(/CONCLUSï¿½O/g, 'CONCLUSÃO')
      .replace(/conclusï¿½o/g, 'conclusão')
      .replace(/Sï¿½O/g, 'SÃO')
      .replace(/sï¿½o/g, 'são')
      .replace(/Nï¿½O/g, 'NÃO')
      .replace(/nï¿½o/g, 'não')
      .replace(/Justiï¿½a/g, 'Justiça')
      .replace(/Mï¿½S/g, 'MÊS')
      .replace(/mï¿½s/g, 'mês')
      .replace(/TRï¿½S/g, 'TRÊS')
      .replace(/trï¿½s/g, 'três')
      .replace(/CONCILIAï¿½ï¿½O/g, 'CONCILIAÇÃO')
      .replace(/conciliaï¿½ï¿½o/g, 'conciliação')
      .replace(/INFORMAï¿½ï¿½O/g, 'INFORMAÇÃO')
      .replace(/informaï¿½ï¿½o/g, 'informação')
      .replace(/PETIï¿½ï¿½O/g, 'PETIÇÃO')
      .replace(/petiï¿½ï¿½o/g, 'petição')
      .replace(/RELAï¿½ï¿½O/g, 'RELAÇÃO')
      .replace(/relaï¿½ï¿½o/g, 'relação')
      .replace(/CITAï¿½ï¿½O/g, 'CITAÇÃO')
      .replace(/citaï¿½ï¿½o/g, 'citação')
      .replace(/INTIMAï¿½ï¿½O/g, 'INTIMAÇÃO')
      .replace(/intimaï¿½ï¿½o/g, 'intimação')
      .replace(/PUBLICAï¿½ï¿½O/g, 'PUBLICAÇÃO')
      .replace(/publicaï¿½ï¿½o/g, 'publicação')
      .replace(/EXPEDIï¿½ï¿½O/g, 'EXPEDIÇÃO')
      .replace(/expediï¿½ï¿½o/g, 'expedição')
      .replace(/CERTIDï¿½O/g, 'CERTIDÃO')
      .replace(/certidï¿½o/g, 'certidão')
      .replace(/EXECUï¿½ï¿½O/g, 'EXECUÇÃO')
      .replace(/execuï¿½ï¿½o/g, 'execução')
      .replace(/APELAï¿½ï¿½O/g, 'APELAÇÃO')
      .replace(/apelaï¿½ï¿½o/g, 'apelação')
      .replace(/ACï¿½RDï¿½O/g, 'ACÓRDÃO')
      .replace(/acï¿½rdï¿½o/g, 'acórdão')
      .replace(/VARA Cï¿½VEL/g, 'VARA CÍVEL')
      .replace(/Vara Cï¿½vel/g, 'Vara Cível')
      .replace(/TRIBUNAL DE JUSTIï¿½A/g, 'TRIBUNAL DE JUSTIÇA')
      .replace(/Cï¿½DIGO/g, 'CÓDIGO')
      .replace(/cï¿½digo/g, 'código')
      .replace(/SESSï¿½O/g, 'SESSÃO')
      .replace(/sessï¿½o/g, 'sessão')
      .replace(/AUDIï¿½NCIA/g, 'AUDIÊNCIA')
      .replace(/audiï¿½ncia/g, 'audiência')
      .replace(/Fï¿½RUM/g, 'FÓRUM')
      .replace(/fï¿½rum/g, 'fórum')
      .replace(/Cï¿½MARA/g, 'CÂMARA')
      .replace(/cï¿½mara/g, 'câmara')
      .replace(/COLï¿½GIO/g, 'COLÉGIO')
      .replace(/colï¿½gio/g, 'colégio')
      .replace(/ELETRï¿½NICO/g, 'ELETRÔNICO')
      .replace(/eletrï¿½nico/g, 'eletrônico')
      .replace(/Mï¿½RITO/g, 'MÉRITO')
      .replace(/mï¿½rito/g, 'mérito')
      .replace(/PROCEDï¿½NCIA/g, 'PROCEDÊNCIA')
      .replace(/procedï¿½ncia/g, 'procedência')
      .replace(/IMPROCEDï¿½NCIA/g, 'IMPROCEDÊNCIA')
      .replace(/improcedï¿½ncia/g, 'improcedência')
      .replace(/ï¿½/g, '')
  }

  const rawText =
    mov.movement_details?.texto ||
    mov.movement_details?.teor ||
    (typeof mov.details === 'string' && !mov.details.startsWith('[') ? mov.details : null)

  const textContent = fixEncoding(rawText)
  const hasDetailedContent =
    textContent.trim().length > 0 && textContent !== 'Movimento sem descrição'

  const isLongText = textContent.length > 400

  const hasAdditionalMeta =
    mov.movement_details?.codigo ||
    mov.movement_details?.magistradoNome ||
    mov.movement_details?.magistradoCpf ||
    mov.movement_details?.orgaoJulgador ||
    mov.movement_details?.tipoComunicacao ||
    mov.movement_details?.meio ||
    (mov.movement_details?.complementos && mov.movement_details.complementos.length > 0)

  const renderNestedObject = (obj: any): React.ReactNode => {
    if (typeof obj !== 'object' || obj === null) return String(obj)
    if (Array.isArray(obj)) {
      return (
        <ul className="list-disc pl-4 space-y-1">
          {obj.map((item, idx) => (
            <li key={idx}>{renderNestedObject(item)}</li>
          ))}
        </ul>
      )
    }
    return (
      <ul className="list-disc pl-4 space-y-1">
        {Object.entries(obj).map(([k, v]) => (
          <li key={k}>
            <span className="font-semibold capitalize">{k}:</span> {renderNestedObject(v)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="relative pl-6 md:pl-8 group">
      <div
        className={`absolute w-4 h-4 rounded-full -left-[9px] top-1.5 ring-4 shadow-sm ${dotColorClass}`}
      />

      <Card
        className={`border shadow-sm overflow-hidden transition-colors ${borderColorClass} hover:border-primary/40`}
      >
        <div
          className={`${headerBgClass} px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {isDecision ? (
                <Scale className="w-4 h-4 text-amber-600" />
              ) : (
                <FileText className="w-4 h-4 text-slate-400" />
              )}
              <span
                className={`text-sm font-bold ${isDecision ? 'text-amber-900' : 'text-slate-700'}`}
              >
                {new Date(mov.event_date || mov.created).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            {mov.movement_details?.nivelSigilo && (
              <Badge
                variant="outline"
                className="text-[10px] bg-red-50 text-red-600 border-red-200 uppercase tracking-wider"
              >
                Sigilo: {mov.movement_details.nivelSigilo}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Badge variant="outline" className="text-[10px] bg-white text-slate-600">
              {mov.source}
            </Badge>
            {isNew && (
              <Badge className="bg-green-100 text-green-800 border-none text-[10px] px-2 uppercase tracking-wider">
                Novo
              </Badge>
            )}
            {mov.movement_details?.avisosPendentes && (
              <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] px-2 flex items-center gap-1 uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3" /> Aviso
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4 bg-white">
          <div className="space-y-3">
            <div>
              <h4 className="text-base font-semibold text-slate-800 leading-snug">
                {isDecision ? 'Ato do Magistrado / Decisão' : fixEncoding(mov.description)}
              </h4>
              {isDecision &&
                mov.description &&
                mov.description !== 'Ato do Magistrado / Decisão' && (
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    {fixEncoding(mov.description)}
                  </p>
                )}
            </div>

            <div className="relative">
              <div
                className={cn(
                  'text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-4 rounded-md border border-slate-100 transition-all duration-300',
                  !isExpanded && isLongText ? 'max-h-[160px] overflow-hidden' : 'max-h-none',
                )}
              >
                {hasDetailedContent ? (
                  /<[a-z][\s\S]*>/i.test(textContent) ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: textContent,
                      }}
                      className="prose prose-sm max-w-none text-slate-700 [&>p]:mb-2 [&>p:last-child]:mb-0 [&>div]:mb-2 [&>br]:mb-1 break-words"
                    />
                  ) : (
                    <div className="break-words font-sans text-slate-700 leading-relaxed">
                      {textContent}
                    </div>
                  )
                ) : (
                  <span className="italic text-slate-400">
                    Nenhum conteúdo detalhado (texto da decisão ou andamento) foi fornecido pelo
                    tribunal.
                  </span>
                )}
              </div>

              {!isExpanded && isLongText && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none rounded-b-md" />
              )}

              {isLongText && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-primary hover:text-primary/80 hover:bg-primary/5"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Ocultar detalhes' : 'Ler na íntegra'}
                </Button>
              )}
            </div>
          </div>

          {(mov.movement_details?.protocolo || mov.movement_details?.recibo) && (
            <div className="flex flex-wrap gap-4 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-lg border border-slate-100">
              {mov.movement_details?.protocolo && (
                <div className="flex items-center gap-1.5">
                  <FileSignature className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold">Protocolo:</span> {mov.movement_details.protocolo}
                </div>
              )}
              {mov.movement_details?.recibo && (
                <div className="flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold">Recibo:</span> {mov.movement_details.recibo}
                </div>
              )}
            </div>
          )}

          {hasAdditionalMeta && (
            <Accordion type="single" collapsible className="w-full mt-3">
              <AccordionItem
                value="metadata"
                className="border border-slate-200 rounded-lg overflow-hidden shadow-sm"
              >
                <AccordionTrigger className="py-2.5 px-4 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:no-underline transition-colors flex gap-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400" />
                    Informações Adicionais (Metadados)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-white border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                    {mov.movement_details?.codigo && (
                      <div>
                        <span className="font-semibold text-slate-800">Código do Movimento:</span>{' '}
                        <Badge
                          variant="outline"
                          className="ml-1 bg-slate-50 text-slate-700 font-mono text-xs"
                        >
                          {mov.movement_details.codigo}
                        </Badge>
                      </div>
                    )}
                    {mov.movement_details?.orgaoJulgador && (
                      <div>
                        <span className="font-semibold text-slate-800">Órgão Julgador:</span>{' '}
                        {fixEncoding(mov.movement_details.orgaoJulgador)}
                      </div>
                    )}
                    {mov.movement_details?.tipoComunicacao && (
                      <div>
                        <span className="font-semibold text-slate-800">Tipo de Comunicação:</span>{' '}
                        {fixEncoding(mov.movement_details.tipoComunicacao)}
                      </div>
                    )}
                    {mov.movement_details?.meio && (
                      <div>
                        <span className="font-semibold text-slate-800">Meio:</span>{' '}
                        {fixEncoding(mov.movement_details.meio)}
                      </div>
                    )}
                    {mov.movement_details?.siglaTribunal && (
                      <div>
                        <span className="font-semibold text-slate-800">Tribunal:</span>{' '}
                        {mov.movement_details.siglaTribunal}
                      </div>
                    )}
                    {mov.movement_details?.magistradoNome && (
                      <div>
                        <span className="font-semibold text-slate-800">Magistrado:</span>{' '}
                        {mov.movement_details.magistradoNome}
                      </div>
                    )}
                    {mov.movement_details?.magistradoCpf && (
                      <div>
                        <span className="font-semibold text-slate-800">CPF Magistrado:</span>{' '}
                        {mov.movement_details.magistradoCpf}
                      </div>
                    )}
                    {mov.movement_details?.complementos &&
                      mov.movement_details.complementos.length > 0 && (
                        <div className="col-span-full">
                          <span className="font-semibold block text-slate-800 mb-1">
                            Complementos:
                          </span>
                          <ul className="list-disc pl-5 space-y-0.5">
                            {mov.movement_details.complementos.map((c: any, idx: number) => (
                              <li key={idx}>
                                {c.nome || c.descricao}: {c.valor || c.descricaoValor}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {mov.movement_details?.documentos && mov.movement_details.documentos.length > 0 && (
            <div className="pt-2">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileStack className="w-4 h-4" /> Documentos Vinculados (
                {mov.movement_details.documentos.length})
              </h5>
              <div className="grid grid-cols-1 gap-3">
                {mov.movement_details.documentos.map((doc: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white hover:border-primary/40 hover:shadow-sm transition-all group"
                  >
                    <div className="bg-white p-2 rounded-md border border-slate-200 shadow-sm shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-semibold text-slate-800 truncate"
                        title={fixEncoding(doc.nome || doc.tipoDocumento || 'Documento')}
                      >
                        {fixEncoding(doc.nome || doc.tipoDocumento || 'Documento')}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          ID: {doc.idDocumento || doc.id || doc.hash || 'Sem ID'}
                        </span>
                        {doc.nivelSigilo && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-red-50 text-red-600 border-red-200 h-5 px-1.5 font-normal tracking-wide"
                          >
                            Sigilo: {doc.nivelSigilo}
                          </Badge>
                        )}
                        {doc.dataJuntada && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(doc.dataJuntada).toLocaleDateString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        )}
                      </div>
                      {doc.signatarios && doc.signatarios.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          <span className="font-semibold text-slate-600">Assinado por: </span>
                          {doc.signatarios
                            .map((s: any) => s.pessoa?.nome || s.nome || '')
                            .join(', ')}
                        </p>
                      )}
                      {mov.movement_details?.signatarios &&
                        mov.movement_details.signatarios.length > 0 &&
                        (!doc.signatarios || doc.signatarios.length === 0) && (
                          <p className="text-[10px] text-slate-500 mt-1 truncate">
                            <span className="font-semibold text-slate-600">Assinado por: </span>
                            {mov.movement_details.signatarios
                              .map((s: any) => s.pessoa?.nome || s.nome || '')
                              .join(', ')}
                          </p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(mov.movement_details?.avisosPendentes ||
            mov.movement_details?.teorComunicacao ||
            mov.movement_details?.ciencia) && (
            <div className="mt-4 p-4 bg-indigo-50/60 border border-indigo-200/60 rounded-lg space-y-4">
              {mov.movement_details.teorComunicacao && (
                <div>
                  <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                    <Bell className="w-4 h-4" /> Teor da Comunicação / Intimação
                  </span>
                  <div className="text-sm text-indigo-900 bg-white p-3.5 rounded-md border border-indigo-100 shadow-sm whitespace-pre-wrap leading-relaxed">
                    {mov.movement_details.teorComunicacao}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mov.movement_details.ciencia && (
                  <div>
                    <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" /> Status de Ciência
                    </span>
                    <div className="text-xs text-indigo-800 bg-white p-3 rounded-md border border-indigo-100 shadow-sm custom-scrollbar overflow-auto max-h-32">
                      {renderNestedObject(mov.movement_details.ciencia)}
                    </div>
                  </div>
                )}
                {mov.movement_details.avisosPendentes && (
                  <div>
                    <span className="font-bold text-amber-800 text-xs flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4" /> Avisos Pendentes
                    </span>
                    <div className="text-xs text-amber-900 bg-white p-3 rounded-md border border-amber-100 shadow-sm custom-scrollbar overflow-auto max-h-32">
                      {renderNestedObject(mov.movement_details.avisosPendentes)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function ProcessDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [legalCase, setLegalCase] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [movementsPage, setMovementsPage] = useState(1)
  const [movementsTotalPages, setMovementsTotalPages] = useState(1)

  const [tasks, setTasks] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [finances, setFinances] = useState<any[]>([])
  const [newMovement, setNewMovement] = useState('')
  const [activeTab, setActiveTab] = useState('andamento')
  const [isSyncingPje, setIsSyncingPje] = useState(false)

  useEffect(() => {
    if (id) {
      loadData()
      loadMovements(1)
    }
  }, [id])

  useRealtime('legal_cases', (e) => {
    if (e.record.id === id) {
      setLegalCase((prev: any) => {
        if (!prev) return prev
        return { ...prev, ...e.record }
      })
    }
  })

  useRealtime('case_movements', (e) => {
    if (e.record.case === id) {
      loadMovements(movementsPage)
      loadData()
    }
  })

  const loadData = async () => {
    try {
      const c = await getLegalCase(id!)
      setLegalCase(c)
      const tks = await pb
        .collection('tasks')
        .getFullList({ filter: `linked_lawsuit = "${id}" && deleted_at = ""`, sort: '-created' })
      setTasks(tks)
      const evs = await pb
        .collection('agenda_events')
        .getFullList({ filter: `linked_lawsuit = "${id}" && deleted_at = ""`, sort: '-start_date' })
      setEvents(evs)
      const fins = await pb
        .collection('finances')
        .getFullList({ filter: `linked_lawsuit = "${id}" && deleted_at = ""`, sort: '-created' })
      setFinances(fins)
    } catch (err) {
      toast({ title: 'Erro ao carregar processo', variant: 'destructive' })
    }
  }

  const loadMovements = async (page: number) => {
    try {
      const res = await getPaginatedCaseMovements(id!, page, 10)
      setMovements(res.items)
      setMovementsTotalPages(res.totalPages)
      setMovementsPage(page)
    } catch (err) {
      toast({ title: 'Erro ao carregar andamentos', variant: 'destructive' })
    }
  }

  const handleAddMovement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newMovement.trim()) return
    try {
      await pb.collection('case_movements').create({
        case: id,
        event_date: new Date().toISOString(),
        description: newMovement,
        source: 'Manual',
        organization: pb.authStore.record?.active_organization,
      })
      setNewMovement('')
      toast({ title: 'Ocorrência processual registrada.' })
      loadMovements(1)
      setActiveTab('andamento')
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', variant: 'destructive' })
    }
  }

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('tasks').create({
        title: fd.get('title'),
        due_date: fd.get('due_date')
          ? new Date(`${fd.get('due_date')}T12:00:00Z`).toISOString()
          : '',
        priority: fd.get('priority'),
        status: 'todo',
        linked_lawsuit: id,
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Tarefa criada' })
      loadData()
      ;(e.target as HTMLFormElement).reset()
      setActiveTab('andamento')
    } catch (err: any) {
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' })
    }
  }

  const handlePjeSync = async () => {
    if (!legalCase?.case_number)
      return toast({ title: 'Número do processo não informado', variant: 'destructive' })

    const digitsOnly = legalCase.case_number.replace(/\D/g, '')
    if (digitsOnly.length < 10) {
      return toast({
        title: 'Número inválido',
        description: 'O número do processo deve conter pelo menos 10 dígitos numéricos.',
        variant: 'destructive',
      })
    }

    setIsSyncingPje(true)
    try {
      const res = await pb.send(`/backend/v1/sync/case/${id}`, { method: 'POST' })

      toast({
        title: 'Sincronização PJe Concluída',
        description: `${res.new_communications} novos andamentos encontrados e metadados atualizados.`,
      })
      loadMovements(1)
      loadData()
    } catch (err: any) {
      let description =
        getErrorMessage(err) || 'Ocorreu um erro inesperado ao se comunicar com o tribunal.'
      if (err?.status === 400) {
        description =
          'A consulta foi rejeitada pelo PJe. Verifique se o número do processo é válido e tente novamente.'
      }

      toast({
        title: 'Erro na Sincronização',
        description,
        variant: 'destructive',
      })
    } finally {
      setIsSyncingPje(false)
    }
  }

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('agenda_events').create({
        title: fd.get('title'),
        start_date: fd.get('start_date')
          ? new Date(`${fd.get('start_date')}T12:00:00Z`).toISOString()
          : '',
        type: fd.get('type'),
        linked_lawsuit: id,
        organization: pb.authStore.record?.active_organization,
      })
      toast({ title: 'Compromisso criado' })
      loadData()
      ;(e.target as HTMLFormElement).reset()
      setActiveTab('andamento')
    } catch (err: any) {
      toast({ title: 'Erro ao criar compromisso', variant: 'destructive' })
    }
  }

  if (!legalCase)
    return <div className="p-8 text-center text-slate-500">Carregando processo...</div>

  const totalFinance = finances.reduce((acc, curr) => acc + (curr.amount || 0), 0)

  return (
    <div className="bg-[#f0f2f5] min-h-screen -m-6 p-6 animate-fade-in-up">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="sticky top-4 z-20 rounded-xl border border-slate-200 shadow-md overflow-hidden bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 mb-2">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <div className="flex items-start gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1">
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                      [{legalCase.parties}]
                    </h1>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium py-1 px-3"
                      >
                        {legalCase.case_number || 'Sem número'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-slate-500">
                      {legalCase.court || 'Tribunal não informado'}
                    </Badge>
                    {legalCase.court_organ && (
                      <Badge
                        variant="outline"
                        className="text-slate-500 max-w-sm truncate"
                        title={legalCase.court_organ}
                      >
                        {legalCase.court_organ}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePjeSync}
                  disabled={isSyncingPje || !legalCase.case_number}
                  className="bg-white shadow-sm"
                >
                  {isSyncingPje ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sincronizar PJe
                </Button>
                <Badge className="bg-slate-600 hover:bg-slate-700 text-white font-medium uppercase px-3 py-1">
                  {legalCase.lifecycle_status || 'ATIVO'}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-500">Cliente:</span>
                <span
                  className="font-semibold text-slate-800 truncate"
                  title={legalCase.expand?.client?.name}
                >
                  {legalCase.expand?.client?.name || 'Não informado'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-500">Responsável:</span>
                <span
                  className="font-semibold text-slate-800 truncate"
                  title={legalCase.expand?.responsible_collaborator?.name}
                >
                  {legalCase.expand?.responsible_collaborator?.name || 'Não informado'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-500">Classe:</span>
                <span
                  className="font-semibold text-slate-800 truncate"
                  title={legalCase.metadata?.classe?.nome || legalCase.type}
                >
                  {legalCase.metadata?.classe?.nome || legalCase.type || 'Não informado'}
                </span>
              </div>
            </div>

            {legalCase.metadata && Object.keys(legalCase.metadata).length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-primary" /> Metadados Estruturados (DataJud/MNI)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2 text-sm">
                    {legalCase.metadata.valorCausa?.valor !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Valor da Causa:</span>
                        <span className="font-medium text-slate-800">
                          R$ {legalCase.metadata.valorCausa.valor}
                        </span>
                      </div>
                    )}
                    {legalCase.metadata.nivelSigilo !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Sigilo:</span>
                        <span className="font-medium text-slate-800">
                          {legalCase.metadata.nivelSigilo}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-sm md:col-span-2">
                    {legalCase.metadata.assuntos && legalCase.metadata.assuntos.length > 0 && (
                      <div>
                        <span className="text-slate-500 block mb-1">Assuntos:</span>
                        <div className="flex flex-wrap gap-1">
                          {legalCase.metadata.assuntos.map((assunto: any, idx: number) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="font-normal bg-slate-100 text-slate-700 text-xs"
                            >
                              {assunto.nome || assunto.codigo}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full bg-white border-b rounded-none justify-start px-4 h-auto pt-2 pb-0 flex-wrap">
                  <TabsTrigger
                    value="andamento"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 whitespace-nowrap"
                  >
                    Histórico
                  </TabsTrigger>
                  <TabsTrigger
                    value="tarefa"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3"
                  >
                    Nova tarefa
                  </TabsTrigger>
                  <TabsTrigger
                    value="compromisso"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3"
                  >
                    Novo Registro
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="andamento" className="p-6 pt-6">
                  <form onSubmit={handleAddMovement} className="flex gap-4">
                    <Input
                      placeholder="Descreva o andamento ou ocorrência manual..."
                      className="flex-1 bg-slate-50 border-slate-200"
                      value={newMovement}
                      onChange={(e) => setNewMovement(e.target.value)}
                    />
                    <Button type="submit" className="bg-slate-600 hover:bg-slate-700">
                      Salvar
                    </Button>
                  </form>

                  {/* Movements Timeline */}
                  <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 mt-8 pb-6">
                    {movements.length === 0 ? (
                      <div className="p-8 ml-4 text-center text-slate-500 border border-dashed rounded-lg bg-slate-50/50">
                        Nenhum andamento encontrado.
                      </div>
                    ) : (
                      movements.map((mov) => {
                        const movDate = new Date(mov.created).getTime()
                        const isNew = movDate > Date.now() - 86400000 * 2

                        return (
                          <MovementItem
                            key={mov.id}
                            mov={mov}
                            isNew={isNew}
                            recordId={id!}
                            caseNumber={legalCase.case_number}
                          />
                        )
                      })
                    )}
                  </div>

                  {movementsTotalPages > 1 && (
                    <div className="pt-6 border-t border-slate-100 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => loadMovements(Math.max(1, movementsPage - 1))}
                              className={
                                movementsPage === 1
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>
                          <span className="text-sm text-slate-500 mx-4 flex items-center font-medium">
                            Página {movementsPage} de {movementsTotalPages}
                          </span>
                          <PaginationItem>
                            <PaginationNext
                              onClick={() =>
                                loadMovements(Math.min(movementsTotalPages, movementsPage + 1))
                              }
                              className={
                                movementsPage === movementsTotalPages
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="tarefa" className="p-6 pt-6">
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                      <Label>Título da Tarefa</Label>
                      <Input name="title" placeholder="Ex: Preparar contestação..." required />
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
                    <Button type="submit">Criar Tarefa</Button>
                  </form>
                </TabsContent>
                <TabsContent value="compromisso" className="p-6 pt-6">
                  <form onSubmit={handleAddEvent} className="space-y-4">
                    <div>
                      <Label>Título / Assunto</Label>
                      <Input name="title" placeholder="Ex: Reunião com cliente..." required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data / Hora</Label>
                        <Input name="start_date" type="datetime-local" required />
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
                    <Button type="submit">Criar Registro</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="py-4 px-5 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <CheckSquare className="w-4 h-4 text-slate-400" /> Tarefas ({tasks.length})
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {tasks.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">
                    Nenhuma tarefa criada.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        className="text-sm p-3 bg-slate-50 border rounded flex justify-between"
                      >
                        <span className="font-medium text-slate-700 truncate pr-2">{t.title}</span>
                        <span className="text-slate-400 shrink-0">
                          {t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-slate-400" /> Compromissos ({events.length})
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {events.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">
                    Nenhum evento agendado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((e) => (
                      <div
                        key={e.id}
                        className="text-sm p-3 bg-slate-50 border rounded flex justify-between"
                      >
                        <span className="font-medium text-slate-700 truncate pr-2">{e.title}</span>
                        <span className="text-slate-400 shrink-0">
                          {new Date(e.start_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="py-4 px-5 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span className="text-slate-400 text-lg">$</span> Resumo Financeiro
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 rounded-lg border">
                  <span className="text-sm text-slate-500">Custo Previsto</span>
                  <span className="text-base font-semibold text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      totalFinance,
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Registros ({finances.length})</span>
                  <button
                    onClick={() => navigate(`/intranet/finance?caseId=${id}`)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Ver detalhes
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

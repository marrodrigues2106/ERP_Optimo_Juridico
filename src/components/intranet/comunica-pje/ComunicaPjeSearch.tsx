import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { searchComunicaPJe } from '@/services/comunica-pje'
import { useComunicaStore } from '@/hooks/use-comunica-store'
import { Loader2, Search } from 'lucide-react'
import ConsultaTable from './ConsultaTable'
import ConsultaDetails from './ConsultaDetails'
import pb from '@/lib/pocketbase/client'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'

const searchSchema = z.object({
  numeroProcesso: z.string().optional(),
  nomeParte: z.string().optional(),
  nomeAdvogado: z.string().optional(),
  oab: z.string().optional(),
  ufOab: z.string().optional(),
  siglaTribunal: z.array(z.string()).optional(),
  meio: z.string().optional(),
  dataDisponibilizacaoInicio: z.string().optional(),
  dataDisponibilizacaoFim: z.string().optional(),
})

export default function ComunicaPjeSearch() {
  const { toast } = useToast()
  const { baseUrl, apiKey, addHistory, init } = useComunicaStore()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [tribunals, setTribunals] = useState<any[]>([])

  useEffect(() => {
    init()
    pb.collection('tribunals')
      .getFullList({ filter: 'active = true', sort: 'alias' })
      .then((records) => {
        const unique = new Map()
        records.forEach((r) => {
          const alias = r.alias.toUpperCase()
          if (!unique.has(alias)) unique.set(alias, { ...r, alias })
        })
        setTribunals(Array.from(unique.values()).sort((a, b) => a.alias.localeCompare(b.alias)))
      })
      .catch(() => {})
  }, [init])

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      numeroProcesso: '',
      nomeParte: '',
      nomeAdvogado: '',
      oab: '',
      ufOab: '',
      siglaTribunal: [],
      meio: 'ALL',
      dataDisponibilizacaoInicio: '',
      dataDisponibilizacaoFim: '',
    },
  })

  async function onSubmit(values: z.infer<typeof searchSchema>) {
    setLoading(true)
    setResults([])
    try {
      const payload = { ...values, siglaTribunal: values.siglaTribunal?.join(',') || '' }
      const data = await searchComunicaPJe(payload, baseUrl, apiKey, addHistory)
      setResults(data)
      toast({ title: 'Busca concluída', description: `Encontrados ${data.length} resultados.` })
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na busca', description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up max-w-6xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
          Comunicações PJe
        </h1>
        <p className="text-lg text-slate-500">
          Consulta e gerenciamento do Diário de Justiça Eletrônico Nacional.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">
          Busca de Publicações
        </h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="numeroProcesso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Número do Processo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0000000-00.0000..."
                        {...field}
                        className="text-base py-5"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nomeParte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Nome da Parte</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} className="text-base py-5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nomeAdvogado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Nome do Advogado</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do advogado" {...field} className="text-base py-5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="oab"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">OAB</FormLabel>
                    <FormControl>
                      <Input placeholder="Número OAB" {...field} className="text-base py-5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="siglaTribunal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Tribunal</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-white text-base py-5 h-auto"
                        >
                          {field.value?.length
                            ? `${field.value.length} selecionados`
                            : 'Selecione Tribunais'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-4 h-80 overflow-y-auto">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                          <Checkbox
                            checked={
                              field.value?.length === tribunals.length && tribunals.length > 0
                            }
                            onCheckedChange={(c) =>
                              c ? field.onChange(tribunals.map((t) => t.alias)) : field.onChange([])
                            }
                          />
                          <span className="font-bold text-base text-slate-800">
                            Selecionar Todos
                          </span>
                        </div>
                        <div className="space-y-3">
                          {tribunals.map((t) => (
                            <div key={t.id} className="flex items-center gap-3">
                              <Checkbox
                                checked={field.value?.includes(t.alias)}
                                onCheckedChange={(c) => {
                                  const current = field.value || []
                                  if (c) field.onChange([...current, t.alias])
                                  else field.onChange(current.filter((x) => x !== t.alias))
                                }}
                              />
                              <span className="text-base font-medium text-slate-600">
                                {t.alias}
                              </span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Meio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-base py-5 h-auto">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-base">
                          Todos
                        </SelectItem>
                        <SelectItem value="E" className="text-base">
                          Eletrônico
                        </SelectItem>
                        <SelectItem value="D" className="text-base">
                          Diário Físico
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataDisponibilizacaoInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Data Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="text-base py-5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataDisponibilizacaoFim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Data Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="text-base py-5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto py-6 px-8 text-lg font-bold"
              >
                {loading ? (
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                ) : (
                  <Search className="mr-3 h-6 w-6" />
                )}
                Buscar Comunicações
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <ConsultaTable data={results} onViewDetails={setSelectedItem} />
        </div>
      )}

      {selectedItem && (
        <ConsultaDetails item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}

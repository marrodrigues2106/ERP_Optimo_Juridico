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
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()
  const { baseUrl, apiKey, addHistory, init } = useComunicaStore()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tribunals, setTribunals] = useState<string[]>([])

  useEffect(() => {
    init()
    const PJE_TRIBUNALS = [
      'STF',
      'STJ',
      'TSE',
      'TST',
      'CJF',
      'CSJT',
      'STM',
      'TJAC',
      'TJAL',
      'TJAM',
      'TJAP',
      'TJBA',
      'TJCE',
      'TJDF',
      'TJES',
      'TJGO',
      'TJMA',
      'TJMG',
      'TJMS',
      'TJMT',
      'TJPA',
      'TJPB',
      'TJPE',
      'TJPI',
      'TJPR',
      'TJRJ',
      'TJRN',
      'TJRO',
      'TJRR',
      'TJRS',
      'TJSC',
      'TJSE',
      'TJSP',
      'TJTO',
      'TRF1',
      'TRF2',
      'TRF3',
      'TRF4',
      'TRF5',
      'TRF6',
      'TRT1',
      'TRT2',
      'TRT3',
      'TRT4',
      'TRT5',
      'TRT6',
      'TRT7',
      'TRT8',
      'TRT9',
      'TRT10',
      'TRT11',
      'TRT12',
      'TRT13',
      'TRT14',
      'TRT15',
      'TRT16',
      'TRT17',
      'TRT18',
      'TRT19',
      'TRT20',
      'TRT21',
      'TRT22',
      'TRT23',
      'TRT24',
      'TRE-AC',
      'TRE-AL',
      'TRE-AM',
      'TRE-AP',
      'TRE-BA',
      'TRE-CE',
      'TRE-DF',
      'TRE-ES',
      'TRE-GO',
      'TRE-MA',
      'TRE-MG',
      'TRE-MS',
      'TRE-MT',
      'TRE-PA',
      'TRE-PB',
      'TRE-PE',
      'TRE-PI',
      'TRE-PR',
      'TRE-RJ',
      'TRE-RN',
      'TRE-RO',
      'TRE-RR',
      'TRE-RS',
      'TRE-SC',
      'TRE-SE',
      'TRE-SP',
      'TRE-TO',
    ]
    setTribunals(PJE_TRIBUNALS)
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
                    <FormLabel className="text-lg font-bold">Número do Processo</FormLabel>
                    <FormControl>
                      <Input placeholder="0000000-00.0000..." {...field} className="text-lg py-5" />
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
                    <FormLabel className="text-lg font-bold">Nome da Parte</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} className="text-lg py-5" />
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
                    <FormLabel className="text-lg font-bold">Nome do Advogado</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do advogado" {...field} className="text-lg py-5" />
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
                    <FormLabel className="text-lg font-bold">OAB</FormLabel>
                    <FormControl>
                      <Input placeholder="Número OAB" {...field} className="text-lg py-5" />
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
                    <FormLabel className="text-lg font-bold">Tribunal</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-white text-lg py-5 h-auto"
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
                              c ? field.onChange(tribunals) : field.onChange([])
                            }
                          />
                          <span className="font-bold text-lg text-slate-800">Selecionar Todos</span>
                        </div>
                        <div className="space-y-3">
                          {tribunals.map((t) => (
                            <div key={t} className="flex items-center gap-3">
                              <Checkbox
                                checked={field.value?.includes(t)}
                                onCheckedChange={(c) => {
                                  const current = field.value || []
                                  if (c) field.onChange([...current, t])
                                  else field.onChange(current.filter((x) => x !== t))
                                }}
                              />
                              <span className="text-lg font-medium text-slate-600">{t}</span>
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
                    <FormLabel className="text-lg font-bold">Meio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-lg py-5 h-auto">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-lg">
                          Todos
                        </SelectItem>
                        <SelectItem value="E" className="text-lg">
                          Eletrônico
                        </SelectItem>
                        <SelectItem value="D" className="text-lg">
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
                    <FormLabel className="text-lg font-bold">Data Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="text-lg py-5" />
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
                    <FormLabel className="text-lg font-bold">Data Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="text-lg py-5" />
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
          <ConsultaTable
            data={results}
            onViewDetails={(item) => {
              if (item.id) {
                navigate(`/intranet/comunicacoes/${item.id}`)
              } else {
                sessionStorage.setItem('comunica_temp_detail', JSON.stringify(item))
                navigate(`/intranet/comunicacoes/temp`)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}

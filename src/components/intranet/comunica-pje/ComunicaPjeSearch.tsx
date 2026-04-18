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
      .then(setTribunals)
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
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="numeroProcesso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Processo</FormLabel>
                    <FormControl>
                      <Input placeholder="0000000-00.0000..." {...field} />
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
                    <FormLabel>Nome da Parte</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
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
                    <FormLabel>Nome do Advogado</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do advogado" {...field} />
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
                    <FormLabel>OAB</FormLabel>
                    <FormControl>
                      <Input placeholder="Número OAB" {...field} />
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
                    <FormLabel>Tribunal</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-white"
                        >
                          {field.value?.length
                            ? `${field.value.length} selecionados`
                            : 'Selecione Tribunais'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 h-64 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                          <Checkbox
                            checked={
                              field.value?.length === tribunals.length && tribunals.length > 0
                            }
                            onCheckedChange={(c) =>
                              c ? field.onChange(tribunals.map((t) => t.alias)) : field.onChange([])
                            }
                          />
                          <span className="font-semibold text-sm">Selecionar Todos</span>
                        </div>
                        <div className="space-y-2">
                          {tribunals.map((t) => (
                            <div key={t.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={field.value?.includes(t.alias)}
                                onCheckedChange={(c) => {
                                  const current = field.value || []
                                  if (c) field.onChange([...current, t.alias])
                                  else field.onChange(current.filter((x) => x !== t.alias))
                                }}
                              />
                              <span className="text-sm">{t.alias}</span>
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
                    <FormLabel>Meio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="E">Eletrônico</SelectItem>
                        <SelectItem value="D">Diário Físico</SelectItem>
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
                    <FormLabel>Data Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Data Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Buscar Comunicações
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {results.length > 0 && <ConsultaTable data={results} onViewDetails={setSelectedItem} />}

      {selectedItem && (
        <ConsultaDetails item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}

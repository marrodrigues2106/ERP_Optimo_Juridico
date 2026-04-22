import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export function PjeSearchTab() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const { toast } = useToast()

  const ufs = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ]

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams()
    for (const [k, v] of fd.entries()) {
      if (v) params.append(k, v.toString())
    }

    try {
      const res = await pb.send(`/backend/v1/pje-comunica/search?${params.toString()}`, {
        method: 'GET',
      })
      const items = res.items || res.data || (Array.isArray(res) ? res : [])
      setResults(items)
      if (items.length === 0) {
        toast({ title: 'Nenhum resultado encontrado' })
      }
    } catch (err: any) {
      toast({ title: 'Erro na busca', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="space-y-2">
          <Label>Nº OAB</Label>
          <Input name="numeroOab" placeholder="Ex: 12345" />
        </div>
        <div className="space-y-2">
          <Label>UF OAB</Label>
          <Select name="ufOab">
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {ufs.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nome da Parte</Label>
          <Input name="nomeParte" placeholder="Nome completo ou parcial..." />
        </div>
        <div className="space-y-2">
          <Label>Número do Processo</Label>
          <Input name="numeroProcesso" placeholder="0000000-00.0000..." />
        </div>
        <div className="space-y-2">
          <Label>Data Início</Label>
          <Input type="date" name="dataDisponibilizacaoInicio" />
        </div>
        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Input type="date" name="dataDisponibilizacaoFim" />
        </div>
        <div className="space-y-2">
          <Label>Sigla Tribunal</Label>
          <Input name="siglaTribunal" placeholder="Ex: TRF1" />
        </div>
        <div className="space-y-2">
          <Label>Nº Comunicação</Label>
          <Input name="numeroComunicacao" placeholder="Ex: 1234567" />
        </div>
        <div className="space-y-2">
          <Label>Nome do Advogado</Label>
          <Input name="nomeAdvogado" placeholder="Nome completo" />
        </div>
        <div className="space-y-2">
          <Label>Meio</Label>
          <Input name="meio" placeholder="E (Eletrônico), D (Diário)..." maxLength={1} />
        </div>
        <div className="flex items-end lg:col-span-4">
          <Button type="submit" className="w-full md:w-auto ml-auto" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin w-4 h-4 mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}{' '}
            Buscar
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {results.map((r, i) => (
          <div
            key={i}
            className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold text-primary text-lg">{r.numeroProcesso}</h4>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold uppercase tracking-wider">
                {r.siglaTribunal}
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">{r.texto || r.conteudo}</p>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
              <span className="bg-slate-100 px-2 py-1 rounded-md">
                Data: {r.dataDisponibilizacao}
              </span>
              {r.meio && <span className="bg-slate-100 px-2 py-1 rounded-md">Meio: {r.meio}</span>}
              {r.tipoComunicacao && (
                <span className="bg-slate-100 px-2 py-1 rounded-md">{r.tipoComunicacao}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

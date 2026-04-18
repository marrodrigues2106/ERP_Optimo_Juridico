import { useState } from 'react'
import { ConsultaForm } from './ConsultaForm'
import { ConsultaTable } from './ConsultaTable'
import { searchPjeComunica, PjeSearchParams } from '@/services/comunicaPje'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export function SearchTab() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const { toast } = useToast()

  const handleSearch = async (params: PjeSearchParams) => {
    setLoading(true)
    setHasSearched(true)
    setResults([])
    try {
      const data = await searchPjeComunica(params)
      if (data && data.items) {
        setResults(data.items)
        if (data.items.length === 0) {
          toast({
            title: 'Sem resultados',
            description: 'Nenhum resultado encontrado para os filtros informados.',
          })
        } else {
          toast({
            title: 'Busca concluída',
            description: `${data.items.length} resultados encontrados.`,
          })
        }
      } else {
        setResults([])
      }
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro na busca',
        description: error?.response?.message || getErrorMessage(error) || 'Erro ao consultar API',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setResults([])
    setHasSearched(false)
  }

  return (
    <div className="space-y-6">
      <ConsultaForm onSearch={handleSearch} onClear={handleClear} loading={loading} />
      {(hasSearched || results.length > 0) && <ConsultaTable data={results} loading={loading} />}
    </div>
  )
}

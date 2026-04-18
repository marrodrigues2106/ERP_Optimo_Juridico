import { useState } from 'react'
import { ConsultaForm } from './ConsultaForm'
import { ConsultaTable } from './ConsultaTable'
import { searchPjeComunica, PjeSearchParams } from '@/services/comunicaPje'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'

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

      if (data && Array.isArray(data.items)) {
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
        toast({
          title: 'Sem resultados',
          description: 'Nenhum resultado retornado pela API.',
        })
      }
    } catch (error: any) {
      console.error('Search error:', error)

      let customMessage = getErrorMessage(error)
      if (error?.response?.message) {
        customMessage = error.response.message
      } else if (error instanceof Error) {
        customMessage = error.message
      }

      if (
        customMessage.includes('WAF (403)') ||
        customMessage.includes('Bloqueio Geográfico') ||
        error?.status === 403
      ) {
        customMessage =
          'Bloqueio Geográfico ou Acesso Negado pelo WAF (403). Verifique se o IP do servidor ou a sua API Key estão autorizados no portal do PJe.'
      }

      toast({
        title: 'Erro na busca',
        description: customMessage || 'Erro ao processar sua requisição.',
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

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

      let searchRecord
      try {
        const term =
          params.nomeParte ||
          params.numeroProcesso ||
          params.nomeAdvogado ||
          params.numeroOab ||
          params.cpfCnpj ||
          ''

        searchRecord = await pb.collection('searches').create({
          term: String(term).substring(0, 250),
          search_type: 'pje_comunica',
          status: 'completed',
          business_status:
            data && data.items && data.items.length > 0 ? 'sucesso' : 'sem_resultados',
          results_count: data?.items?.length || 0,
          start_date: params.dataDisponibilizacaoInicio || '',
          end_date: params.dataDisponibilizacaoFim || '',
        })
      } catch (searchErr: any) {
        console.error('Error creating search record:', searchErr)
        throw searchErr
      }

      if (data && data.items) {
        const mappedResults = []
        for (const item of data.items) {
          if (!searchRecord?.id) break

          const resultData = {
            search_id: searchRecord.id,
            sigla_tribunal: String(item.siglaTribunal || '').substring(0, 250),
            tipo_comunicacao: String(item.tipoComunicacao || '').substring(0, 250),
            nome_orgao: String(item.nomeOrgao || '').substring(0, 250),
            texto: String(item.texto || ''),
            numero_processo: String(item.numero_processo || item.numeroProcesso || '').substring(
              0,
              250,
            ),
            meio: String(item.meio || '').substring(0, 250),
            tipo_documento: String(item.tipoDocumento || '').substring(0, 250),
            nome_classe: String(item.nomeClasse || '').substring(0, 250),
            data_disponibilizacao: String(item.dataDisponibilizacao || '').substring(0, 250),
            numero_comunicacao: String(
              item.numero_comunicacao || item.numeroComunicacao || '',
            ).substring(0, 250),
            link: String(item.link || ''),
            hash_comunicacao: String(item.hash_comunicacao || item.hashComunicacao || '').substring(
              0,
              250,
            ),
            status_comunicacao: String(
              item.status_comunicacao || item.statusComunicacao || '',
            ).substring(0, 250),
            raw_json: item,
          }

          try {
            const created = await pb.collection('results').create(resultData)
            mappedResults.push({ ...item, ...created })
          } catch (resErr: any) {
            console.error('Error creating result record:', resErr)
            throw resErr
          }
        }

        setResults(mappedResults)
        if (mappedResults.length === 0) {
          toast({
            title: 'Sem resultados',
            description: 'Nenhum resultado encontrado para os filtros informados.',
          })
        } else {
          toast({
            title: 'Busca concluída',
            description: `${mappedResults.length} resultados encontrados.`,
          })
        }
      } else {
        setResults([])
      }
    } catch (error: any) {
      console.error(error)
      const errorMessage = getErrorMessage(error)
      toast({
        title: 'Erro na busca',
        description: errorMessage || 'Erro ao processar sua requisição.',
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

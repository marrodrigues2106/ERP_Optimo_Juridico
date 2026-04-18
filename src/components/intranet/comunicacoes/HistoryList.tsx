import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRealtime } from '@/hooks/use-realtime'
import { getSearches } from '@/services/searches'

export function HistoryList() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = async () => {
    try {
      const records = await getSearches({ sort: '-created', limit: 50 })
      setHistory(records.items)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  useRealtime('searches', () => {
    fetchHistory()
  })

  if (loading) {
    return <Card className="p-8 text-center">Carregando histórico...</Card>
  }

  if (history.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhum histórico de busca encontrado.
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Filtros</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Resultados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => {
              let termObj: Record<string, any> = {}
              try {
                termObj = JSON.parse(item.term || '{}')
              } catch (e) {}

              const filtersStr = Object.entries(termObj)
                .filter(([_, v]) => Boolean(v))
                .map(([k, v]) => `${k}: ${v}`)
                .join(' | ')

              return (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(item.created).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>{item.search_type || 'PJe Comunica'}</TableCell>
                  <TableCell className="max-w-md truncate" title={filtersStr}>
                    {filtersStr || 'Nenhum filtro'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === 'success'
                          ? 'default'
                          : item.status === 'no_results'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {item.status === 'success'
                        ? 'Sucesso'
                        : item.status === 'no_results'
                          ? 'Sem resultados'
                          : item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.results_count || 0}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

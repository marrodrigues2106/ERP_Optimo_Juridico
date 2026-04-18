import { useState, useMemo, useEffect } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface ConsultaTableProps {
  data: any[]
  loading: boolean
}

export function ConsultaTable({ data, loading }: ConsultaTableProps) {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setPage(1)
  }, [filter, data])

  const filteredData = useMemo(() => {
    if (!filter) return data
    const lowerFilter = filter.toLowerCase()
    return data.filter(
      (item) =>
        item.numeroProcesso?.toLowerCase().includes(lowerFilter) ||
        item.nomeOrgao?.toLowerCase().includes(lowerFilter) ||
        item.tipoComunicacao?.toLowerCase().includes(lowerFilter) ||
        item.siglaTribunal?.toLowerCase().includes(lowerFilter) ||
        item.advogado_nome?.toLowerCase().includes(lowerFilter),
    )
  }, [data, filter])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  if (loading) {
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tribunal</TableHead>
              <TableHead>Processo</TableHead>
              <TableHead>Tipo / Órgão</TableHead>
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhum resultado encontrado. Ajuste os filtros e tente novamente.
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-4 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar resultados..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredData.length} de {data.length} resultados
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Data</TableHead>
              <TableHead>Tribunal</TableHead>
              <TableHead className="whitespace-nowrap">Processo</TableHead>
              <TableHead>Tipo / Órgão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, i) => (
                <TableRow key={item.hash || item.numeroComunicacao || i}>
                  <TableCell className="whitespace-nowrap">
                    {item.dataDisponibilizacao
                      ? new Date(item.dataDisponibilizacao).toLocaleDateString('pt-BR')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.siglaTribunal}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {item.numeroProcesso}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{item.tipoComunicacao}</div>
                    <div
                      className="text-xs text-muted-foreground line-clamp-1"
                      title={item.nomeOrgao}
                    >
                      {item.nomeOrgao} {item.nomeClasse ? `- ${item.nomeClasse}` : ''}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.link ? (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem link</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum resultado corresponde ao filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

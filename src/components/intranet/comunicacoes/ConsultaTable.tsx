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

interface ConsultaTableProps {
  data: any[]
  loading: boolean
}

export function ConsultaTable({ data, loading }: ConsultaTableProps) {
  if (loading) {
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tribunal</TableHead>
              <TableHead>Processo</TableHead>
              <TableHead>Meio</TableHead>
              <TableHead>Órgão</TableHead>
              <TableHead>Tipo</TableHead>
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
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Data</TableHead>
              <TableHead>Tribunal</TableHead>
              <TableHead className="whitespace-nowrap">Processo</TableHead>
              <TableHead>Meio</TableHead>
              <TableHead>Órgão / Classe</TableHead>
              <TableHead>Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, i) => (
              <TableRow key={item.hash || i}>
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
                  <Badge variant={item.meio === 'E' ? 'default' : 'outline'}>
                    {item.meio === 'E' ? 'Eletrônico' : item.meio === 'D' ? 'Diário' : item.meio}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{item.nomeOrgao}</div>
                  <div className="text-xs text-muted-foreground">{item.nomeClasse}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{item.tipoComunicacao}</div>
                  {item.tipoDocumento && (
                    <div className="text-xs text-muted-foreground">Doc: {item.tipoDocumento}</div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

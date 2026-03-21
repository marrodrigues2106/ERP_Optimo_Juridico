import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Plus, Calendar as CalendarIcon } from 'lucide-react'

const mockProcesses = [
  {
    id: '1',
    court: 'TJ-RJ',
    number: '0012345-67.2023.8.19.0001',
    parties: 'João Silva x Empresa ABC',
    status: 'Aguardando Audiência',
    deadline: '2023-11-20',
  },
  {
    id: '2',
    court: 'TRF-2',
    number: '5009876-54.2022.4.02.5101',
    parties: 'Maria Souza x União Federal',
    status: 'Prazo para Recurso',
    deadline: '2023-11-15',
  },
  {
    id: '3',
    court: 'STJ',
    number: '1004567-89.2021.3.00.0000',
    parties: 'Empresa ABC x Estado do Rio',
    status: 'Em Análise',
    deadline: '2023-12-05',
  },
]

export default function ProcessManager() {
  const [processes] = useState(mockProcesses)
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = processes.filter(
    (p) =>
      p.number.includes(searchTerm) || p.parties.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Gestão de Processos</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Novo Processo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <CardTitle>Meus Processos</CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nº ou parte..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tribunal / Número</TableHead>
                    <TableHead>Partes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium text-primary">{p.number}</div>
                        <div className="text-xs text-muted-foreground">{p.court}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={p.parties}>
                        {p.parties}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-medium whitespace-nowrap">
                          {p.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" /> Próximos Prazos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processes
                  .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                  .map((p) => (
                    <div
                      key={`deadline-${p.id}`}
                      className="flex justify-between items-start p-3 border rounded-lg bg-slate-50"
                    >
                      <div className="flex-1 pr-2">
                        <div
                          className="font-semibold text-sm text-primary line-clamp-1"
                          title={p.parties}
                        >
                          {p.parties}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {p.status}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded shrink-0">
                        {new Date(p.deadline).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                Ver Calendário Completo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

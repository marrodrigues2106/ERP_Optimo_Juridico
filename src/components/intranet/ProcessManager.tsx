import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Search, Plus, Calendar as CalendarIcon, Trash2 } from 'lucide-react'
import { getLawsuits, createLawsuit, deleteLawsuit } from '@/services/lawsuits'
import { useRealtime } from '@/hooks/use-realtime'

export default function ProcessManager() {
  const [processes, setProcesses] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)

  const loadData = async () => {
    try {
      setProcesses(await getLawsuits())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('lawsuits', loadData)

  const filtered = processes.filter(
    (p) =>
      p.number.includes(searchTerm) || p.parties.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await createLawsuit(Object.fromEntries(fd.entries()))
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Gestão de Processos</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Novo Processo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Processo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Número do Processo</Label>
                <Input name="number" required placeholder="0000000-00.0000.0.00.0000" />
              </div>
              <div>
                <Label>Tribunal</Label>
                <Input name="court" required placeholder="Ex: TJ-RJ" />
              </div>
              <div>
                <Label>Partes (Cliente x Parte Contraria)</Label>
                <Input name="parties" required />
              </div>
              <div>
                <Label>Status</Label>
                <Input name="status" required placeholder="Ex: Aguardando Audiência" />
              </div>
              <div>
                <Label>Próximo Prazo</Label>
                <Input name="deadline" type="date" required />
              </div>
              <Button type="submit" className="w-full">
                Salvar Processo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
                    <TableHead></TableHead>
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
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteLawsuit(p.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
                {[...processes]
                  .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                  .slice(0, 5)
                  .map((p) => (
                    <div
                      key={`deadline-${p.id}`}
                      className="flex justify-between items-start p-3 border rounded-lg bg-slate-50"
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-semibold text-sm text-primary line-clamp-1">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

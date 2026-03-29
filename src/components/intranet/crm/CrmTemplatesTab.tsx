import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/services/crm_templates'
import { useRealtime } from '@/hooks/use-realtime'
import { Edit2, Trash2, Plus, Mail } from 'lucide-react'

export function CrmTemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setTemplates(await getTemplates())
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('communication_templates', loadData)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
    try {
      if (editingItem) {
        await updateTemplate(editingItem.id, data)
        toast({ title: 'Template atualizado' })
      } else {
        await createTemplate(data)
        toast({ title: 'Template criado' })
      }
      setOpen(false)
    } catch (err) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Excluir este template?')) await deleteTemplate(id)
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Templates de Comunicação</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="w-4 h-4 mr-2" /> Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Template' : 'Novo Template'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Nome do Template</Label>
                <Input
                  name="name"
                  required
                  defaultValue={editingItem?.name}
                  placeholder="Ex: Aviso de Audiência"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assunto do E-mail</Label>
                  <Input name="subject" required defaultValue={editingItem?.subject} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select name="type" defaultValue={editingItem?.type || 'Email'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Corpo (HTML permitido)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Variáveis: {'{{client_name}}'}, {'{{case_number}}'}, {'{{movement_description}}'}
                </p>
                <textarea
                  name="body_html"
                  required
                  defaultValue={editingItem?.body_html}
                  className="w-full h-48 p-3 border rounded-md font-mono text-sm"
                  placeholder="<p>Olá {{client_name}}...</p>"
                />
              </div>
              <Button type="submit" className="w-full">
                Salvar Template
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tmpl) => (
                <TableRow key={tmpl.id}>
                  <TableCell className="font-medium pl-6">{tmpl.name}</TableCell>
                  <TableCell>{tmpl.subject}</TableCell>
                  <TableCell>
                    <span className="flex items-center text-sm">
                      <Mail className="w-3 h-3 mr-1" /> {tmpl.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingItem(tmpl)
                        setOpen(true)
                      }}
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tmpl.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    Nenhum template cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

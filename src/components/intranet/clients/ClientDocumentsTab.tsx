import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  getClientDocuments,
  createClientDocument,
  deleteClientDocument,
} from '@/services/client_documents'
import { Plus, Trash2, FileText, Download } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export function ClientDocumentsTab({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const loadDocs = async () => {
    try {
      const data = await getClientDocuments(clientId)
      setDocs(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [clientId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const form = new FormData(e.currentTarget)
      form.append('client', clientId)
      const fileInput = form.get('file') as File
      if (!fileInput || fileInput.size === 0) form.delete('file')

      await createClientDocument(form)
      toast({ title: 'Documento adicionado!' })
      setOpen(false)
      loadDocs()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    try {
      await deleteClientDocument(id)
      toast({ title: 'Documento excluído' })
      loadDocs()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const getFileUrl = (doc: any) => {
    if (!doc.file) return null
    return pb.files.getUrl(doc, doc.file)
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg">Documentos Pessoais</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Documento
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {docs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto opacity-20 mb-2" />
            <p>Nenhum documento anexado.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.type}</TableCell>
                  <TableCell>{d.document_number || '-'}</TableCell>
                  <TableCell>
                    {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {d.file && (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={getFileUrl(d)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Baixar"
                        >
                          <Download className="w-4 h-4 text-primary" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(d.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Label>Tipo do Documento *</Label>
              <Select name="type" defaultValue="RG">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RG">RG</SelectItem>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="CNH">CNH</SelectItem>
                  <SelectItem value="Passport">Passaporte</SelectItem>
                  <SelectItem value="Other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número do Documento</Label>
              <Input name="document_number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Emissão</Label>
                <Input type="date" name="issue_date" />
              </div>
              <div>
                <Label>Data de Validade</Label>
                <Input type="date" name="expiry_date" />
              </div>
            </div>
            <div>
              <Label>Órgão Emissor</Label>
              <Input name="issuing_body" />
            </div>
            <div>
              <Label>Arquivo (PDF, Imagem)</Label>
              <Input type="file" name="file" accept=".pdf,image/*" />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Documento'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

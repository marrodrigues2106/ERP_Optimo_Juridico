import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Search, BookOpen, FileText, Bookmark, Plus, Trash2 } from 'lucide-react'
import { getKnowledgeItems, createKnowledgeItem, deleteKnowledgeItem } from '@/services/knowledge'
import { useRealtime } from '@/hooks/use-realtime'

export default function LibraryManager() {
  const [docs, setDocs] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)

  const loadData = async () => {
    try {
      setDocs(await getKnowledgeItems())
    } catch (e) {}
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('knowledge_items', loadData)

  const filtered = docs.filter((d) => d.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await createKnowledgeItem(Object.fromEntries(fd.entries()))
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Biblioteca & Conhecimento</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Novo Recurso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Material</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input name="title" required />
              </div>
              <div>
                <Label>Autor</Label>
                <Input name="author" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input name="category" placeholder="Ex: Livros, Artigos, Interno" />
              </div>
              <div>
                <Label>Tipo (PDF, Link, Doc)</Label>
                <Input name="type" />
              </div>
              <div>
                <Label>Link do Arquivo/Página</Label>
                <Input name="link" type="url" />
              </div>
              <Button type="submit" className="w-full">
                Salvar Material
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <CardTitle>Acervo Digital</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar materiais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between p-5 border rounded-xl hover:shadow-md hover:-translate-y-1 transition-all bg-white relative group"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteKnowledgeItem(doc.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
                <div className="flex items-start space-x-4 mb-4">
                  <div className="bg-secondary/10 p-3 rounded-full text-secondary shrink-0">
                    {doc.category === 'Livros' ? (
                      <BookOpen className="w-6 h-6" />
                    ) : doc.category === 'Artigos' ? (
                      <FileText className="w-6 h-6" />
                    ) : (
                      <Bookmark className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary line-clamp-2" title={doc.title}>
                      {doc.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {doc.category} • {doc.author}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {doc.type}
                  </span>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-secondary hover:text-primary"
                  >
                    <a href={doc.link} target="_blank" rel="noreferrer">
                      Acessar
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

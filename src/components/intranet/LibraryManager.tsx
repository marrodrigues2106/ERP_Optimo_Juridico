import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, BookOpen, FileText, Bookmark, Plus } from 'lucide-react'

const mockDocs = [
  {
    id: '1',
    title: 'Manual de Procedimentos Fiscais',
    category: 'Internal Publications',
    date: '2023-10-15',
    type: 'PDF',
  },
  {
    id: '2',
    title: 'Artigo: Nova Lei de Licitações',
    category: 'Articles',
    date: '2023-09-20',
    type: 'Link',
  },
  {
    id: '3',
    title: 'Direito Tributário Contemporâneo',
    category: 'Books',
    date: '2023-01-10',
    type: 'Book',
  },
  {
    id: '4',
    title: 'Jurisprudência STF 2023',
    category: 'Internal Publications',
    date: '2023-11-01',
    type: 'Doc',
  },
]

export default function LibraryManager() {
  const [docs] = useState(mockDocs)
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = docs.filter((d) => d.title.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Biblioteca & Conhecimento</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Novo Recurso
        </Button>
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
                className="flex flex-col justify-between p-5 border rounded-xl hover:shadow-md hover:-translate-y-1 transition-all bg-white"
              >
                <div className="flex items-start space-x-4 mb-4">
                  <div className="bg-secondary/10 p-3 rounded-full text-secondary shrink-0">
                    {doc.category === 'Books' ? (
                      <BookOpen className="w-6 h-6" />
                    ) : doc.category === 'Articles' ? (
                      <FileText className="w-6 h-6" />
                    ) : (
                      <Bookmark className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary line-clamp-2" title={doc.title}>
                      {doc.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">{doc.category}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {doc.type}
                  </span>
                  <Button variant="ghost" size="sm" className="text-secondary hover:text-primary">
                    Acessar
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

import { useState } from 'react'
import { useBlog, BlogPost } from '@/contexts/BlogContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Edit2 } from 'lucide-react'

export default function BlogManager() {
  const { posts, addPost, updatePost, deletePost } = useBlog()

  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')

  const resetForm = () => {
    setTitle('')
    setCategory('')
    setContent('')
    setImageUrl('')
    setVideoUrl('')
    setCurrentId(null)
    setIsEditing(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentId) {
      updatePost(currentId, { title, category, content, imageUrl, videoUrl })
    } else {
      addPost({ title, category, content, imageUrl, videoUrl })
    }
    resetForm()
  }

  const handleEdit = (post: BlogPost) => {
    setIsEditing(true)
    setCurrentId(post.id)
    setTitle(post.title)
    setCategory(post.category || '')
    setContent(post.content)
    setImageUrl(post.imageUrl || '')
    setVideoUrl(post.videoUrl || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="sticky top-28">
          <CardHeader>
            <CardTitle>{isEditing ? 'Editar Artigo' : 'Novo Artigo'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  placeholder="Ex: Direito Tributário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL da Imagem (Opcional)</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoUrl">URL do Vídeo (Opcional)</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Button type="submit" className="w-full">
                  {isEditing ? 'Salvar Alterações' : 'Publicar Artigo'}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Artigos Publicados ({posts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum artigo publicado ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border rounded-lg p-5 flex flex-col md:flex-row gap-4 justify-between bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-primary">{post.title}</h3>
                        {post.category && (
                          <span className="bg-secondary/20 text-secondary text-xs px-2 py-1 rounded-full">
                            {post.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{new Date(post.date).toLocaleDateString()}</span>
                        {(post.imageUrl || post.videoUrl) && <span>•</span>}
                        {post.imageUrl && <span>Tem imagem</span>}
                        {post.videoUrl && <span>Tem vídeo</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 md:flex-col justify-center">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(post)}
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deletePost(post.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

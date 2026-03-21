import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Edit2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getPosts, createPost, updatePost, deletePost } from '@/services/posts'
import { useRealtime } from '@/hooks/use-realtime'

export default function BlogManager() {
  const [posts, setPosts] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [published, setPublished] = useState(false)

  const loadData = async () => {
    try {
      setPosts(await getPosts())
    } catch (e) {}
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('posts', loadData)

  const resetForm = () => {
    setTitle('')
    setCategory('')
    setContent('')
    setImageUrl('')
    setVideoUrl('')
    setPublished(false)
    setCurrentId(null)
    setIsEditing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { title, category, content, imageUrl, videoUrl, published }
    if (currentId) {
      await updatePost(currentId, data)
    } else {
      await createPost(data)
    }
    resetForm()
  }

  const handleEdit = (post: any) => {
    setIsEditing(true)
    setCurrentId(post.id)
    setTitle(post.title)
    setCategory(post.category || '')
    setContent(post.content)
    setImageUrl(post.imageUrl || '')
    setVideoUrl(post.videoUrl || '')
    setPublished(!!post.published)
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo (Suporta parágrafos)</Label>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoUrl">URL do Vídeo (Opcional)</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="published" checked={published} onCheckedChange={setPublished} />
                <Label htmlFor="published">Publicado</Label>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Button type="submit" className="w-full">
                  {isEditing ? 'Salvar Alterações' : 'Criar Artigo'}
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
            <CardTitle>Artigos ({posts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum artigo encontrado.</p>
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
                        {!post.published && (
                          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">
                            Rascunho
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {post.content}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 md:flex-col justify-center">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(post)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => deletePost(post.id)}>
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

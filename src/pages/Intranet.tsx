import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlog, BlogPost } from '@/contexts/BlogContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Edit2, LogOut } from 'lucide-react'

export default function Intranet() {
  const { posts, addPost, updatePost, deletePost } = useBlog()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setImageUrl('')
    setVideoUrl('')
    setCurrentId(null)
    setIsEditing(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentId) {
      updatePost(currentId, { title, content, imageUrl, videoUrl })
    } else {
      addPost({ title, content, imageUrl, videoUrl })
    }
    resetForm()
  }

  const handleEdit = (post: BlogPost) => {
    setIsEditing(true)
    setCurrentId(post.id)
    setTitle(post.title)
    setContent(post.content)
    setImageUrl(post.imageUrl || '')
    setVideoUrl(post.videoUrl || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">Painel Intranet</h1>
            <p className="text-muted-foreground mt-1">Gerencie as publicações do blog</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>

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
                          <h3 className="font-semibold text-lg text-primary mb-1">{post.title}</h3>
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
      </div>
    </div>
  )
}

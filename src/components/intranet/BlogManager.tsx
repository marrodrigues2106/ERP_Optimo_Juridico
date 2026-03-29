import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Edit2, CheckCircle2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getPosts, createPost, updatePost, deletePost } from '@/services/posts'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

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
  const [actionType, setActionType] = useState<'draft' | 'publish' | 'unpublish' | 'update'>(
    'publish',
  )
  const { toast } = useToast()

  const isValid = title.trim().length > 0 && content.trim().length > 0

  const loadData = async () => {
    try {
      setPosts(await getPosts())
    } catch (e) {
      console.error(e)
    }
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
    setActionType('publish')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if ((actionType === 'publish' || actionType === 'update') && !isValid) {
      toast({ title: 'Preencha o título e o conteúdo.', variant: 'destructive' })
      return
    }

    let willPublish = published
    if (actionType === 'publish') willPublish = true
    if (actionType === 'unpublish') willPublish = false
    if (actionType === 'draft') willPublish = false

    const data = { title, category, content, imageUrl, videoUrl, published: willPublish }

    try {
      if (currentId) {
        await updatePost(currentId, data)
        if (actionType === 'publish' && !published) {
          toast({ title: 'Postagem publicada com sucesso!' })
        } else if (actionType === 'unpublish') {
          toast({ title: 'Postagem despublicada com sucesso.' })
        } else {
          toast({ title: 'Artigo atualizado com sucesso!' })
        }
      } else {
        await createPost(data)
        if (actionType === 'publish') {
          toast({ title: 'Postagem publicada com sucesso!' })
        } else {
          toast({ title: 'Rascunho salvo com sucesso!' })
        }
      }
      resetForm()
    } catch (err) {
      toast({ title: 'Erro ao salvar o artigo', variant: 'destructive' })
    }
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Expanded Editor Workspace spanning 3/4 on large screens */}
      <div className="lg:col-span-3">
        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>{isEditing ? 'Editor de Artigo' : 'Nova Publicação'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title" className="text-base">
                    Título Principal
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="text-lg py-6"
                    placeholder="Digite um título chamativo..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="category">Categoria / Área de Atuação</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    placeholder="Ex: Direito Tributário"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo do Artigo</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={15}
                  className="font-serif text-base leading-relaxed resize-y min-h-[300px]"
                  placeholder="Escreva o conteúdo do artigo aqui. Suporta separação por parágrafos."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL da Imagem de Capa (Opcional)</Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">URL do Vídeo (Opcional)</Label>
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Link do YouTube ou Vimeo"
                  />
                </div>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-end">
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm} className="sm:w-32">
                    Cancelar
                  </Button>
                )}
                {published ? (
                  <>
                    <Button
                      type="submit"
                      variant="secondary"
                      onClick={() => setActionType('unpublish')}
                      className="sm:w-32"
                    >
                      Despublicar
                    </Button>
                    <Button
                      type="submit"
                      onClick={() => setActionType('update')}
                      disabled={!isValid}
                      className="sm:w-48 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Salvar Alterações
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="submit"
                      variant="secondary"
                      onClick={() => setActionType('draft')}
                      className="sm:w-32"
                    >
                      Salvar Rascunho
                    </Button>
                    <Button
                      type="submit"
                      onClick={() => setActionType('publish')}
                      disabled={!isValid}
                      className="sm:w-48 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Publicar
                    </Button>
                  </>
                )}
              </div>{' '}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Condensed List spanning 1/4 on large screens */}
      <div className="lg:col-span-1">
        <Card className="sticky top-28">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-lg">Artigos Publicados ({posts.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {posts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                Nenhum artigo encontrado.
              </p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border rounded-md p-3 flex flex-col gap-2 bg-white hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <h3
                          className="font-medium text-sm text-slate-800 line-clamp-2 leading-tight"
                          title={post.title}
                        >
                          {post.title}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${post.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {post.published ? 'Publicado' : 'Rascunho'}
                        </span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[100px]">
                          {post.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end border-t pt-2 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleEdit(post)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deletePost(post.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

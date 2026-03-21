import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play } from 'lucide-react'
import { getPublishedPosts } from '@/services/posts'
import { useRealtime } from '@/hooks/use-realtime'

export default function Articles() {
  const [posts, setPosts] = useState<any[]>([])

  const loadData = async () => {
    try {
      setPosts(await getPublishedPosts())
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('posts', loadData)

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
            Nossos Artigos
          </h1>
          <div className="w-20 h-1 bg-secondary mx-auto rounded-full"></div>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground text-lg">
            Nenhum artigo publicado no momento. Volte em breve!
          </p>
        ) : (
          <div className="grid gap-12">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden border-border shadow-sm hover:shadow-lg transition-shadow"
              >
                {post.imageUrl && (
                  <div className="w-full h-64 md:h-80 overflow-hidden bg-slate-100">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}
                {post.videoUrl && !post.imageUrl && (
                  <div className="w-full h-64 md:h-80 bg-slate-800 flex items-center justify-center">
                    <a
                      href={post.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-secondary flex flex-col items-center gap-3 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                        <Play size={32} />
                      </div>
                      <span className="font-medium">Assistir ao Vídeo</span>
                    </a>
                  </div>
                )}
                <CardHeader className="pt-8 pb-4">
                  <div className="text-sm text-secondary font-medium tracking-wider uppercase mb-2">
                    {post.category && `${post.category} • `}
                    {new Date(post.created).toLocaleDateString()}
                  </div>
                  <CardTitle className="font-serif text-3xl md:text-4xl text-primary leading-tight">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-8">
                  <p className="text-gray-700 text-lg whitespace-pre-line leading-relaxed mb-6">
                    {post.content}
                  </p>
                  {post.videoUrl && post.imageUrl && (
                    <div className="pt-6 border-t mt-4">
                      <a
                        href={post.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-secondary hover:text-primary transition-colors font-medium"
                      >
                        <Play size={20} className="mr-2" /> Assista ao vídeo sobre este assunto
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

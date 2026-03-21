import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface BlogPost {
  id: string
  title: string
  category: string
  content: string
  imageUrl?: string
  videoUrl?: string
  date: string
}

interface BlogContextType {
  posts: BlogPost[]
  addPost: (post: Omit<BlogPost, 'id' | 'date'>) => void
  updatePost: (id: string, post: Partial<BlogPost>) => void
  deletePost: (id: string) => void
}

const BlogContext = createContext<BlogContextType | undefined>(undefined)

const initialPosts: BlogPost[] = [
  {
    id: '1',
    title: 'A Importância do Planejamento Sucessório',
    category: 'Planejamento Patrimonial',
    content:
      'O planejamento sucessório é um conjunto de estratégias que visa organizar a transferência do patrimônio de uma pessoa para seus herdeiros de forma eficiente e segura.\n\nEvitando conflitos familiares e minimizando o impacto tributário, essa prática tem ganhado cada vez mais espaço entre famílias de diferentes tamanhos patrimoniais. É essencial consultar um advogado especializado para a estruturação ideal.',
    imageUrl: 'https://img.usecurling.com/p/800/400?q=law%20books&color=blue',
    date: new Date().toISOString(),
  },
]

export function BlogProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts)

  const addPost = (post: Omit<BlogPost, 'id' | 'date'>) => {
    const newPost: BlogPost = {
      ...post,
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
    }
    setPosts([newPost, ...posts])
  }

  const updatePost = (id: string, updatedPost: Partial<BlogPost>) => {
    setPosts(posts.map((p) => (p.id === id ? { ...p, ...updatedPost } : p)))
  }

  const deletePost = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id))
  }

  return (
    <BlogContext.Provider value={{ posts, addPost, updatePost, deletePost }}>
      {children}
    </BlogContext.Provider>
  )
}

export function useBlog() {
  const context = useContext(BlogContext)
  if (context === undefined) {
    throw new Error('useBlog must be used within a BlogProvider')
  }
  return context
}

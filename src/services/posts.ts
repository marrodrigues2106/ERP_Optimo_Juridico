import pb from '@/lib/pocketbase/client'

export const getPosts = () => pb.collection('posts').getFullList({ sort: '-created' })
export const getPublishedPosts = () =>
  pb.collection('posts').getFullList({ filter: 'published = true', sort: '-created' })
export const createPost = (data: any) => pb.collection('posts').create(data)
export const updatePost = (id: string, data: any) => pb.collection('posts').update(id, data)
export const deletePost = (id: string) => pb.collection('posts').delete(id)

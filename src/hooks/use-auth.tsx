import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'

interface AuthContextType {
  user: any
  activeOrganization: string | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(pb.authStore.record)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (pb.authStore.isValid) {
          await pb.collection('users').authRefresh()
          setUser(pb.authStore.record)
        } else {
          pb.authStore.clear()
          setUser(null)
        }
      } catch (error) {
        pb.authStore.clear()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrganization: user?.active_organization || null,
        isAuthenticated: !!user,
        signIn,
        signOut,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'

export default function Login() {
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setIsLoading(true)
    if (email && password) {
      const { error } = await signIn(email, password)
      if (error) {
        setErrorMsg('Invalid credentials')
      } else {
        navigate('/intranet')
      }
    }
    setIsLoading(false)
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setIsLoading(true)

    if (email) {
      try {
        await pb.collection('users').requestPasswordReset(email)
      } catch (error) {
        // We intentionally ignore errors to prevent email enumeration attacks
      }

      // Always show success message for security purposes
      setSuccessMsg(
        'Se o e-mail estiver cadastrado, você receberá as instruções para sua nova senha em breve.',
      )
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 py-20 px-4">
      <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-border">
        {view === 'login' ? (
          <>
            <h1 className="text-3xl font-serif font-bold text-primary mb-2 text-center">
              Acesso Restrito
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Área exclusiva para membros do escritório.
            </p>
            <form onSubmit={handleLogin} className="space-y-6">
              {errorMsg && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center font-medium">
                  {errorMsg}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot')
                      setErrorMsg('')
                    }}
                    className="text-sm text-secondary hover:text-primary transition-colors font-medium"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-serif font-bold text-primary mb-2 text-center">
              Recuperar Senha
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Informe seu e-mail para receber as instruções de recuperação.
            </p>
            <form onSubmit={handleForgot} className="space-y-6">
              {successMsg && (
                <div className="bg-green-50 text-green-700 text-sm p-4 rounded-md text-center font-medium border border-green-200">
                  {successMsg}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setView('login')
                    setSuccessMsg('')
                    setErrorMsg('')
                  }}
                  className="w-full"
                >
                  Voltar para o login
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

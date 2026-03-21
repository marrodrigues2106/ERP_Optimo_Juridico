import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (email && password) {
      const { error } = await signIn(email, password)
      if (error) {
        setErrorMsg('Invalid credentials')
      } else {
        navigate('/intranet')
      }
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 py-20 px-4">
      <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-border">
        <h1 className="text-3xl font-serif font-bold text-primary mb-2 text-center">
          Acesso Restrito
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Área exclusiva para membros do escritório.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full h-11 text-base">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}

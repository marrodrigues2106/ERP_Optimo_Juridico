import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setErrorMsg('Token de recuperação inválido ou ausente. O link pode estar quebrado.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!token) {
      setErrorMsg('Token ausente.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMsg('As senhas não coincidem.')
      return
    }

    if (password.length < 8) {
      setErrorMsg('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setIsLoading(true)

    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      toast({
        title: 'Sucesso',
        description: 'Sua senha foi alterada com sucesso! Você já pode fazer login.',
      })
      navigate('/login')
    } catch (error: any) {
      setErrorMsg('Ocorreu um erro ao redefinir a senha. O link pode ter expirado ou ser inválido.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 py-20 px-4">
      <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-border">
        <h1 className="text-3xl font-serif font-bold text-primary mb-2 text-center">
          Redefinir Senha
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Crie uma nova senha para acessar sua conta.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center font-medium">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              disabled={!token || isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">Confirmar Nova Senha</Label>
            <Input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              disabled={!token || isLoading}
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full h-11 text-base" disabled={!token || isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Voltar para o login
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

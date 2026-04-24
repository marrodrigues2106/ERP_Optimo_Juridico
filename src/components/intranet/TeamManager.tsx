import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Users, Shield, Briefcase, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TeamManager() {
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [selectedUser, setSelectedUser] = useState('')
  const [role, setRole] = useState('Advogado')
  const [oabNumber, setOabNumber] = useState('')
  const [doTerms, setDoTerms] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const orgFilter = pb.authStore.record?.active_organization
        ? `organization = "${pb.authStore.record.active_organization}"`
        : ''

      const collabsRes = await pb.collection('collaborators').getFullList({
        filter: orgFilter,
        expand: 'user',
        sort: 'name',
      })
      setCollaborators(collabsRes)

      const usersRes = await pb.collection('users').getFullList({
        sort: 'name',
      })

      const collabUserIds = new Set(collabsRes.map((c) => c.user).filter(Boolean))
      const availableUsers = usersRes.filter((u) => !collabUserIds.has(u.id))
      setUsers(availableUsers)
    } catch (err: any) {
      toast({ title: 'Erro ao carregar equipe', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) {
      return toast({ title: 'Selecione um usuário', variant: 'destructive' })
    }
    setSaving(true)
    try {
      const user = users.find((u) => u.id === selectedUser)
      const name = user?.fullName || user?.name || user?.email
      const org = pb.authStore.record?.active_organization

      await pb.collection('collaborators').create({
        name,
        role,
        email: user?.email,
        user: selectedUser,
        oabNumber,
        organization: org,
      })

      if (doTerms.trim()) {
        const terms = doTerms
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        for (const t of terms) {
          await pb.collection('termos_monitorados').create({
            termo: t,
            tipo_termo: role === 'Advogado' ? 'Nome Advogado' : 'Livre',
            usuario_id: selectedUser,
            ativo: true,
            search_method: 'palavra-chave',
          })
        }
      }

      toast({ title: 'Membro adicionado com sucesso!' })
      setIsAddModalOpen(false)
      setSelectedUser('')
      setRole('Advogado')
      setOabNumber('')
      setDoTerms('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar membro', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover este membro da equipe?')) return
    try {
      await pb.collection('collaborators').delete(id)
      toast({ title: 'Membro removido' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Users className="w-8 h-8" /> Equipe
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie os colaboradores do escritório e suas permissões.
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Membro
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collaborators.map((c) => (
            <Card
              key={c.id}
              className="hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border text-slate-400">
                      {c.expand?.user?.avatar ? (
                        <img
                          src={pb.files.getUrl(c.expand.user, c.expand.user.avatar)}
                          className="w-full h-full rounded-full object-cover"
                          alt="Avatar"
                        />
                      ) : (
                        <Users className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{c.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Shield className="w-3 h-3" /> {c.role || 'Colaborador'}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                {c.email && (
                  <div className="flex items-center gap-2">
                    <div className="w-4" /> {c.email}
                  </div>
                )}
                {c.oabNumber && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> OAB: {c.oabNumber}
                  </div>
                )}
                <div className="pt-4 flex justify-between items-center border-t mt-4">
                  <Link
                    to={`/intranet/equipe/${c.id}`}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Ver Detalhes
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {collaborators.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed rounded-xl text-slate-500">
              Nenhum membro cadastrado na equipe.
            </div>
          )}
        </div>
      )}

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Selecionar Usuário (Sistema)</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário existente..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                  {users.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhum usuário disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                O usuário deve estar previamente cadastrado no sistema.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cargo / Função</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Advogado">Advogado</SelectItem>
                  <SelectItem value="Associado">Associado</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número OAB (Opcional)</Label>
              <Input
                value={oabNumber}
                onChange={(e) => setOabNumber(e.target.value)}
                placeholder="Ex: 12345/SP"
              />
            </div>

            <div className="space-y-2">
              <Label>Termos de Monitoramento (Diário Oficial)</Label>
              <Input
                value={doTerms}
                onChange={(e) => setDoTerms(e.target.value)}
                placeholder="Ex: Nome Completo, Razão Social (separados por vírgula)"
              />
              <p className="text-xs text-slate-500">
                Termos inseridos aqui serão automaticamente cadastrados para monitoramento.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar e Configurar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

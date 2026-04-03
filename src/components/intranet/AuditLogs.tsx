import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRealtime } from '@/hooks/use-realtime'
import { Activity, ShieldAlert, Search } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export default function AuditLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [userFilter, setUserFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  useEffect(() => {
    if (!isAdmin) {
      setAccessDenied(true)
      return
    }

    const fetchUsers = async () => {
      try {
        const res = await pb.collection('users').getFullList({ sort: 'name' })
        setUsers(res)
      } catch (e) {
        console.error('Failed to fetch users', e)
      }
    }
    fetchUsers()
  }, [isAdmin])

  const loadData = async () => {
    if (!isAdmin) return
    try {
      let filter = ''
      const filters = []

      if (userFilter !== 'all') {
        filters.push(`user = '${userFilter}'`)
      }
      if (dateFilter) {
        const start = new Date(dateFilter)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateFilter)
        end.setHours(23, 59, 59, 999)
        filters.push(`created >= '${start.toISOString()}' && created <= '${end.toISOString()}'`)
      }

      if (filters.length > 0) {
        filter = filters.join(' && ')
      }

      const records = await pb.collection('audit_logs').getFullList({
        sort: '-created',
        expand: 'user',
        filter,
        limit: 100,
      })
      setLogs(records)
    } catch (e: any) {
      if (e.status === 403 || e.status === 404) {
        setAccessDenied(true)
      }
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [userFilter, dateFilter, isAdmin])

  useRealtime('audit_logs', loadData)

  if (accessDenied) {
    return (
      <Card className="border-red-200 shadow-sm bg-red-50/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Restrito</h2>
          <p className="text-red-600 max-w-md">
            Você não tem permissão para visualizar os logs de auditoria do sistema. Esta área é
            restrita a administradores.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <CardTitle className="text-xl">Logs de Auditoria do Sistema</CardTitle>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-8 h-9 text-sm w-40 bg-white"
            />
          </div>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="h-9 w-[200px] bg-white">
              <SelectValue placeholder="Todos os usuários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.fullName || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="pl-6 w-[200px]">Data e Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Módulo (Collection)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  Nenhum log encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-6 whitespace-nowrap text-sm text-slate-600">
                    {new Date(log.created).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-medium text-sm text-slate-800">
                    {log.expand?.user?.name ||
                      log.expand?.user?.fullName ||
                      log.expand?.user?.email ||
                      'Sistema'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.action === 'create'
                          ? 'bg-green-100 text-green-700'
                          : log.action === 'update'
                            ? 'bg-blue-100 text-blue-700'
                            : log.action === 'delete' || log.action === 'soft_delete'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-slate-500">
                    {log.collection_name}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

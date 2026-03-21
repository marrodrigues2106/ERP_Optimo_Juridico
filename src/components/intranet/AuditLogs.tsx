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
import { getAuditLogs } from '@/services/audit'
import { useRealtime } from '@/hooks/use-realtime'
import { Activity } from 'lucide-react'

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([])

  const loadData = async () => {
    try {
      setLogs(await getAuditLogs())
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('audit_logs', loadData)

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="bg-slate-50 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <CardTitle className="text-xl">Logs de Auditoria do Sistema</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="pl-6">Data e Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead className="hidden md:table-cell">ID Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum log registrado ainda.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-6 whitespace-nowrap text-sm">
                    {new Date(log.created).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.expand?.user?.fullName || log.expand?.user?.email || 'Sistema'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${
                        log.action === 'create'
                          ? 'bg-green-100 text-green-700'
                          : log.action === 'update'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm text-slate-700">
                    {log.collection_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono hidden md:table-cell">
                    {log.record_id}
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

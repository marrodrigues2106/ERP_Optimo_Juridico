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
import { useRealtime } from '@/hooks/use-realtime'
import { Activity } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([])

  const loadData = async () => {
    try {
      const records = await pb.collection('logs_processamento').getFullList({
        sort: '-created',
        limit: 50,
      })
      setLogs(records)
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('logs_processamento', loadData)

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
              <TableHead>Etapa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum log de processamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-6 whitespace-nowrap text-sm">
                    {new Date(log.data_hora || log.created).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium text-sm text-slate-700">
                    {log.etapa || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${
                        log.status === 'Sucesso' || log.status === 'Info'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{log.mensagem}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

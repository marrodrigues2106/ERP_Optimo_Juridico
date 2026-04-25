import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Save,
  Loader2,
  Mail,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { getSettingByKey, setSettingByKey } from '@/services/settings'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'

export default function IntegrationsManager() {
  const { toast } = useToast()
  const { user } = useAuth()

  const [resendApiKey, setResendApiKey] = useState('')
  const [resendFromEmail, setResendFromEmail] = useState('onboarding@resend.dev')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isPurging, setIsPurging] = useState(false)
  const [purgeSelection, setPurgeSelection] = useState({
    crm_interactions: false,
    tasks: false,
    agenda_events: false,
  })

  const [syncingDou, setSyncingDou] = useState(false)
  const [syncingPje, setSyncingPje] = useState(false)
  const [lastDouSync, setLastDouSync] = useState<string | null>(null)
  const [lastPjeSync, setLastPjeSync] = useState<string | null>(null)

  const isAuthorized = user?.role === 'admin' || user?.role === 'manager' || user?.isAdmin

  useEffect(() => {
    if (!isAuthorized) return

    const loadSettings = async () => {
      try {
        const keyRecord = await getSettingByKey('resend_api_key')
        if (keyRecord && keyRecord.value !== 'pending') setResendApiKey(keyRecord.value)
        const fromRecord = await getSettingByKey('resend_from_email')
        if (fromRecord) setResendFromEmail(fromRecord.value)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }

      try {
        const douLog = await pb.collection('logs_processamento').getList(1, 1, { sort: '-created' })
        if (douLog.items.length > 0) setLastDouSync(douLog.items[0].created)
      } catch {
        /* intentionally ignored */
      }

      try {
        const pjeLog = await pb
          .collection('system_logs')
          .getList(1, 1, { filter: 'module~"pje" || module~"PJe"', sort: '-created' })
        if (pjeLog.items.length > 0) setLastPjeSync(pjeLog.items[0].created)
      } catch {
        /* intentionally ignored */
      }
    }
    loadSettings()
  }, [isAuthorized])

  const handleSyncDou = async () => {
    setSyncingDou(true)
    try {
      await pb.send('/backend/v1/sync/dou', { method: 'POST' })
      toast({
        title:
          'Sincronização iniciada com sucesso. Os resultados aparecerão em breve no painel de notificações.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao iniciar sincronização. Verifique os logs do sistema.',
        variant: 'destructive',
      })
    } finally {
      setSyncingDou(false)
    }
  }

  const handleSyncPje = async () => {
    setSyncingPje(true)
    try {
      await pb.send('/backend/v1/sync/pje', { method: 'POST' })
      toast({
        title:
          'Sincronização iniciada com sucesso. Os resultados aparecerão em breve no painel de notificações.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao iniciar sincronização. Verifique os logs do sistema.',
        variant: 'destructive',
      })
    } finally {
      setSyncingPje(false)
    }
  }

  const handleTestEmail = async () => {
    setSaving(true)
    try {
      const res = await pb.send('/backend/v1/email/test', {
        method: 'POST',
        body: JSON.stringify({ resend_api_key: resendApiKey, resend_from_email: resendFromEmail }),
      })

      if (res.error) throw new Error(res.message || 'Erro de conexão')

      toast({ title: 'Conexão com Resend estabelecida com sucesso!' })
      return true
    } catch (err: any) {
      toast({
        title: 'Falha na conexão: Verifique sua Chave API.',
        variant: 'destructive',
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await setSettingByKey('resend_api_key', resendApiKey.trim() || 'pending')
      await setSettingByKey('resend_from_email', resendFromEmail.trim())
      toast({ title: 'Configurações de e-mail atualizadas!' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handlePurgeData = async () => {
    const collections = Object.entries(purgeSelection)
      .filter(([_, isSelected]) => isSelected)
      .map(([col]) => col)

    if (collections.length === 0) {
      toast({ title: 'Selecione ao menos um módulo para limpeza.', variant: 'destructive' })
      return
    }

    setIsPurging(true)
    try {
      const res = await pb.send('/backend/v1/admin/purge-data', {
        method: 'POST',
        body: JSON.stringify({ collections }),
      })
      if (res.error) throw new Error(res.message)
      toast({
        title: 'Limpeza concluída!',
        description: `${res.deletedCount} registros removidos com sucesso.`,
      })
      setPurgeSelection({ crm_interactions: false, tasks: false, agenda_events: false })
    } catch (err: any) {
      toast({ title: 'Erro na limpeza de dados', description: err.message, variant: 'destructive' })
    } finally {
      setIsPurging(false)
    }
  }

  if (!isAuthorized) return null

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Zap className="w-6 h-6" /> Integrações
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie integrações externas, envio de e-mails e outras configurações avançadas.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
      ) : (
        <>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" /> Resend API (Envio de E-mails)
              </CardTitle>
              <CardDescription className="text-base">
                Configure a chave de API do Resend para o envio de alertas e comunicações do
                sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Chave da API (Resend)</Label>
                    <Input
                      type="password"
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder="re_..."
                      className="text-base py-6"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">E-mail Remetente (From)</Label>
                    <Input
                      type="email"
                      value={resendFromEmail}
                      onChange={(e) => setResendFromEmail(e.target.value)}
                      placeholder="exemplo@seudominio.com.br"
                      className="text-base py-6"
                    />
                    <p className="text-sm text-slate-500">
                      O domínio deve estar verificado no painel do Resend. Use onboarding@resend.dev
                      para testes se não tiver um domínio verificado.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={saving}
                    className="py-6 px-6 text-base font-medium"
                  >
                    <ShieldCheck className="w-5 h-5 mr-2" /> Testar Conexão
                  </Button>
                  <Button type="submit" disabled={saving} className="py-6 px-8 text-base font-bold">
                    {saving ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5 mr-2" />
                    )}
                    Salvar Configurações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Monitoramento Automático */}
          <Card className="border-slate-200 shadow-sm mt-8">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-primary" /> Monitoramento Automático
              </CardTitle>
              <CardDescription className="text-base">
                Acione manualmente a sincronização de diários oficiais (DOU) e processos eletrônicos
                (PJe). Os termos monitorados (incluindo OAB e UF) serão respeitados durante a busca.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DOU Sync */}
                <div className="border rounded-xl p-6 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Diário Oficial da União (DOU)
                    </h3>
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-sm text-slate-600">
                    Busca por novas publicações no DOU baseadas nos termos ativos.
                  </p>
                  <div className="flex items-center text-xs text-slate-500 mb-4">
                    <Clock className="w-4 h-4 mr-1" />
                    Última sincronização:{' '}
                    {lastDouSync ? new Date(lastDouSync).toLocaleString('pt-BR') : 'Desconhecida'}
                  </div>
                  <Button onClick={handleSyncDou} disabled={syncingDou} className="w-full">
                    {syncingDou ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sincronizar DOU Agora
                  </Button>
                </div>

                {/* PJe Sync */}
                <div className="border rounded-xl p-6 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Processo Judicial Eletrônico (PJe)
                    </h3>
                    <Zap className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-sm text-slate-600">
                    Sincroniza andamentos e comunicações dos tribunais configurados.
                  </p>
                  <div className="flex items-center text-xs text-slate-500 mb-4">
                    <Clock className="w-4 h-4 mr-1" />
                    Última sincronização:{' '}
                    {lastPjeSync ? new Date(lastPjeSync).toLocaleString('pt-BR') : 'Desconhecida'}
                  </div>
                  <Button onClick={handleSyncPje} disabled={syncingPje} className="w-full">
                    {syncingPje ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sincronizar PJe Agora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 shadow-sm mt-8">
            <CardHeader className="bg-red-50/50 rounded-t-xl border-b border-red-100">
              <CardTitle className="text-2xl flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-6 h-6" /> Zona de Perigo (Limpeza de Dados)
              </CardTitle>
              <CardDescription className="text-base text-red-600/80">
                Atenção: Ações realizadas nesta seção são irreversíveis e afetam o ambiente de
                produção da sua organização.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-slate-600 font-medium">
                  Selecione os módulos operacionais para limpar o histórico (Ex: Preparação para
                  início de produção oficial):
                </p>

                <div className="flex items-center space-x-3 bg-red-50/30 p-3 rounded-lg border border-red-100">
                  <Checkbox
                    id="purge-crm"
                    checked={purgeSelection.crm_interactions}
                    onCheckedChange={(c) =>
                      setPurgeSelection((prev) => ({ ...prev, crm_interactions: c === true }))
                    }
                  />
                  <Label htmlFor="purge-crm" className="text-base font-medium cursor-pointer">
                    Atendimentos e Interações (CRM)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 bg-red-50/30 p-3 rounded-lg border border-red-100">
                  <Checkbox
                    id="purge-tasks"
                    checked={purgeSelection.tasks}
                    onCheckedChange={(c) =>
                      setPurgeSelection((prev) => ({ ...prev, tasks: c === true }))
                    }
                  />
                  <Label htmlFor="purge-tasks" className="text-base font-medium cursor-pointer">
                    Atividades e Kanban (Tasks)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 bg-red-50/30 p-3 rounded-lg border border-red-100">
                  <Checkbox
                    id="purge-agenda"
                    checked={purgeSelection.agenda_events}
                    onCheckedChange={(c) =>
                      setPurgeSelection((prev) => ({ ...prev, agenda_events: c === true }))
                    }
                  />
                  <Label htmlFor="purge-agenda" className="text-base font-medium cursor-pointer">
                    Eventos e Prazos (Agenda Events)
                  </Label>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="mt-4"
                    disabled={!Object.values(purgeSelection).some(Boolean) || isPurging}
                  >
                    {isPurging ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Purgar Dados Selecionados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação apagará <strong>todos</strong> os registros dos módulos selecionados
                      para a organização ativa. O histórico será completamente destruído e esta
                      operação <strong>não pode ser desfeita</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar operação</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handlePurgeData}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sim, apagar dados permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

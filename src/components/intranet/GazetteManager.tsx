import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Trash2, Activity, Link as LinkIcon } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'

export default function GazetteManager() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('dashboard')

  const [occurrences, setOccurrences] = useState<any[]>([])
  const [searchOcc, setSearchOcc] = useState('')

  const [terms, setTerms] = useState<any[]>([])
  const [newTerm, setNewTerm] = useState('')
  const [newType, setNewType] = useState('palavra-chave')
  const [newObs, setNewObs] = useState('')

  const [config, setConfig] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])

  const loadData = async () => {
    try {
      const occ = await pb
        .collection('ocorrencias_dou')
        .getFullList({ expand: 'publicacao_id,termo_id', sort: '-created' })
      setOccurrences(occ)

      const tms = await pb.collection('termos_monitorados').getFullList({ sort: '-created' })
      setTerms(tms)

      if (user?.role === 'admin' || user?.isAdmin) {
        const lgs = await pb
          .collection('logs_processamento')
          .getFullList({ expand: 'publicacao_id', sort: '-created' })
        setLogs(lgs)
      }

      if (user?.id) {
        const cfgs = await pb
          .collection('configuracoes_alerta')
          .getFullList({ filter: `usuario_id="${user.id}"` })
        if (cfgs.length > 0) setConfig(cfgs[0])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])
  useRealtime('ocorrencias_dou', loadData)
  useRealtime('logs_processamento', loadData)

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTerm || !user?.id) return
    try {
      await pb.collection('termos_monitorados').create({
        termo: newTerm,
        tipo_termo: newType,
        usuario_id: user.id,
        ativo: true,
        observacoes: newObs,
        data_cadastro: new Date().toISOString(),
      })
      setNewTerm('')
      setNewObs('')
      setNewType('palavra-chave')
      toast({ title: 'Termo adicionado com sucesso' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao adicionar', variant: 'destructive' })
    }
  }

  const toggleTerm = async (t: any) => {
    try {
      await pb.collection('termos_monitorados').update(t.id, { ativo: !t.ativo })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const deleteTerm = async (id: string) => {
    try {
      await pb.collection('termos_monitorados').delete(id)
      loadData()
      toast({ title: 'Termo removido' })
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveConfig = async (tipo_notificacao: string, frequencia: string, ativo: boolean) => {
    try {
      if (config?.id) {
        await pb
          .collection('configuracoes_alerta')
          .update(config.id, { tipo_notificacao, frequencia, ativo })
      } else {
        await pb
          .collection('configuracoes_alerta')
          .create({ usuario_id: user?.id, tipo_notificacao, frequencia, ativo })
      }
      toast({ title: 'Configurações salvas' })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const filteredOcc = occurrences.filter((o) =>
    searchOcc
      ? o.expand?.publicacao_id?.texto_bruto?.toLowerCase().includes(searchOcc.toLowerCase()) ||
        o.expand?.termo_id?.termo?.toLowerCase().includes(searchOcc.toLowerCase())
      : true,
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary tracking-tight">Monitoramento DOU</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 bg-white border border-border">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="termos">Termos Monitorados</TabsTrigger>
          <TabsTrigger value="alertas">Config. Alertas</TabsTrigger>
          {(user?.role === 'admin' || user?.isAdmin) && (
            <TabsTrigger value="logs">Logs & Auditoria</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card className="bg-white border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50">
              <CardTitle className="text-lg text-primary">Ocorrências Recentes</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ocorrências..."
                  value={searchOcc}
                  onChange={(e) => setSearchOcc(e.target.value)}
                  className="pl-8 bg-white border-border"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="pl-6">Data</TableHead>
                    <TableHead>Termo</TableHead>
                    <TableHead>Órgão / Seção</TableHead>
                    <TableHead>Contexto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOcc.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma ocorrência encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOcc.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="pl-6 whitespace-nowrap text-sm text-foreground">
                          {new Date(o.data_deteccao).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          <Badge
                            variant="secondary"
                            className="bg-secondary text-primary hover:bg-secondary/80 border-transparent"
                          >
                            {o.expand?.termo_id?.termo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          <div className="font-semibold text-primary">
                            {o.expand?.publicacao_id?.orgao}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {o.expand?.publicacao_id?.secao}
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-sm text-foreground max-w-xs truncate"
                          title={o.trecho_encontrado}
                        >
                          {o.trecho_encontrado}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              o.status_alerta === 'enviado'
                                ? 'bg-primary text-white hover:bg-primary/80'
                                : 'bg-muted-foreground text-white hover:bg-muted-foreground/80'
                            }
                          >
                            {o.status_alerta}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {o.expand?.publicacao_id?.url_origem && (
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="text-primary hover:bg-secondary/50 hover:text-primary"
                            >
                              <a
                                href={o.expand?.publicacao_id?.url_origem}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <LinkIcon className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="termos">
          <Card className="bg-white border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Gerenciar Termos de Busca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                onSubmit={handleAddTerm}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-background p-4 rounded-lg border border-border/50"
              >
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-primary">Novo Termo</Label>
                  <Input
                    className="bg-white"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="Ex: Moraes Rodrigues"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-primary">Tipo</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="palavra-chave">Palavra-chave</SelectItem>
                      <SelectItem value="frase">Frase Exata</SelectItem>
                      <SelectItem value="regex">Expressão Regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </form>

              <div className="space-y-3 mt-4">
                {terms.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <Switch checked={t.ativo} onCheckedChange={() => toggleTerm(t)} />
                      <div>
                        <p className="font-bold text-primary">{t.termo}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {t.tipo_termo}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteTerm(t.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {terms.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                    Nenhum termo cadastrado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card className="bg-white border-border shadow-sm max-w-md">
            <CardHeader>
              <CardTitle className="text-primary">Preferências de Notificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <Label className="text-primary font-medium">Receber Alertas</Label>
                <Switch
                  checked={config?.ativo ?? false}
                  onCheckedChange={(v) =>
                    handleSaveConfig(
                      config?.tipo_notificacao || 'app',
                      config?.frequencia || 'diario',
                      v,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-medium">Meio de Notificação</Label>
                <Select
                  value={config?.tipo_notificacao || 'app'}
                  onValueChange={(v) =>
                    handleSaveConfig(v, config?.frequencia || 'diario', config?.ativo ?? false)
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app">Notificação no App</SelectItem>
                    <SelectItem value="email">Por E-mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-medium">Frequência</Label>
                <Select
                  value={config?.frequencia || 'diario'}
                  onValueChange={(v) =>
                    handleSaveConfig(config?.tipo_notificacao || 'app', v, config?.ativo ?? false)
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imediato">Imediato (Logo que detectado)</SelectItem>
                    <SelectItem value="diario">Resumo Diário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {(user?.role === 'admin' || user?.isAdmin) && (
          <TabsContent value="logs">
            <Card className="bg-white border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Activity className="w-5 h-5" /> Logs de Processamento DOU
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-6">Data/Hora</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Publicação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6 text-sm whitespace-nowrap text-foreground">
                          {new Date(l.data_hora).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm font-bold text-primary">{l.etapa}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              l.status === 'Sucesso'
                                ? 'text-primary border-primary bg-secondary/30'
                                : 'text-destructive border-destructive bg-destructive/10'
                            }
                          >
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-sm text-foreground max-w-sm truncate"
                          title={l.mensagem}
                        >
                          {l.mensagem}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {l.expand?.publicacao_id?.titulo || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum log registrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

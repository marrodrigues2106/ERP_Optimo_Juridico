import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchTab } from './comunicacoes/SearchTab'
import { HistoryList } from './comunicacoes/HistoryList'
import { SettingsForm } from './comunicacoes/SettingsForm'
import { useAuth } from '@/hooks/use-auth'

export function ComunicacoesManager() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.isAdmin

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comunicações (PJe)</h1>
        <p className="text-muted-foreground">
          Busque e monitore comunicações judiciais integradas ao Comunica PJe.
        </p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList>
          <TabsTrigger value="search">Nova Busca</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          {isAdmin && <TabsTrigger value="settings">Configurações</TabsTrigger>}
        </TabsList>
        <TabsContent value="search" className="mt-4">
          <SearchTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryList />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="settings" className="mt-4">
            <SettingsForm />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

import { Link, Outlet, useLocation } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ComunicaPjeLayout() {
  const location = useLocation()
  const path = location.pathname

  let currentTab = 'search'
  if (path.endsWith('/historico')) currentTab = 'history'
  if (path.endsWith('/configuracoes')) currentTab = 'settings'

  return (
    <div className="flex flex-col gap-6 w-full h-full max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comunicações PJe</h1>
        <p className="text-muted-foreground">
          Consulta e gerenciamento do Diário de Justiça Eletrônico Nacional.
        </p>
      </div>

      <Tabs value={currentTab} className="w-full">
        <TabsList>
          <TabsTrigger value="search" asChild>
            <Link to="/intranet/comunicacoes">Busca</Link>
          </TabsTrigger>
          <TabsTrigger value="history" asChild>
            <Link to="/intranet/comunicacoes/historico">Histórico</Link>
          </TabsTrigger>
          <TabsTrigger value="settings" asChild>
            <Link to="/intranet/comunicacoes/configuracoes">Configurações</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-2 flex-1">
        <Outlet />
      </div>
    </div>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Index from './pages/Index'
import Specialty from './pages/Specialty'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Intranet from './pages/Intranet'
import Articles from './pages/Articles'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './hooks/use-auth'

import Dashboard from '@/components/intranet/Dashboard'
import BlogManager from '@/components/intranet/BlogManager'
import ProcessManager from '@/components/intranet/ProcessManager'
import ProcessDetail from '@/components/intranet/ProcessDetail'
import FinanceManager from '@/components/intranet/FinanceManager'
import LibraryManager from '@/components/intranet/LibraryManager'
import CrmManager from '@/components/intranet/CrmManager'
import ClientDetail from '@/components/intranet/ClientDetail'
import TeamManager from '@/components/intranet/TeamManager'
import CollaboratorDetail from '@/components/intranet/CollaboratorDetail'
import UsersManager from '@/components/intranet/UsersManager'
import ProfileManager from '@/components/intranet/ProfileManager'
import AgendaManager from '@/components/intranet/AgendaManager'
import AuditLogs from '@/components/intranet/AuditLogs'
import PublicacoesManager from '@/components/intranet/PublicacoesManager'
import GazetteManager from '@/components/intranet/GazetteManager'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="especialidade/:id" element={<Specialty />} />
            <Route path="artigos" element={<Articles />} />
            <Route path="login" element={<Login />} />

            <Route
              path="intranet"
              element={
                <ProtectedRoute>
                  <Intranet />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="publicacoes" element={<PublicacoesManager />} />
              <Route path="diarios" element={<GazetteManager />} />
              <Route path="processos" element={<ProcessManager />} />
              <Route path="processos/:id" element={<ProcessDetail />} />
              <Route path="clientes/:id" element={<ClientDetail />} />
              <Route path="equipe/:id" element={<CollaboratorDetail />} />
              <Route path="crm" element={<CrmManager />} />
              <Route path="agenda" element={<AgendaManager />} />
              <Route path="finance" element={<FinanceManager />} />
              <Route path="library" element={<LibraryManager />} />
              <Route path="blog" element={<BlogManager />} />
              <Route path="team" element={<TeamManager />} />
              <Route path="users" element={<UsersManager />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route path="profile" element={<ProfileManager />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

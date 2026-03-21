import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Index from './pages/Index'
import Specialty from './pages/Specialty'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Intranet from './pages/Intranet'
import Articles from './pages/Articles'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './hooks/use-auth'

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
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

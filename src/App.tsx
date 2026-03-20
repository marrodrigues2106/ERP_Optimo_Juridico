import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Index from './pages/Index'
import Specialty from './pages/Specialty'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Index />} />
        <Route path="especialidade/:id" element={<Specialty />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App

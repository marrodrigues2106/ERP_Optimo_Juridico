import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LogOut,
  LayoutDashboard,
  FileText,
  DollarSign,
  BookOpen,
  Users,
  Briefcase,
} from 'lucide-react'

import BlogManager from '@/components/intranet/BlogManager'
import ProcessManager from '@/components/intranet/ProcessManager'
import FinanceManager from '@/components/intranet/FinanceManager'
import LibraryManager from '@/components/intranet/LibraryManager'
import CrmManager from '@/components/intranet/CrmManager'
import TeamManager from '@/components/intranet/TeamManager'

export default function Intranet() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      <div className="container max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">Portal de Gestão</h1>
            <p className="text-muted-foreground mt-1">Intranet Moraes Rodrigues Advocacia</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>

        <Tabs defaultValue="processes" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start border-b rounded-none pb-4 mb-6 w-full">
            <TabsTrigger
              value="processes"
              className="data-[state=active]:bg-primary data-[state=active]:text-white border bg-white"
            >
              <Briefcase className="w-4 h-4 mr-2 hidden sm:block" /> Processos
            </TabsTrigger>
            <TabsTrigger
              value="crm"
              className="data-[state=active]:bg-primary data-[state=active]:text-white border bg-white"
            >
              <Users className="w-4 h-4 mr-2 hidden sm:block" /> CRM
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="data-[state=active]:bg-primary data-[state=active]:text-white border bg-white"
            >
              <DollarSign className="w-4 h-4 mr-2 hidden sm:block" /> Financeiro
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="data-[state=active]:bg-primary data-[state=active]:text-white border bg-white"
            >
              <BookOpen className="w-4 h-4 mr-2 hidden sm:block" /> Biblioteca
            </TabsTrigger>
            <TabsTrigger
              value="blog"
              className="data-[state=active]:bg-primary data-[state=active]:text-white border bg-white"
            >
              <FileText className="w-4 h-4 mr-2 hidden sm:block" /> Blog
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="data-[state=active]:bg-primary data-[state=active]:text-white border bg-white"
            >
              <LayoutDashboard className="w-4 h-4 mr-2 hidden sm:block" /> Equipe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="processes" className="mt-0">
            <ProcessManager />
          </TabsContent>
          <TabsContent value="crm" className="mt-0">
            <CrmManager />
          </TabsContent>
          <TabsContent value="finance" className="mt-0">
            <FinanceManager />
          </TabsContent>
          <TabsContent value="library" className="mt-0">
            <LibraryManager />
          </TabsContent>
          <TabsContent value="blog" className="mt-0">
            <BlogManager />
          </TabsContent>
          <TabsContent value="team" className="mt-0">
            <TeamManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, BarChart3, Mail, Maximize2, Minimize2 } from 'lucide-react'
import { CrmContactsTab } from './crm/CrmContactsTab'
import { CrmTemplatesTab } from './crm/CrmTemplatesTab'
import { CrmProductivityTab } from './crm/CrmProductivityTab'
import { useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

export default function CrmManager() {
  const [activeTab, setActiveTab] = useState('contacts')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { setOpen } = useSidebar()

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      setOpen(false)
    }
  }

  return (
    <div
      className={`space-y-8 animate-fade-in-up transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 p-8 overflow-auto' : ''}`}
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-primary tracking-tight">
            CRM & Relacionamento
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de clientes, funil de vendas, templates e produtividade.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-white shadow-sm"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 mr-2" />
          ) : (
            <Maximize2 className="w-4 h-4 mr-2" />
          )}
          {isFullscreen ? 'Sair da Tela Cheia' : 'Modo Foco'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full justify-start max-w-none bg-transparent p-0 border-b border-slate-200 rounded-none h-auto mb-8 gap-6">
          <TabsTrigger
            value="contacts"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none px-2 pb-3 text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4" /> Contatos & Funil
          </TabsTrigger>
          <TabsTrigger
            value="productivity"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none px-2 pb-3 text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <BarChart3 className="w-4 h-4" /> Produtividade
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none px-2 pb-3 text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Mail className="w-4 h-4" /> Templates de Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <CrmContactsTab />
        </TabsContent>
        <TabsContent value="productivity">
          <CrmProductivityTab />
        </TabsContent>
        <TabsContent value="templates">
          <CrmTemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

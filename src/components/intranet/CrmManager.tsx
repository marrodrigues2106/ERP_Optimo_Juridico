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
      className={`space-y-6 animate-fade-in-up transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 p-6 overflow-auto' : ''}`}
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">CRM & Relacionamento</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de clientes, funil de vendas, templates e produtividade
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleFullscreen}>
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 mr-2" />
          ) : (
            <Maximize2 className="w-4 h-4 mr-2" />
          )}
          {isFullscreen ? 'Sair da Tela Cheia' : 'Modo Foco'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Contatos & Funil
          </TabsTrigger>
          <TabsTrigger value="productivity" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Produtividade
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
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

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, BarChart3, Mail, History } from 'lucide-react'
import { CrmContactsTab } from './crm/CrmContactsTab'
import { CrmTemplatesTab } from './crm/CrmTemplatesTab'
import { CrmProductivityTab } from './crm/CrmProductivityTab'

export default function CrmManager() {
  const [activeTab, setActiveTab] = useState('contacts')

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">CRM & Relacionamento</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de clientes, funil de vendas, templates e produtividade
          </p>
        </div>
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PjeSearchTab } from './pje/PjeSearchTab'
import { PjeSavedTab } from './pje/PjeSavedTab'
import { Scale } from 'lucide-react'

export function PjeComunica() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col h-full overflow-hidden bg-white/50">
      <div className="mb-6 md:mb-8 shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Scale className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" /> Comunicações
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-2">
          Busque e gerencie comunicações oficiais de forma centralizada.
        </p>
      </div>

      <Tabs defaultValue="saved" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="self-start mb-6 bg-slate-100/80 p-1 shadow-sm rounded-lg">
          <TabsTrigger
            value="saved"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 font-medium"
          >
            Comunicações Salvas
          </TabsTrigger>
          <TabsTrigger
            value="search"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 font-medium"
          >
            Busca Manual (API)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="flex-1 overflow-y-auto pr-2 pb-8 custom-scrollbar">
          <PjeSavedTab />
        </TabsContent>
        <TabsContent value="search" className="flex-1 overflow-y-auto pr-2 pb-8 custom-scrollbar">
          <PjeSearchTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

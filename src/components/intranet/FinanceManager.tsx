import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUp, Calculator, Plus } from 'lucide-react'
import { getFinances, deleteFinance, deleteRecurringFinances } from '@/services/finances'
import { getLegalCases } from '@/services/legal_cases'
import { getCaseEstimatesAll } from '@/services/case_estimates'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

import { TransactionFormModal } from './finances/TransactionFormModal'
import { FeeEstimatorModal } from './finances/FeeEstimatorModal'
import { ImportFinancesModal } from './finances/ImportFinancesModal'
import { FinanceDeleteDialog } from './finances/FinanceDeleteDialog'

import { FinanceOverviewTab } from './finances/FinanceOverviewTab'
import { FinanceProfitTab } from './finances/FinanceProfitTab'
import { FinanceHistoryTab } from './finances/FinanceHistoryTab'

export default function FinanceManager() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [estimates, setEstimates] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const loadData = async () => {
    setTransactions(await getFinances())
    setCases(await getLegalCases())
    setEstimates(await getCaseEstimatesAll())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('finances', loadData)
  useRealtime('case_estimates', loadData)

  const handleConfirmDelete = async (allSeries: boolean) => {
    if (!deleteTarget) return
    if (allSeries && deleteTarget.recurrence_id) {
      await deleteRecurringFinances(deleteTarget.recurrence_id)
    } else {
      await deleteFinance(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormOpen(true)
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Gestão Financeira</h2>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe fluxo de caixa, rentabilidade e histórico.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="shadow-sm bg-white"
          >
            <FileUp className="w-4 h-4 mr-2" /> Importar CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => setFeeModalOpen(true)}
            className="shadow-sm bg-white"
          >
            <Calculator className="w-4 h-4 mr-2" /> Precificação
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null)
              setFormOpen(true)
            }}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Transação
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full justify-start max-w-none bg-transparent p-0 border-b border-slate-200 rounded-none h-auto mb-6">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none px-6 pb-3 text-sm font-semibold transition-colors"
          >
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none px-6 pb-3 text-sm font-semibold transition-colors"
          >
            Histórico e Edição
          </TabsTrigger>
          <TabsTrigger
            value="profit"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none px-6 pb-3 text-sm font-semibold transition-colors"
          >
            Rentabilidade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8 outline-none">
          <FinanceOverviewTab
            transactions={transactions}
            cases={cases}
            user={user}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-8 outline-none">
          <FinanceHistoryTab
            transactions={transactions}
            cases={cases}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        </TabsContent>
        <TabsContent value="profit" className="mt-6">
          <FinanceProfitTab
            transactions={transactions}
            cases={cases}
            estimates={estimates}
            user={user}
          />
        </TabsContent>
      </Tabs>

      <TransactionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        cases={cases}
        editingItem={editingItem}
      />
      <FeeEstimatorModal
        open={feeModalOpen}
        onOpenChange={setFeeModalOpen}
        cases={cases}
        onSuccess={loadData}
      />
      <ImportFinancesModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={loadData}
      />
      <FinanceDeleteDialog
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

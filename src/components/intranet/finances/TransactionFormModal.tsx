import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createFinance, updateFinance } from '@/services/finances'
import { useToast } from '@/hooks/use-toast'

export function TransactionFormModal({ open, onOpenChange, cases, editingItem, onSuccess }: any) {
  const { toast } = useToast()
  const [type, setType] = useState('inflow')
  const [status, setStatus] = useState('orçado')
  const [frequency, setFrequency] = useState('única')

  const inflowStatus = ['orçado', 'estimado', 'realizada', 'recebida']
  const outflowStatus = ['orçado', 'previsto', 'realizado', 'pago']
  const currentStatusList = type === 'inflow' ? inflowStatus : outflowStatus

  useEffect(() => {
    if (editingItem) {
      setType(editingItem.type || 'inflow')
      setStatus(editingItem.status || 'orçado')
      setFrequency(editingItem.frequency || 'única')
    } else {
      setType('inflow')
      setStatus('orçado')
      setFrequency('única')
    }
  }, [editingItem, open])

  useEffect(() => {
    if (!currentStatusList.includes(status)) {
      setStatus(currentStatusList[0])
    }
  }, [type])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data: any = Object.fromEntries(fd.entries())
    data.amount = parseFloat(data.amount)
    data.type = type
    data.status = status
    data.frequency = frequency
    if (data.linked_lawsuit === 'none') data.linked_lawsuit = null

    try {
      if (editingItem) {
        await updateFinance(editingItem.id, data)
        toast({ title: 'Transação atualizada' })
      } else {
        await createFinance(data)
        toast({ title: 'Transação registrada' })
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>
        <form key={editingItem?.id || 'new'} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Input
              name="description"
              required
              placeholder="Ex: Honorários ABC"
              defaultValue={editingItem?.description}
            />
          </div>
          <div>
            <Label>Processo Vinculado</Label>
            <Select name="linked_lawsuit" defaultValue={editingItem?.linked_lawsuit || 'none'}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um processo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum processo</SelectItem>
                {cases.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_number || c.parties}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType} disabled={!!editingItem}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inflow">Receita</SelectItem>
                  <SelectItem value="outflow">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                name="amount"
                type="number"
                step="0.01"
                required
                defaultValue={editingItem?.amount}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Data Inicial</Label>
              <Input
                name="date"
                type="date"
                required
                defaultValue={editingItem?.date?.split('T')[0]}
              />
            </div>
            <div>
              <Label>Recorrência</Label>
              <Select value={frequency} onValueChange={setFrequency} disabled={!!editingItem}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="única">Única</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentStatusList.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full">
            Salvar Transação
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

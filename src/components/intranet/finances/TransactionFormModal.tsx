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
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TransactionFormModal({ open, onOpenChange, cases, editingItem, onSuccess }: any) {
  const { toast } = useToast()
  const [type, setType] = useState('inflow')
  const [status, setStatus] = useState('orçado')
  const [frequency, setFrequency] = useState('única')

  const [openCaseCombo, setOpenCaseCombo] = useState(false)
  const [linkedLawsuit, setLinkedLawsuit] = useState<string>('none')

  const inflowStatus = ['orçado', 'estimado', 'realizada', 'recebida']
  const outflowStatus = ['orçado', 'previsto', 'realizado', 'pago']
  const currentStatusList = type === 'inflow' ? inflowStatus : outflowStatus

  useEffect(() => {
    if (editingItem) {
      setType(editingItem.type || 'inflow')
      setStatus(editingItem.status || 'orçado')
      setFrequency(editingItem.frequency || 'única')
      setLinkedLawsuit(editingItem.linked_lawsuit || 'none')
    } else {
      setType('inflow')
      setStatus('orçado')
      setFrequency('única')
      setLinkedLawsuit('none')
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
    data.linked_lawsuit = linkedLawsuit === 'none' ? null : linkedLawsuit

    const d = new Date(data.date)
    if (isNaN(d.getTime())) {
      toast({ title: 'Erro de Validação', description: 'Data inválida.', variant: 'destructive' })
      return
    }
    data.date = d.toISOString()

    setSubmitting(true)
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
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const [submitting, setSubmitting] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <Popover open={openCaseCombo} onOpenChange={setOpenCaseCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCaseCombo}
                  className="w-full justify-between font-normal text-left"
                >
                  <span className="truncate pr-4">
                    {linkedLawsuit !== 'none'
                      ? cases.find((c: any) => c.id === linkedLawsuit)?.parties ||
                        cases.find((c: any) => c.id === linkedLawsuit)?.case_number
                      : 'Nenhum processo'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar processo por título ou número..." />
                  <CommandList>
                    <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          setLinkedLawsuit('none')
                          setOpenCaseCombo(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            linkedLawsuit === 'none' ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        Nenhum processo
                      </CommandItem>
                      {cases.map((c: any) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.parties} ${c.case_number || ''}`}
                          onSelect={() => {
                            setLinkedLawsuit(c.id)
                            setOpenCaseCombo(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              linkedLawsuit === c.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate">{c.parties}</span>
                            {c.case_number && (
                              <span className="text-xs text-slate-500">{c.case_number}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar Transação'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function FinanceDeleteDialog({ deleteTarget, setDeleteTarget, onConfirm }: any) {
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Transação</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          {deleteTarget?.recurrence_id
            ? 'Esta transação faz parte de uma série recorrente (gerada automaticamente). O que deseja excluir?'
            : 'Tem certeza que deseja excluir esta transação permanentemente?'}
        </p>
        <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
          <Button variant="outline" className="w-full" onClick={() => onConfirm(false)}>
            {deleteTarget?.recurrence_id
              ? 'Excluir Apenas Esta Transação'
              : 'Sim, Excluir Transação'}
          </Button>
          {deleteTarget?.recurrence_id && (
            <Button variant="destructive" className="w-full" onClick={() => onConfirm(true)}>
              Excluir Toda a Série Recorrente
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

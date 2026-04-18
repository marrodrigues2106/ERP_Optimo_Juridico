import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createFinance } from '@/services/finances'
import { FileUp, Loader2 } from 'lucide-react'

// CSV Parser Helper
function parseCSVRow(text: string, delimiter = ';') {
  let inQuote = false
  const result = []
  let current = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"' && text[i + 1] === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      inQuote = !inQuote
    } else if (char === delimiter && !inQuote) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export function ImportFinancesModal({ open, onOpenChange, onSuccess }: any) {
  const [type, setType] = useState('inflow')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleImport = async () => {
    if (!file) {
      toast({ title: 'Selecione um arquivo CSV', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
      if (lines.length < 2) throw new Error('Arquivo vazio ou sem registros')

      const headers = parseCSVRow(lines[0])

      const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString()
        const parts = dateStr.split('/')
        if (parts.length === 3) {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`).toISOString()
        }
        return new Date().toISOString()
      }

      const parseNumber = (numStr: string) => {
        if (!numStr) return 0
        const clean = numStr.replace(/\./g, '').replace(',', '.')
        return parseFloat(clean) || 0
      }

      const recordsToCreate = []

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVRow(lines[i])
        const row: any = {}
        headers.forEach((h, idx) => {
          row[h] = values[idx] || ''
        })

        let record: any = { type }
        let metadata: any = { ...row }

        if (type === 'inflow') {
          record.date = parseDate(row['Data do lançamento'] || row['Data'])
          record.category_code = row['Código do rendimento'] || row['Código']
          record.amount = parseNumber(row['Valor recebido'] || row['Valor'])
          record.description = row['Histórico'] || 'Receita Importada'
          record.status = 'realizada'
        } else {
          record.date = parseDate(row['Data do lançamento'] || row['Data'])
          record.category_code = row['Código do Pagamento'] || row['Código']
          const vp = parseNumber(row['Valor pago'] || row['Valor'])
          const vm = parseNumber(row['Valor da multa'])
          const vj = parseNumber(row['Valor dos juros'])
          record.amount = vp + vm + vj
          record.description = row['Histórico'] || 'Despesa Importada'
          record.status = 'realizado'
        }

        record.frequency = 'única'
        record.metadata = metadata
        recordsToCreate.push(record)
      }

      for (const rec of recordsToCreate) {
        await createFinance(rec)
      }

      toast({ title: `${recordsToCreate.length} registros importados com sucesso!` })
      onSuccess?.()
      onOpenChange(false)
      setFile(null)
    } catch (e: any) {
      console.error(e)
      toast({ title: 'Erro na importação', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" /> Importar CSV Financeiro
          </DialogTitle>
          <DialogDescription>
            Importe planilhas de Receitas ou Despesas. Certifique-se de usar o formato delimitado
            por ponto e vírgula (;).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Tipo de Registro</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inflow">Receitas (Rendimentos)</SelectItem>
                <SelectItem value="outflow">Despesas (Pagamentos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Arquivo CSV</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border">
            {type === 'inflow' ? (
              <>
                <p className="font-bold text-slate-700 mb-1">Colunas Esperadas (Receitas):</p>
                <p>Data do lançamento; Código do rendimento; Valor recebido; Histórico</p>
              </>
            ) : (
              <>
                <p className="font-bold text-slate-700 mb-1">Colunas Esperadas (Despesas):</p>
                <p>
                  Data do lançamento; Código do Pagamento; Valor pago; Histórico; Valor da multa;
                  Valor dos juros
                </p>
              </>
            )}
            <p className="mt-2 text-primary">
              Campos adicionais do CSV serão salvos no histórico interno (metadata).
            </p>
          </div>
        </div>

        <Button onClick={handleImport} disabled={loading || !file} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...
            </>
          ) : (
            'Processar e Importar'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

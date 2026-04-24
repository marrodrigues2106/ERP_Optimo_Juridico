import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, X, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient, updateClient } from '@/services/clients'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface ClientFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingClient?: any | null
  onSuccess: (client: any) => void
  title?: string
  description?: string
}

export function ClientFormModal({
  open,
  onOpenChange,
  editingClient,
  onSuccess,
  title,
  description,
}: ClientFormModalProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    idNumber: '',
    address: '',
    birthDate: '',
    nationality: 'Brasileiro(a)',
    maritalStatus: 'Solteiro(a)',
    profession: '',
    classification: 'Lead',
    funnel_stage: 'Contact',
  })
  const [phoneNumbers, setPhoneNumbers] = useState([{ number: '', type: 'Celular' }])

  useEffect(() => {
    if (open) {
      if (editingClient) {
        setFormData({
          name: editingClient.name || editingClient.fullName || '',
          email: editingClient.email || '',
          cpf: editingClient.cpf || '',
          idNumber: editingClient.idNumber || '',
          address: editingClient.address || '',
          birthDate: editingClient.birthDate ? editingClient.birthDate.substring(0, 10) : '',
          nationality: editingClient.nationality || 'Brasileiro(a)',
          maritalStatus: editingClient.maritalStatus || 'Solteiro(a)',
          profession: editingClient.profession || '',
          classification: editingClient.classification || 'Lead',
          funnel_stage: editingClient.funnel_stage || 'Contact',
        })
        if (
          editingClient.phone_numbers &&
          Array.isArray(editingClient.phone_numbers) &&
          editingClient.phone_numbers.length > 0
        ) {
          setPhoneNumbers(editingClient.phone_numbers)
        } else if (editingClient.phone) {
          setPhoneNumbers([
            { number: editingClient.phone, type: editingClient.phone_type || 'Celular' },
          ])
        } else {
          setPhoneNumbers([{ number: '', type: 'Celular' }])
        }
      } else {
        setFormData({
          name: '',
          email: '',
          cpf: '',
          idNumber: '',
          address: '',
          birthDate: '',
          nationality: 'Brasileiro(a)',
          maritalStatus: 'Solteiro(a)',
          profession: '',
          classification: 'Lead',
          funnel_stage: 'Contact',
        })
        setPhoneNumbers([{ number: '', type: 'Celular' }])
      }
    }
  }, [open, editingClient])

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length <= 11)
      v = v
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    else
      v = v
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18)
    setFormData({ ...formData, cpf: v })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSubmitting(true)
    try {
      const cleanedPhones = phoneNumbers.filter((p) => p.number.trim() !== '')

      let birthDateIso = ''
      if (formData.birthDate) {
        birthDateIso = new Date(`${formData.birthDate}T12:00:00Z`).toISOString()
      }

      const payload = {
        ...formData,
        fullName: formData.name, // Keep fullName in sync with name
        birthDate: birthDateIso,
        phone_numbers: cleanedPhones,
        phone: cleanedPhones.length > 0 ? cleanedPhones[0].number : '',
        phone_type: cleanedPhones.length > 0 ? cleanedPhones[0].type : '',
      }

      let record
      if (editingClient) {
        record = await updateClient(editingClient.id, payload)
        toast({ title: 'Cliente atualizado com sucesso!' })
      } else {
        record = await createClient(payload)
        toast({ title: 'Cliente criado com sucesso!' })
      }

      onSuccess(record)
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title || (editingClient ? 'Editar Cliente' : 'Novo Cliente')}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-2">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label>Nome Completo / Razão Social *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Maria Souza"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>CPF / CNPJ</Label>
                <Input
                  value={formData.cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={18}
                />
              </div>
              <div>
                <Label>RG / Inscrição Estadual</Label>
                <Input
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  placeholder="00.000.000-0"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: maria@email.com"
                type="email"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-slate-700">Telefones / Contatos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPhoneNumbers([...phoneNumbers, { number: '', type: 'Celular' }])
                  }
                  className="h-7 text-xs bg-white"
                >
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {phoneNumbers.map((phone, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 items-center bg-white p-1 rounded border border-slate-100"
                  >
                    <Select
                      value={phone.type}
                      onValueChange={(val) => {
                        const newPhones = [...phoneNumbers]
                        newPhones[idx].type = val
                        setPhoneNumbers(newPhones)
                      }}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs border-none shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fixo">Fixo</SelectItem>
                        <SelectItem value="Celular">Celular</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="w-[1px] h-4 bg-slate-200"></div>
                    <Input
                      value={phone.number}
                      onChange={(e) => {
                        const newPhones = [...phoneNumbers]
                        newPhones[idx].number = e.target.value
                        setPhoneNumbers(newPhones)
                      }}
                      placeholder="(00) 00000-0000"
                      className="flex-1 h-8 text-sm border-none shadow-none focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setPhoneNumbers(phoneNumbers.filter((_, i) => i !== idx))}
                      disabled={phoneNumbers.length === 1 && !phone.number}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Endereço Completo</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Nacionalidade</Label>
                <Input
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="Ex: Brasileiro"
                />
              </div>
              <div>
                <Label>Estado Civil</Label>
                <Select
                  value={formData.maritalStatus}
                  onValueChange={(val) => setFormData({ ...formData, maritalStatus: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                    <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                    <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                    <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                    <SelectItem value="União Estável">União Estável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Profissão</Label>
                <Input
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  placeholder="Ex: Engenheiro"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Classificação</Label>
                <Select
                  value={formData.classification}
                  onValueChange={(val) => setFormData({ ...formData, classification: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fase no Funil</Label>
                <Select
                  value={formData.funnel_stage}
                  onValueChange={(val) => setFormData({ ...formData, funnel_stage: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contact">Contato</SelectItem>
                    <SelectItem value="Proposal">Proposta</SelectItem>
                    <SelectItem value="Negotiation">Negociação</SelectItem>
                    <SelectItem value="Closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </div>
        <div className="pt-4 border-t mt-2 shrink-0">
          <Button
            type="submit"
            form="client-form"
            className="w-full"
            disabled={submitting || !formData.name.trim()}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {submitting ? 'Salvando...' : 'Salvar Cliente'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useForm, Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { PjeSearchParams } from '@/services/comunicaPje'

interface ConsultaFormProps {
  onSearch: (params: PjeSearchParams) => void
  onClear: () => void
  loading?: boolean
}

export function ConsultaForm({ onSearch, onClear, loading = false }: ConsultaFormProps) {
  const { register, handleSubmit, reset, control } = useForm<PjeSearchParams>({
    defaultValues: {
      numeroProcesso: '',
      nomeParte: '',
      nomeAdvogado: '',
      cpfCnpj: '',
      numeroOab: '',
      ufOab: '',
      siglaTribunal: '',
      meio: '',
      dataDisponibilizacaoInicio: '',
      dataDisponibilizacaoFim: '',
    },
  })

  const onSubmit = (data: PjeSearchParams) => {
    onSearch(data)
  }

  const handleClear = () => {
    reset()
    onClear()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroProcesso">Número do Processo</Label>
              <Input
                id="numeroProcesso"
                {...register('numeroProcesso')}
                placeholder="Ex: 0000000-00.0000.0.00.0000"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomeParte">Nome da Parte</Label>
              <Input
                id="nomeParte"
                {...register('nomeParte')}
                placeholder="Nome completo"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpfCnpj">CPF/CNPJ da Parte</Label>
              <Input
                id="cpfCnpj"
                {...register('cpfCnpj')}
                placeholder="Apenas números"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomeAdvogado">Nome do Advogado</Label>
              <Input
                id="nomeAdvogado"
                {...register('nomeAdvogado')}
                placeholder="Nome completo"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroOab">Número OAB</Label>
              <Input
                id="numeroOab"
                {...register('numeroOab')}
                placeholder="Ex: 123456"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ufOab">UF OAB</Label>
              <Controller
                control={control}
                name="ufOab"
                render={({ field }) => (
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <SelectTrigger id="ufOab">
                      <SelectValue placeholder="Selecione UF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">AC</SelectItem>
                      <SelectItem value="AL">AL</SelectItem>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="AP">AP</SelectItem>
                      <SelectItem value="BA">BA</SelectItem>
                      <SelectItem value="CE">CE</SelectItem>
                      <SelectItem value="DF">DF</SelectItem>
                      <SelectItem value="ES">ES</SelectItem>
                      <SelectItem value="GO">GO</SelectItem>
                      <SelectItem value="MA">MA</SelectItem>
                      <SelectItem value="MG">MG</SelectItem>
                      <SelectItem value="MS">MS</SelectItem>
                      <SelectItem value="MT">MT</SelectItem>
                      <SelectItem value="PA">PA</SelectItem>
                      <SelectItem value="PB">PB</SelectItem>
                      <SelectItem value="PE">PE</SelectItem>
                      <SelectItem value="PI">PI</SelectItem>
                      <SelectItem value="PR">PR</SelectItem>
                      <SelectItem value="RJ">RJ</SelectItem>
                      <SelectItem value="RN">RN</SelectItem>
                      <SelectItem value="RO">RO</SelectItem>
                      <SelectItem value="RR">RR</SelectItem>
                      <SelectItem value="RS">RS</SelectItem>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="SE">SE</SelectItem>
                      <SelectItem value="SP">SP</SelectItem>
                      <SelectItem value="TO">TO</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="siglaTribunal">Tribunal</Label>
              <Input
                id="siglaTribunal"
                {...register('siglaTribunal')}
                placeholder="Ex: TJSP, TRT2, TRF3"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meio">Meio</Label>
              <Controller
                control={control}
                name="meio"
                render={({ field }) => (
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <SelectTrigger id="meio">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="E">Eletrônico</SelectItem>
                      <SelectItem value="D">Diário</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataDisponibilizacaoInicio">Data Início</Label>
              <Input
                id="dataDisponibilizacaoInicio"
                type="date"
                {...register('dataDisponibilizacaoInicio')}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataDisponibilizacaoFim">Data Fim</Label>
              <Input
                id="dataDisponibilizacaoFim"
                type="date"
                {...register('dataDisponibilizacaoFim')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClear} disabled={loading}>
              Limpar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Consultando...' : 'Consultar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useComunicaStore } from '@/hooks/use-comunica-store'
import { Loader2, Save } from 'lucide-react'

const settingsSchema = z.object({
  baseUrl: z.string().url('URL inválida').min(1, 'Obrigatório'),
  apiKey: z.string().optional(),
})

export default function ComunicaPjeSettings() {
  const { toast } = useToast()
  const { baseUrl, apiKey, setSettings, init } = useComunicaStore()
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      baseUrl: baseUrl || 'https://comunicaapi.pje.jus.br/api/v1',
      apiKey: apiKey || '',
    },
  })

  useEffect(() => {
    init().then(() => {
      form.reset({ baseUrl, apiKey })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init, form])

  async function onSubmit(values: z.infer<typeof settingsSchema>) {
    setLoading(true)
    try {
      await setSettings(values.baseUrl, values.apiKey || '')
      toast({
        title: 'Configurações salvas',
        description: 'A base de dados foi atualizada com sucesso.',
      })
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mt-2">
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Configuração da Integração API</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Base da API</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Endereço do serviço Comunica PJe Nacional (ex:
                    https://comunicaapi.pje.jus.br/api/v1)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave de Acesso (Bearer Token)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Token JWT ou Chave" {...field} />
                  </FormControl>
                  <FormDescription>
                    Token JWT ou Chave para autenticação no serviço, caso seja exigido.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Configurações
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}

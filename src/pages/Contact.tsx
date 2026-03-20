import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ScrollReveal } from '@/components/ScrollReveal'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Por favor, insira um e-mail válido'),
  phone: z.string().min(10, 'Por favor, insira um telefone válido'),
  subject: z.string().min(5, 'O assunto é muito curto'),
  message: z.string().min(10, 'A mensagem deve ter no mínimo 10 caracteres'),
})

export default function Contact() {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    toast({
      title: 'Mensagem enviada com sucesso!',
      description: 'Agradecemos o contato. Nossa equipe retornará o mais breve possível.',
    })
    form.reset()
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-background flex flex-col">
      <div className="container px-4 flex-grow">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-primary">
              Entre em Contato
            </h1>
            <div className="w-16 h-1 bg-accent mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              Agende uma consulta ou tire suas dúvidas. Nossa equipe de especialistas está pronta
              para oferecer a melhor e mais segura solução jurídica.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Form */}
          <ScrollReveal>
            <div className="bg-card p-8 sm:p-10 rounded-xl border border-border shadow-sm">
              <h2 className="text-2xl font-serif font-bold mb-8 text-primary">
                Envie uma Mensagem
              </h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Nome Completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seu nome completo"
                            className="bg-background h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">
                            E-mail Corporativo ou Pessoal
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="seu@email.com"
                              className="bg-background h-12"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Telefone / WhatsApp</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              className="bg-background h-12"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Assunto</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Qual o motivo do seu contato?"
                            className="bg-background h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Mensagem</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva brevemente sua demanda jurídica..."
                            className="min-h-[150px] bg-background resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-semibold mt-4"
                  >
                    Enviar Mensagem Segura
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollReveal>

          {/* Info & Map */}
          <ScrollReveal>
            <div className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-primary">Nosso Endereço</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Av. Brigadeiro Faria Lima, 3000
                      <br />
                      Itaim Bibi, São Paulo - SP
                      <br />
                      CEP: 01451-000
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-primary">Telefones</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      +55 (11) 3000-0000
                      <br />
                      +55 (11) 99999-9999 (WhatsApp)
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-primary">E-mail Institucional</h3>
                    <p className="text-muted-foreground leading-relaxed break-all">
                      contato@moraesrodrigues.com.br
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-primary">Horário de Atendimento</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Segunda a Sexta-feira
                      <br />
                      09:00 às 18:00
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden h-[350px] border border-border bg-muted shadow-sm">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.760144577821!2d-46.68884968440621!3d-23.57523996803738!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce5771c5ec213b%3A0xc3f92936df314d15!2sAv.%20Brg.%20Faria%20Lima%2C%203000%20-%20Itaim%20Bibi%2C%20S%C3%A3o%20Paulo%20-%20SP%2C%2001451-000!5e0!3m2!1spt-BR!2sbr!4v1655123456789!5m2!1spt-BR!2sbr"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'grayscale(100%) contrast(1.1) opacity(0.9)' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Mapa de localização do escritório Moraes Rodrigues Advocacia"
                ></iframe>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  )
}

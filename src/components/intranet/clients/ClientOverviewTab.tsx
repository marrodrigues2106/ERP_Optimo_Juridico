import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Mail, Phone, MapPin, Briefcase, MessageCircle } from 'lucide-react'
import { createInteraction } from '@/services/crm_interactions'
import { useToast } from '@/hooks/use-toast'

export function ClientOverviewTab({ client }: { client: any }) {
  const { toast } = useToast()

  if (!client) return null

  const handleEmailClick = async () => {
    if (!client.email) return

    try {
      await createInteraction({
        client: client.id,
        type: 'Email',
        description: 'Iniciou contato via e-mail clicando no perfil do cliente.',
        date: new Date().toISOString(),
        status: 'Completed',
      })
      toast({ title: 'Interação registrada no histórico' })
    } catch (err) {
      console.error('Failed to log email interaction', err)
    }
  }

  const handleWhatsAppClick = async () => {
    if (!client.phone) return

    try {
      await createInteraction({
        client: client.id,
        type: 'WhatsApp',
        description: 'Iniciou conversa via WhatsApp a partir do perfil.',
        date: new Date().toISOString(),
        status: 'Completed',
      })
      toast({ title: 'Interação registrada no histórico' })
    } catch (err) {
      console.error('Failed to log WhatsApp interaction', err)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="bg-slate-50/50 border-b">
        <CardTitle className="text-lg">Informações Completas</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                Contato
              </span>
              <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                <div className="text-sm flex items-center font-medium">
                  <Mail className="w-4 h-4 mr-2 text-slate-400" />
                  {client.email ? (
                    <a
                      href={`mailto:${client.email}`}
                      onClick={handleEmailClick}
                      className="text-primary hover:underline"
                    >
                      {client.email}
                    </a>
                  ) : (
                    'Não informado'
                  )}
                </div>
                <div className="text-sm flex items-center font-medium">
                  {client.phone_type === 'WhatsApp' ? (
                    <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <Phone className="w-4 h-4 mr-2 text-slate-400" />
                  )}
                  {client.phone ? (
                    client.phone_type === 'WhatsApp' ? (
                      <a
                        href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleWhatsAppClick}
                        className="text-primary hover:underline flex items-center"
                      >
                        {client.phone}{' '}
                        <span className="ml-2 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                          WhatsApp
                        </span>
                      </a>
                    ) : (
                      <span>
                        <a
                          href={`tel:${client.phone.replace(/\D/g, '')}`}
                          className="text-primary hover:underline"
                        >
                          {client.phone}
                        </a>
                        <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          {client.phone_type || 'Celular'}
                        </span>
                      </span>
                    )
                  ) : (
                    'Não informado'
                  )}
                </div>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                Documentos
              </span>
              <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                <p className="text-sm">
                  <span className="text-muted-foreground">CPF/CNPJ:</span>{' '}
                  <span className="font-medium">{client.cpf || 'Não informado'}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">RG/Identidade:</span>{' '}
                  <span className="font-medium">{client.idNumber || 'Não informado'}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                Pessoal
              </span>
              <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                <p className="text-sm">
                  <span className="text-muted-foreground">Nacionalidade:</span>{' '}
                  <span className="font-medium">{client.nationality || 'Não informado'}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Estado Civil:</span>{' '}
                  <span className="font-medium">{client.maritalStatus || 'Não informado'}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Data Nasc.:</span>{' '}
                  <span className="font-medium">
                    {client.birthDate
                      ? new Date(client.birthDate).toLocaleDateString()
                      : 'Não informado'}
                  </span>
                </p>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                Profissional & Endereço
              </span>
              <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                <p className="text-sm flex items-center">
                  <Briefcase className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                  <span className="font-medium truncate">
                    {client.profession || 'Não informado'}
                  </span>
                </p>
                <p className="text-sm flex items-start mt-2">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 text-slate-400 shrink-0" />
                  <span className="font-medium">{client.address || 'Não informado'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Mail, Phone, MapPin, Briefcase } from 'lucide-react'

export function ClientOverviewTab({ client }: { client: any }) {
  if (!client) return null

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
                <p className="text-sm flex items-center font-medium">
                  <Mail className="w-4 h-4 mr-2 text-slate-400" /> {client.email || 'Não informado'}
                </p>
                <p className="text-sm flex items-center font-medium">
                  <Phone className="w-4 h-4 mr-2 text-slate-400" />{' '}
                  {client.phone || 'Não informado'}
                </p>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                Documentos
              </span>
              <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                <p className="text-sm">
                  <span className="text-muted-foreground">CPF:</span>{' '}
                  <span className="font-medium">{client.cpf || 'Não informado'}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Identidade:</span>{' '}
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

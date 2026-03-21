import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient } from '@/services/clients'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, UserCircle } from 'lucide-react'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<any>(null)

  useEffect(() => {
    if (id) {
      getClient(id)
        .then(setClient)
        .catch(() => navigate('/intranet/crm'))
    }
  }, [id, navigate])

  if (!client) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Carregando detalhes do cliente...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary flex items-center">
            <UserCircle className="w-6 h-6 mr-2 text-secondary" />
            {client.fullName || client.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Classificação:{' '}
            <span
              className={`px-2 py-0.5 rounded-md text-xs ml-1 ${
                client.classification === 'Ativo'
                  ? 'bg-green-100 text-green-800'
                  : client.classification === 'Inativo'
                    ? 'bg-slate-100 text-slate-800'
                    : 'bg-blue-100 text-blue-800'
              }`}
            >
              {client.classification || 'Lead'}
            </span>
          </p>
        </div>
      </div>

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
                    <Mail className="w-4 h-4 mr-2 text-slate-400" />{' '}
                    {client.email || 'Não informado'}
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
    </div>
  )
}

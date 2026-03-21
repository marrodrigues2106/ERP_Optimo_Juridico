import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCollaborator } from '@/services/collaborators'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Phone, Briefcase, FileBadge, UserCircle } from 'lucide-react'

export default function CollaboratorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState<any>(null)

  useEffect(() => {
    if (id) {
      getCollaborator(id)
        .then(setMember)
        .catch(() => navigate('/intranet/team'))
    }
  }, [id, navigate])

  if (!member) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Carregando detalhes da equipe...
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
            {member.fullName || member.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Função:{' '}
            <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-md text-xs ml-1 font-bold">
              {member.role || 'Não definida'}
            </span>
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-lg">Informações do Membro</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  Contato Pessoal
                </span>
                <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                  <p className="text-sm flex items-center font-medium">
                    <Mail className="w-4 h-4 mr-2 text-slate-400" />{' '}
                    {member.email || 'Não informado'}
                  </p>
                  <p className="text-sm flex items-center font-medium">
                    <Phone className="w-4 h-4 mr-2 text-slate-400" />{' '}
                    {member.phone || 'Não informado'}
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
                    <span className="font-medium">{member.cpf || 'Não informado'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Identidade:</span>{' '}
                    <span className="font-medium">{member.idNumber || 'Não informado'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Data Nasc.:</span>{' '}
                    <span className="font-medium">
                      {member.birthDate
                        ? new Date(member.birthDate).toLocaleDateString()
                        : 'Não informado'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  Registro Profissional
                </span>
                <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                  <p className="text-sm flex items-center">
                    <FileBadge className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                    <span className="text-muted-foreground mr-1">OAB:</span>
                    <span className="font-medium">
                      {member.oabNumber
                        ? `${member.oabNumber} ${member.oabSectional ? `(${member.oabSectional})` : ''}`
                        : 'Não aplicável'}
                    </span>
                  </p>
                  <p className="text-sm flex items-start mt-2">
                    <Briefcase className="w-4 h-4 mr-2 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground mr-1">Termos:</span>
                    <span className="font-medium leading-snug">
                      {member.personalSearchTerms || 'Nenhum termo configurado'}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  Endereço Residencial
                </span>
                <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border">
                  <p className="text-sm font-medium">
                    {member.address || 'Endereço não cadastrado'}
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

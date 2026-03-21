import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserPlus, Mail, Phone } from 'lucide-react'

const mockTeam = [
  {
    id: '1',
    name: 'Dr. Marcelo Rodrigues',
    role: 'Lawyers (Employed)',
    email: 'marcelo@moraesrodriguesadvocacia.com.br',
    initial: 'MR',
    phone: '(21) 9999-9999',
  },
  {
    id: '2',
    name: 'Dra. Ana Costa',
    role: 'Associates',
    email: 'ana@moraesrodriguesadvocacia.com.br',
    initial: 'AC',
    phone: '(21) 8888-8888',
  },
  {
    id: '3',
    name: 'Carlos Santos',
    role: 'Associates',
    email: 'carlos@moraesrodriguesadvocacia.com.br',
    initial: 'CS',
    phone: '(21) 7777-7777',
  },
  {
    id: '4',
    name: 'Lucia Lima',
    role: 'Administrative Staff',
    email: 'lucia@moraesrodriguesadvocacia.com.br',
    initial: 'LL',
    phone: '(21) 6666-6666',
  },
]

export default function TeamManager() {
  const [team] = useState(mockTeam)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Gestão de Equipe</h2>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" /> Adicionar Membro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {team.map((member) => (
          <Card
            key={member.id}
            className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <CardContent className="p-6 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-slate-50">
                <AvatarImage
                  src={`https://img.usecurling.com/ppl/thumbnail?seed=${member.id}&gender=${parseInt(member.id) % 2 === 0 ? 'female' : 'male'}`}
                />
                <AvatarFallback className="text-xl bg-primary text-white">
                  {member.initial}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="font-semibold text-primary text-lg">{member.name}</h3>
                <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary text-xs rounded-full font-medium mb-2">
                  {member.role === 'Lawyers (Employed)'
                    ? 'Advogado(a)'
                    : member.role === 'Associates'
                      ? 'Associado(a)'
                      : 'Administrativo'}
                </span>
                <div className="flex flex-col gap-1 pt-3 border-t">
                  <a
                    href={`mailto:${member.email}`}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-2"
                  >
                    <Mail className="w-3 h-3" /> <span className="truncate">{member.email}</span>
                  </a>
                  <a
                    href={`tel:${member.phone.replace(/\D/g, '')}`}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-2"
                  >
                    <Phone className="w-3 h-3" /> {member.phone}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

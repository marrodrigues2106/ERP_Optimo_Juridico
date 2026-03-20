import { useState } from 'react'
import { ScrollReveal } from '@/components/ScrollReveal'
import { teamMembers } from '@/data/content'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Briefcase } from 'lucide-react'

export default function Team() {
  const [selectedMember, setSelectedMember] = useState<(typeof teamMembers)[0] | null>(null)

  return (
    <div className="min-h-screen pt-32 pb-24 bg-background">
      <div className="container px-4">
        <ScrollReveal>
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-primary">
              Nossa Equipe
            </h1>
            <div className="w-16 h-1 bg-accent mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              Profissionais altamente qualificados, comprometidos de forma irrestrita com a
              excelência e focados na melhor e mais segura solução para os nossos clientes.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <ScrollReveal key={member.id} className="cursor-pointer group">
              <div
                onClick={() => setSelectedMember(member)}
                className="text-center h-full flex flex-col"
              >
                <div className="relative overflow-hidden rounded-xl aspect-[3/4] mb-6 shadow-sm border border-border/50 bg-muted">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale group-hover:grayscale-0"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-8">
                    <span className="text-white font-medium border border-white/30 rounded-full px-6 py-2 backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-colors">
                      Ver Perfil Completo
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-serif font-bold text-primary group-hover:text-accent transition-colors">
                  {member.name}
                </h3>
                <p className="text-muted-foreground font-medium mt-1">{member.role}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[700px] gap-6 p-0 overflow-hidden">
          {selectedMember && (
            <>
              <div className="bg-muted/50 p-6 sm:p-8 border-b border-border">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <img
                    src={selectedMember.image}
                    alt={selectedMember.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-sm"
                  />
                  <div className="text-center sm:text-left pt-2 flex-grow">
                    <DialogTitle className="text-3xl font-serif mb-2 text-primary">
                      {selectedMember.name}
                    </DialogTitle>
                    <DialogDescription className="text-lg text-accent font-semibold mb-4">
                      {selectedMember.role}
                    </DialogDescription>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {selectedMember.expertise.map((exp) => (
                        <Badge
                          key={exp}
                          variant="secondary"
                          className="font-medium bg-background border border-border"
                        >
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-8 bg-background">
                <div>
                  <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-lg">
                    <Briefcase className="w-5 h-5 text-accent" /> Sobre a Atuação
                  </h4>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {selectedMember.bio}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-lg">
                    <GraduationCap className="w-5 h-5 text-accent" /> Formação Acadêmica
                  </h4>
                  <ul className="text-muted-foreground leading-relaxed text-base space-y-2">
                    {selectedMember.education.split('\n').map((line, idx) => (
                      <li
                        key={idx}
                        className="flex items-start before:content-['•'] before:mr-2 before:text-accent"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { Building2, Calendar, Bell } from 'lucide-react'

interface PublicationCardProps {
  item: any
  onClick?: () => void
  showActions?: React.ReactNode
}

export function PublicationCard({ item, onClick, showActions }: PublicationCardProps) {
  let title = item.texto_normalizado?.substring(0, 100) || 'Andamento'
  let text = item.texto_normalizado || item.description || ''
  let source = item.orgao || item.source || 'Sistema'
  let date = item.data_publicacao || item.event_date || item.created
  let term = item.matched_term

  if (item.details) {
    try {
      const parsed = JSON.parse(item.details)
      if (parsed.nome) title = parsed.nome
      if (parsed.complementosTabelados && Array.isArray(parsed.complementosTabelados)) {
        text = parsed.complementosTabelados.map((c: any) => `${c.nome}: ${c.valor}`).join(' • ')
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  return (
    <div
      className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-slate-800 leading-tight">
            {item.numero_processo && item.numero_processo[0] ? (
              <>Novo Processo Encontrado › Nº {item.numero_processo[0]}</>
            ) : (
              title
            )}
          </h4>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> {source}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {new Date(date).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        {showActions && (
          <div
            className="shrink-0 flex items-center gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {showActions}
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600 mt-3 line-clamp-3 font-serif leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
        {text}
      </p>

      {term && (
        <div className="mt-3 flex items-center gap-1.5 text-blue-600 text-xs font-medium">
          <Bell className="w-3.5 h-3.5" />
          Termo encontrado: {term}
        </div>
      )}
    </div>
  )
}

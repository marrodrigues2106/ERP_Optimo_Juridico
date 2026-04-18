import { format } from 'date-fns'

export default function ConsultaTable({
  data,
  onViewDetails,
}: {
  data: any[]
  onViewDetails: (item: any) => void
}) {
  return (
    <div className="bg-card border rounded-lg overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
          <tr>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Tribunal/Órgão</th>
            <th className="px-4 py-3 font-medium">Processo</th>
            <th className="px-4 py-3 font-medium">Tipo/Meio</th>
            <th className="px-4 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item, i) => {
            const uniqueKey =
              item.id || item.hash_comunicacao || item.hash || item.numeroComunicacao || 'comunica'
            return (
              <tr key={`${uniqueKey}-${i}`} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.dataDisponibilizacao
                    ? format(new Date(item.dataDisponibilizacao), 'dd/MM/yyyy')
                    : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{item.siglaTribunal}</div>
                  <div
                    className="text-xs text-muted-foreground truncate max-w-[200px]"
                    title={item.nomeOrgao}
                  >
                    {item.nomeOrgao}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-foreground">
                  {item.numeroProcesso}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
                      {item.tipoComunicacao}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium border border-border">
                      {item.meio === 'E' ? 'Eletrônico' : 'Diário'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onViewDetails(item)}
                    className="text-primary hover:underline text-xs font-medium"
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

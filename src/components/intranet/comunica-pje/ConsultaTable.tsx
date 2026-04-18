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
      <table className="w-full text-base text-left">
        <thead className="text-sm text-muted-foreground bg-muted/50 uppercase border-b">
          <tr>
            <th className="px-4 py-4 font-medium">Data</th>
            <th className="px-4 py-4 font-medium">Processo</th>
            <th className="px-4 py-4 font-medium">Texto da Comunicação</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item, i) => {
            const uniqueKey =
              item.id || item.hash_comunicacao || item.hash || item.numeroComunicacao || 'comunica'
            return (
              <tr key={`${uniqueKey}-${i}`} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-700">
                  {item.dataDisponibilizacao || item.data_disponibilizacao
                    ? format(
                        new Date(item.dataDisponibilizacao || item.data_disponibilizacao),
                        'dd/MM/yyyy',
                      )
                    : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap font-mono text-primary font-bold">
                  {item.numeroProcesso || item.numero_processo}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <p
                      className="line-clamp-2 text-slate-600 leading-relaxed text-lg"
                      dangerouslySetInnerHTML={{ __html: item.texto || '' }}
                    ></p>
                    <button
                      onClick={() => onViewDetails(item)}
                      className="text-primary hover:underline text-sm font-bold w-fit mt-1"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

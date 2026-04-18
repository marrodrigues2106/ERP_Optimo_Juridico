import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export default function ConsultaTable({
  data,
  onViewDetails,
}: {
  data: any[]
  onViewDetails: (item: any) => void
}) {
  const navigate = useNavigate()
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-base text-left">
        <thead className="text-sm text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 font-bold tracking-wide w-[120px]">Data</th>
            <th className="px-6 py-4 font-bold tracking-wide w-[200px]">Processo</th>
            <th className="px-6 py-4 font-bold tracking-wide">Texto da Comunicação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item, i) => {
            const uniqueKey =
              item.id ||
              item.hash_comunicacao ||
              item.hash ||
              item.numeroComunicacao ||
              `comunica-${i}`

            return (
              <tr key={uniqueKey} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-5 whitespace-nowrap font-medium text-slate-700 align-top">
                  {item.dataDisponibilizacao || item.data_disponibilizacao
                    ? format(
                        new Date(item.dataDisponibilizacao || item.data_disponibilizacao),
                        'dd/MM/yyyy',
                      )
                    : '-'}
                </td>
                <td className="px-6 py-5 font-mono text-primary font-bold align-top break-words">
                  {item.numeroProcesso || item.numero_processo}
                </td>
                <td className="px-6 py-5 align-top">
                  <div className="flex flex-col gap-3">
                    <div
                      className="text-slate-700 leading-relaxed text-lg whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: item.texto || '' }}
                    />
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => {
                          onViewDetails(item)
                          navigate(`/intranet/comunicacoes/${item.id}`)
                        }}
                        className="text-primary hover:underline text-sm font-bold"
                      >
                        Página Completa
                      </button>
                    </div>
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

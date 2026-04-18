import { useComunicaStore } from '@/hooks/use-comunica-store'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export default function ComunicaPjeHistory() {
  const { searchHistory, clearHistory } = useComunicaStore()

  return (
    <div className="space-y-4 mt-2">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Histórico de Buscas Recentes</h2>
        {searchHistory.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearHistory}>
            Limpar Histórico
          </Button>
        )}
      </div>

      {searchHistory.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground bg-card border rounded-lg">
          Nenhuma busca recente nesta sessão.
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Data/Hora</th>
                <th className="px-4 py-3 font-medium">Termos Utilizados</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Resultados</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {searchHistory.map((entry, i) => (
                <tr key={i} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">
                    {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                  </td>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground truncate max-w-sm"
                    title={entry.term}
                  >
                    {entry.term}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        entry.status === 'success'
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : entry.status === 'error'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      }`}
                    >
                      {entry.status === 'success'
                        ? 'Sucesso'
                        : entry.status === 'error'
                          ? 'Erro'
                          : 'Pendente'}
                    </span>
                    {entry.message && entry.message !== 'Success' && (
                      <div
                        className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate"
                        title={entry.message}
                      >
                        {entry.message}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.resultsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

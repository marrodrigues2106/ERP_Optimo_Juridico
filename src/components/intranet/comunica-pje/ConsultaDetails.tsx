import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'

export default function ConsultaDetails({ item, onClose }: { item: any; onClose: () => void }) {
  if (!item) return null

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col h-full border-l">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">Detalhes da Comunicação</SheetTitle>
          <SheetDescription className="font-mono text-sm">
            Processo: {item.numeroProcesso}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start h-10 shrink-0">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="texto">Teor da Comunicação</TabsTrigger>
            <TabsTrigger value="json">JSON Bruto</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-2">
                  <div className="font-medium text-muted-foreground">Tribunal:</div>
                  <div className="font-medium">{item.siglaTribunal}</div>

                  <div className="font-medium text-muted-foreground">Órgão:</div>
                  <div>{item.nomeOrgao}</div>

                  <div className="font-medium text-muted-foreground">Classe:</div>
                  <div>{item.nomeClasse}</div>

                  <div className="font-medium text-muted-foreground">Tipo de Doc:</div>
                  <div>{item.tipoDocumento}</div>

                  <div className="font-medium text-muted-foreground">Data Disp:</div>
                  <div>
                    {item.dataDisponibilizacao
                      ? format(new Date(item.dataDisponibilizacao), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </div>

                  <div className="font-medium text-muted-foreground">Link:</div>
                  <div>
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline truncate block"
                      >
                        Acessar Documento
                      </a>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                {item.destinatarios && item.destinatarios.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-3 text-foreground">Destinatários</h4>
                    <ul className="space-y-2">
                      {item.destinatarios.map((d: any, i: number) => (
                        <li
                          key={d.id || d.nome || i}
                          className="bg-muted/50 p-2 rounded border text-xs"
                        >
                          <span className="font-medium">{d.nome}</span>
                          {d.polo && (
                            <span className="text-muted-foreground block mt-1">Polo: {d.polo}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="texto" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full rounded-md border bg-card p-4">
              <div
                className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert break-words whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: item.texto || 'Nenhum texto disponível.' }}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="json" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full rounded-md bg-zinc-950 p-4">
              <pre className="text-xs text-zinc-50 font-mono">{JSON.stringify(item, null, 2)}</pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

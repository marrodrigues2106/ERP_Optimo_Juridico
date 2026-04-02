import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail } from 'lucide-react'

export function CrmTemplatesTab() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50/50 border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Templates de Email
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 text-center text-slate-500">
        Gerenciador de templates de email em desenvolvimento.
      </CardContent>
    </Card>
  )
}

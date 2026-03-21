import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Search, UserPlus, Phone, Mail } from 'lucide-react'

const mockClients = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '(21) 99999-9999',
    status: 'Active Client',
  },
  {
    id: '2',
    name: 'Maria Souza',
    email: 'maria@example.com',
    phone: '(21) 98888-8888',
    status: 'Prospect',
  },
  {
    id: '3',
    name: 'Empresa ABC',
    email: 'contato@abc.com',
    phone: '(11) 3333-3333',
    status: 'Former Client',
  },
  {
    id: '4',
    name: 'Pedro Alves',
    email: 'pedro@example.com',
    phone: '(21) 97777-7777',
    status: 'Active Client',
  },
]

export default function CrmManager() {
  const [clients] = useState(mockClients)
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">CRM & Clientes</h2>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <CardTitle>Base de Contatos</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Mail className="w-3 h-3 mr-2" /> {client.email}
                      </span>
                      <span className="flex items-center">
                        <Phone className="w-3 h-3 mr-2" /> {client.phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        client.status === 'Active Client'
                          ? 'bg-green-100 text-green-800'
                          : client.status === 'Prospect'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {client.status === 'Active Client'
                        ? 'Ativo'
                        : client.status === 'Prospect'
                          ? 'Prospecto'
                          : 'Ex-Cliente'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Ver Perfil
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-center px-4 pt-20">
      <div className="max-w-lg">
        <h1 className="text-8xl font-serif font-bold text-primary mb-6">404</h1>
        <h2 className="text-3xl font-serif font-semibold mb-6 text-gray-800">
          Página não encontrada
        </h2>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          A página que você está procurando pode ter sido removida, teve seu nome alterado ou está
          temporariamente indisponível.
        </p>
        <Button
          asChild
          size="lg"
          className="bg-secondary hover:bg-secondary/90 text-white rounded-full px-8"
        >
          <Link to="/">Voltar para o Início</Link>
        </Button>
      </div>
    </div>
  )
}

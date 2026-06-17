import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ActivitySquare } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-6">
        <ActivitySquare className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md">
        Ops! Parece que a página que você está procurando não existe ou foi movida.
      </p>
      <Button asChild className="h-11 px-8">
        <Link to="/">Voltar para o Início</Link>
      </Button>
    </div>
  )
}

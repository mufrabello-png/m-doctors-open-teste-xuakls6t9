import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ActivitySquare } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center animate-in fade-in duration-500">
      <div className="rounded-full bg-primary/10 p-4 mb-6">
        <ActivitySquare className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-2 text-foreground">404</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md">
        Página não encontrada. O recurso que você procura não existe ou foi removido do sistema.
      </p>
      <Button asChild className="h-11 px-8 min-h-[44px]">
        <Link to="/dashboard">Voltar ao dashboard</Link>
      </Button>
    </div>
  )
}

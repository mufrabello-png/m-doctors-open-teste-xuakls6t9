import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center animate-in fade-in duration-500">
          <div className="rounded-full bg-destructive/10 p-4 mb-6">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">
            Algo deu errado
          </h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            Desculpe, ocorreu um erro inesperado na aplicação. Nossa equipe técnica já foi
            notificada.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="h-11 px-8 min-h-[44px]"
            aria-label="Tentar novamente e recarregar a página"
          >
            Tentar novamente
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

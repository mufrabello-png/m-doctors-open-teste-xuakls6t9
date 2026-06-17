import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export default function Alerts() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const records = await pb.collection('alerts').getFullList({
          sort: '-created',
        })
        setAlerts(records)
      } catch (err) {
        console.error(err)
      }
    }
    if (user) {
      loadAlerts()
    }
  }, [user])

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          text: 'text-destructive',
          icon: AlertCircle,
        }
      case 'medium':
        return {
          bg: 'bg-yellow-100',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: Clock,
        }
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          text: 'text-blue-600',
          icon: CheckCircle2,
        }
      default:
        return {
          bg: 'bg-muted',
          border: 'border-border',
          text: 'text-muted-foreground',
          icon: AlertCircle,
        }
    }
  }

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Central de Alertas</h2>
        <p className="text-muted-foreground">Notificações operacionais e pendências importantes.</p>
      </div>

      <div className="flex flex-col gap-3">
        {alerts.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-border border-dashed">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary opacity-50 mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhum alerta ativo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tudo certo com as escalas no momento.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const styles = getLevelStyles(alert.severidade)
            const Icon = styles.icon

            return (
              <Card
                key={alert.id}
                className={cn(
                  'border transition-colors hover:bg-muted/30',
                  styles.border,
                  alert.lido && 'opacity-70',
                )}
              >
                <CardContent className="p-4 sm:p-5 flex gap-4 items-start">
                  <div className={cn('mt-1 p-2 rounded-full shrink-0', styles.bg)}>
                    <Icon className={cn('h-5 w-5', styles.text)} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-foreground leading-none">{alert.titulo}</h4>
                      <Badge variant="outline" className="text-xs shrink-0 bg-white">
                        {formatTime(alert.created)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug pt-1">
                      {alert.descricao}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

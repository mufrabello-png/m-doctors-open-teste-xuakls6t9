import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const mockAlerts = [
  {
    id: 1,
    title: 'Falta de cobertura médica',
    desc: 'Plantão Pediátrico sem médico escalado para amanhã.',
    level: 'high',
    time: '10 min atrás',
  },
  {
    id: 2,
    title: 'Conflito de horário',
    desc: 'Dra. Maria Clara alocada em dois setores simultâneos.',
    level: 'high',
    time: '1 hora atrás',
  },
  {
    id: 3,
    title: 'Troca de plantão pendente',
    desc: 'Dr. Lucas solicitou troca para o dia 15/10. Aguardando aprovação.',
    level: 'medium',
    time: '3 horas atrás',
  },
  {
    id: 4,
    title: 'Aviso de vencimento',
    desc: 'Certificação ACLS de 2 profissionais vence este mês.',
    level: 'low',
    time: '1 dia atrás',
  },
  {
    id: 5,
    title: 'Atualização do sistema',
    desc: 'O sistema ficará indisponível por 15min nesta madrugada.',
    level: 'low',
    time: '2 dias atrás',
  },
]

export default function Alerts() {
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Central de Alertas</h2>
        <p className="text-muted-foreground">Notificações operacionais e pendências importantes.</p>
      </div>

      <div className="flex flex-col gap-3">
        {mockAlerts.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-border border-dashed">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary opacity-50 mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhum alerta ativo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tudo certo com as escalas no momento.
            </p>
          </div>
        ) : (
          mockAlerts.map((alert) => {
            const styles = getLevelStyles(alert.level)
            const Icon = styles.icon

            return (
              <Card
                key={alert.id}
                className={cn('border transition-colors hover:bg-muted/30', styles.border)}
              >
                <CardContent className="p-4 sm:p-5 flex gap-4 items-start">
                  <div className={cn('mt-1 p-2 rounded-full shrink-0', styles.bg)}>
                    <Icon className={cn('h-5 w-5', styles.text)} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-foreground leading-none">{alert.title}</h4>
                      <Badge variant="outline" className="text-xs shrink-0 bg-white">
                        {alert.time}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug pt-1">{alert.desc}</p>
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

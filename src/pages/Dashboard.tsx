import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const stats = [
  {
    title: 'Plantões Hoje',
    value: '4',
    icon: CalendarDays,
    trend: '+1 desde ontem',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    title: 'Escalas Pendentes',
    value: '12',
    icon: Clock,
    trend: 'Requer atenção',
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
  },
  {
    title: 'Alertas Ativos',
    value: '3',
    icon: AlertTriangle,
    trend: '1 de alta prioridade',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
]

const recentActivities = [
  {
    id: 1,
    action: 'Troca de plantão aprovada',
    doctor: 'Dra. Ana Silva',
    time: 'Há 10 min',
    status: 'Concluído',
  },
  {
    id: 2,
    action: 'Solicitação de cobertura',
    doctor: 'Dr. Carlos Mendes',
    time: 'Há 2 horas',
    status: 'Pendente',
  },
  {
    id: 3,
    action: 'Nova escala publicada',
    doctor: 'Coord. UTI',
    time: 'Ontem',
    status: 'Concluído',
  },
  {
    id: 4,
    action: 'Afastamento registrado',
    doctor: 'Dr. Roberto Santos',
    time: 'Ontem',
    status: 'Atenção',
  },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
        <p className="text-muted-foreground">Monitoramento em tempo real das escalas e plantões.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-0 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md duration-200"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Atividade Recente</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Últimas movimentações no sistema.</p>
          </div>
          <Button variant="ghost" size="sm" className="hidden md:flex">
            Ver todas <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm md:text-base">{activity.action}</span>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                    <span>{activity.doctor}</span>
                    <span>•</span>
                    <span>{activity.time}</span>
                  </div>
                </div>
                <Badge
                  variant={
                    activity.status === 'Concluído'
                      ? 'default'
                      : activity.status === 'Pendente'
                        ? 'secondary'
                        : 'destructive'
                  }
                  className={
                    activity.status === 'Concluído' ? 'bg-primary hover:bg-primary/90' : ''
                  }
                >
                  {activity.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

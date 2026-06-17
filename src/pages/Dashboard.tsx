import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, AlertTriangle, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import pb from '@/lib/pocketbase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'

export default function Dashboard() {
  const { user } = useAuth()
  const [shifts, setShifts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alertsCount, setAlertsCount] = useState(0)

  useEffect(() => {
    if (user) {
      pb.collection('alerts')
        .getList(1, 1, { filter: 'lido = false' })
        .then((res) => setAlertsCount(res.totalItems))
        .catch(() => {})
    }

    const fetchShifts = async () => {
      try {
        setIsLoading(true)
        const res = await pb.send('/backend/v1/shifts', { method: 'GET' })

        // Extract array from standard response structures
        const data = Array.isArray(res) ? res : res?.data || res?.shifts || []
        setShifts(data)
        setError(null)
      } catch (err: any) {
        console.error(err)
        setError('Erro ao carregar as escalas. Verifique sua conexão ou token de configuração.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchShifts()
  }, [])

  const stats = [
    {
      title: 'Plantões Hoje',
      value: shifts.length > 0 ? shifts.length.toString() : '0',
      icon: CalendarDays,
      trend: 'Atualizado hoje',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Alertas Não Lidos',
      value: alertsCount.toString(),
      icon: AlertTriangle,
      trend: alertsCount > 0 ? 'Requer atenção' : 'Tudo em dia',
      color: alertsCount > 0 ? 'text-destructive' : 'text-blue-600',
      bg: alertsCount > 0 ? 'bg-destructive/10' : 'bg-blue-50',
    },
    {
      title: 'Escalas Pendentes',
      value: '0',
      icon: Clock,
      trend: 'Em conformidade',
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
  ]

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
            <CardTitle>Minhas Escalas</CardTitle>
            <CardDescription>Escalas e plantões sincronizados com Doctorid.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="hidden md:flex">
            Ver todas <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de Sincronização</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : shifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma escala encontrada.</div>
          ) : (
            <div className="space-y-6">
              {shifts.map((shift: any, index: number) => (
                <div
                  key={shift.id || index}
                  className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm md:text-base">
                      {shift.specialty || shift.title || shift.action || 'Plantão Clínico'}
                    </span>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                      <span>{shift.location || shift.hospital || 'Local não informado'}</span>
                      <span>•</span>
                      <span>{shift.date || shift.time || 'Data não informada'}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      shift.status === 'Confirmado' || shift.status === 'Concluído'
                        ? 'default'
                        : shift.status === 'Pendente'
                          ? 'secondary'
                          : 'outline'
                    }
                    className={
                      shift.status === 'Confirmado' || shift.status === 'Concluído'
                        ? 'bg-primary hover:bg-primary/90'
                        : ''
                    }
                  >
                    {shift.status || 'Agendado'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

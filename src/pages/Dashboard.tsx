import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileText,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import pb from '@/lib/pocketbase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'

export default function Dashboard() {
  const { user } = useAuth()
  const [shifts, setShifts] = useState<any[]>([])
  const [totalShifts, setTotalShifts] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alertsCount, setAlertsCount] = useState(0)
  const [doctorIdLogs, setDoctorIdLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  const loadDoctorIdLogs = async () => {
    try {
      setLogsLoading(true)
      const logs = await pb.send('/backend/v1/doctor-id/logs?limit=30', { method: 'GET' })
      setDoctorIdLogs(Array.isArray(logs) ? logs : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      pb.collection('alerts')
        .getList(1, 1, { filter: 'lido = false' })
        .then((res) => setAlertsCount(res.totalItems))
        .catch(() => {})
    }

    loadDoctorIdLogs()

    const fetchShifts = async () => {
      try {
        setIsLoading(true)
        const res = await pb.send('/backend/v1/shifts', { method: 'GET' })

        // Extract array from standard response structures
        const data = Array.isArray(res) ? res : res?.items || res?.data || res?.shifts || []
        setShifts(data)
        setTotalShifts(Number(res?.totalItems ?? data.length))
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

  const visibleShifts = shifts.slice(0, 50)

  const stats = [
    {
      title: 'Plantões no Período',
      value: totalShifts.toLocaleString('pt-BR'),
      icon: CalendarDays,
      trend: 'Dados reais do Doctor ID',
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
              <p className="text-sm text-muted-foreground">
                Exibindo {Math.min(shifts.length, 50).toLocaleString('pt-BR')} de{' '}
                {totalShifts.toLocaleString('pt-BR')} plantões sincronizados do Doctor ID.
              </p>
              {visibleShifts.map((shift: any, index: number) => (
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

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Diagnóstico Doctor ID
            </CardTitle>
            <CardDescription>
              Histórico técnico das consultas, respostas e erros da integração.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadDoctorIdLogs} disabled={logsLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando logs...
            </div>
          ) : doctorIdLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma tentativa registrada. Execute uma sincronização para gerar o primeiro
              diagnóstico.
            </p>
          ) : (
            <div className="space-y-3">
              {doctorIdLogs.map((log) => (
                <div key={log.id} className="rounded-lg border border-border/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {log.operation === 'sync' ? 'Sincronização' : log.operation}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${log.statusCode >= 400 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
                    >
                      HTTP {log.statusCode || 'N/A'}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                    <span>Data: {new Date(log.created).toLocaleString('pt-BR')}</span>
                    <span>Período: {log.requestPeriod || 'não informado'}</span>
                    <span>Recebidos: {log.receivedCount ?? 0}</span>
                    <span>Gravados: {log.syncedCount ?? 0}</span>
                    <span className="md:col-span-2 break-all">
                      Chaves: {log.responseKeys || 'nenhuma'}
                    </span>
                  </div>
                  {log.errorMessage && (
                    <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                      Erro: {log.errorMessage}
                    </div>
                  )}
                  {log.responsePreview && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                        Ver resposta recebida (dados sensíveis mascarados)
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">
                        {log.responsePreview}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

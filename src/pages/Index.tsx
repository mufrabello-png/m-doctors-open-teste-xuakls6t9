import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Briefcase,
  Activity,
  Percent,
  RefreshCw,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'

interface DashboardData {
  kpis: {
    vagas_descobertas: { value: number; trend: number }
    taxa_ocupacao: { value: number; trend: number }
    produtividade: { value: number; trend: number }
    riscos_proximos: { value: number; trend: number }
  }
  chart: Array<{ day: string; vagas: number }>
  institutions: Array<{
    id: string
    name: string
    vagas_totais: number
    vagas_preenchidas: number
    taxa_ocupacao: number
  }>
}

export default function Index() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await pb.send('/backend/v1/dashboard-kpis', { method: 'GET' })
      setData(res as DashboardData)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Ocorreu um erro ao carregar os dados do dashboard.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCardClick = (kpiKey: string) => {
    const questions: Record<string, string> = {
      vagas_descobertas:
        'Quais são as vagas descobertas para esta semana e como podemos preenchê-las?',
      taxa_ocupacao: 'Como está a taxa de ocupação geral e quais unidades precisam de atenção?',
      produtividade: 'Qual é o relatório de produtividade da equipe médica nos últimos dias?',
      riscos_proximos: 'Quais são os principais riscos identificados para os próximos plantões?',
    }
    navigate('/chat', { state: { initialMessage: questions[kpiKey] } })
  }

  const chartConfig = useMemo(
    () => ({
      vagas: {
        label: 'Vagas Descobertas',
        color: 'hsl(var(--primary))',
      },
    }),
    [],
  )

  const institutions = useMemo(() => data?.institutions || [], [data?.institutions])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de Conexão</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Nenhum dado encontrado</h3>
        <p className="text-muted-foreground mb-4">Não há dados disponíveis para o período atual.</p>
        <Button onClick={fetchData} variant="outline">
          Atualizar
        </Button>
      </div>
    )
  }

  const kpis = [
    {
      key: 'vagas_descobertas',
      title: 'Vagas Descobertas',
      value: data.kpis.vagas_descobertas.value.toString(),
      trend: data.kpis.vagas_descobertas.trend,
      icon: Briefcase,
    },
    {
      key: 'taxa_ocupacao',
      title: 'Taxa de Ocupação Geral',
      value: `${data.kpis.taxa_ocupacao.value}%`,
      trend: data.kpis.taxa_ocupacao.trend,
      icon: Percent,
    },
    {
      key: 'produtividade',
      title: 'Produtividade',
      value: `${data.kpis.produtividade.value}%`,
      trend: data.kpis.produtividade.trend,
      icon: Activity,
    },
    {
      key: 'riscos_proximos',
      title: 'Riscos Próximos',
      value: data.kpis.riscos_proximos.value.toString(),
      trend: data.kpis.riscos_proximos.trend,
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Executivo</h2>
        <p className="text-muted-foreground">
          Monitore os principais indicadores de desempenho em tempo real.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.key}
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => handleCardClick(kpi.key)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p
                className={cn(
                  'text-xs mt-1 flex items-center',
                  kpi.trend > 0
                    ? 'text-emerald-500'
                    : kpi.trend < 0
                      ? 'text-red-500'
                      : 'text-muted-foreground',
                )}
              >
                {kpi.trend > 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : kpi.trend < 0 ? (
                  <TrendingDown className="mr-1 h-3 w-3" />
                ) : null}
                {kpi.trend > 0 ? '+' : ''}
                {kpi.trend}% em relação à semana anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Evolução Semanal de Vagas Descobertas</CardTitle>
            <CardDescription>Acompanhamento diário das vagas não preenchidas.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart
                accessibilityLayer
                data={data.chart}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="vagas"
                  fill="var(--color-vagas)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Resumo por Instituição</CardTitle>
            <CardDescription>Ocupação atual detalhada por unidade.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instituição</TableHead>
                    <TableHead className="text-right">Totais</TableHead>
                    <TableHead className="text-right">Preenchidas</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell className="text-right">{inst.vagas_totais}</TableCell>
                      <TableCell className="text-right">{inst.vagas_preenchidas}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-bold',
                          inst.taxa_ocupacao < 80 ? 'text-red-500' : 'text-emerald-500',
                        )}
                      >
                        {inst.taxa_ocupacao}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {institutions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Nenhuma instituição encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

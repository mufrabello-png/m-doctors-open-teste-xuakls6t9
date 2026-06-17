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
  Download,
  FileSpreadsheet,
  FileText,
  ChevronRight,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<string>('semanal')
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await pb.send(`/backend/v1/dashboard-kpis?period=${period}`, { method: 'GET' })
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
  }, [period])

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

  const exportCSV = () => {
    if (!data?.institutions) return
    const headers = ['Instituição', 'Totais', 'Preenchidas', 'Taxa de Ocupação']
    const rows = data.institutions.map((i) => [
      `"${i.name}"`,
      i.vagas_totais,
      i.vagas_preenchidas,
      `"${i.taxa_ocupacao}%"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `instituicoes_${period}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: 'Sucesso', description: 'Relatório exportado como CSV.' })
  }

  const exportPDF = () => {
    if (!data?.institutions) return
    const printWindow = window.open('', '', 'height=600,width=800')
    if (!printWindow) {
      toast({
        title: 'Aviso',
        description:
          'Bloqueador de pop-ups impediu a exportação. Permita pop-ups para esta página.',
        variant: 'destructive',
      })
      return
    }
    printWindow.document.write('<html><head><title>Relatório de Instituições</title>')
    printWindow.document.write(
      '<style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background-color:#f4f4f4;}</style>',
    )
    printWindow.document.write('</head><body><h2>Resumo por Instituição</h2>')
    printWindow.document.write(`<p>Período: ${period}</p>`)
    printWindow.document.write('<table>')
    printWindow.document.write(
      '<tr><th>Instituição</th><th>Totais</th><th>Preenchidas</th><th>Taxa de Ocupação</th></tr>',
    )
    data.institutions.forEach((i) => {
      printWindow.document.write(
        `<tr><td>${i.name}</td><td>${i.vagas_totais}</td><td>${i.vagas_preenchidas}</td><td>${i.taxa_ocupacao}%</td></tr>`,
      )
    })
    printWindow.document.write('</table></body></html>')
    printWindow.document.close()
    printWindow.print()
    toast({ title: 'Sucesso', description: 'Relatório preparado para impressão/PDF.' })
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

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-[180px]" />
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

  if (error && !data) {
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

  const kpis = data
    ? [
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
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Executivo</h2>
          <p className="text-muted-foreground">Monitore os principais indicadores de desempenho.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="trimestral">Trimestral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!data && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum dado encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Não há dados disponíveis para o período atual.
          </p>
          <Button onClick={fetchData} variant="outline">
            Atualizar
          </Button>
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <Card
                key={kpi.key}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
                  isLoading && 'opacity-60 pointer-events-none',
                )}
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
                    {kpi.trend}% em relação ao período anterior
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-7">
            <Card className={cn('md:col-span-4 border-0 shadow-sm', isLoading && 'opacity-60')}>
              <CardHeader>
                <CardTitle>Evolução de Vagas Descobertas</CardTitle>
                <CardDescription>
                  Acompanhamento das vagas não preenchidas no período.
                </CardDescription>
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

            <Card className={cn('md:col-span-3 border-0 shadow-sm', isLoading && 'opacity-60')}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Resumo por Instituição</CardTitle>
                  <CardDescription>Ocupação atual detalhada por unidade.</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportCSV}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Exportar como CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportPDF}>
                      <FileText className="mr-2 h-4 w-4" />
                      Exportar como PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                        <TableRow
                          key={inst.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedInstitution(inst.name)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center justify-between">
                              {inst.name}
                              <ChevronRight className="h-3 w-3 text-muted-foreground ml-2 opacity-50" />
                            </div>
                          </TableCell>
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
        </>
      )}

      <InstitutionDrillDown
        institutionName={selectedInstitution}
        open={!!selectedInstitution}
        onOpenChange={(o) => !o && setSelectedInstitution(null)}
      />
    </div>
  )
}

function InstitutionDrillDown({
  institutionName,
  open,
  onOpenChange,
}: {
  institutionName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [shifts, setShifts] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !institutionName) return

    let isMounted = true
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const shiftsRes = await pb.collection('shifts').getList(1, 50, {
          filter: `location ~ "${institutionName}"`,
          sort: '-start_time',
        })

        const alertsRes = await pb.collection('alerts').getList(1, 50, {
          filter: `titulo ~ "${institutionName}" || dados ~ "${institutionName}"`,
          sort: '-created',
        })

        if (isMounted) {
          setShifts(shiftsRes.items)
          setAlerts(alertsRes.items)
        }
      } catch (err: any) {
        console.error('Error fetching institution details', err)
        if (isMounted) setError('Erro ao carregar detalhes da instituição.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [open, institutionName])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{institutionName}</SheetTitle>
          <SheetDescription>
            Detalhamento de operações e alertas para esta instituição.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="shifts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shifts">Plantonistas</TabsTrigger>
              <TabsTrigger value="alerts">Ocorrências</TabsTrigger>
            </TabsList>
            <TabsContent value="shifts" className="mt-4 space-y-4">
              {shifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
                  Nenhum plantonista encontrado para esta instituição no período selecionado.
                </p>
              ) : (
                <div className="space-y-3">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex justify-between items-center p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
                    >
                      <div>
                        <p className="font-medium text-sm">{shift.doctor_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(shift.start_time).toLocaleDateString('pt-BR')} das{' '}
                          {new Date(shift.start_time).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          às{' '}
                          {new Date(shift.end_time).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-xs font-medium px-2 py-1 rounded-full bg-secondary">
                        {shift.status || 'Agendado'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="alerts" className="mt-4 space-y-4">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
                  Nenhuma ocorrência ou alerta registrado para esta instituição.
                </p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle
                          className={cn(
                            'h-4 w-4',
                            alert.severidade === 'alta'
                              ? 'text-red-500'
                              : alert.severidade === 'media'
                                ? 'text-amber-500'
                                : 'text-blue-500',
                          )}
                        />
                        <p className="font-medium text-sm">{alert.titulo || 'Alerta do Sistema'}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-2 opacity-70">
                        Registrado em {new Date(alert.created).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
}

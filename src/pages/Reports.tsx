import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const chartData = [
  { day: 'Seg', hours: 120 },
  { day: 'Ter', hours: 132 },
  { day: 'Qua', hours: 110 },
  { day: 'Qui', hours: 140 },
  { day: 'Sex', hours: 160 },
  { day: 'Sáb', hours: 90 },
  { day: 'Dom', hours: 80 },
]

const tableData = [
  { doc: 'Dr. Roberto Santos', role: 'Plantonista UTI', totalHours: 48, status: 'Regular' },
  { doc: 'Dra. Ana Silva', role: 'Emergência', totalHours: 60, status: 'Hora Extra' },
  { doc: 'Dr. Carlos Mendes', role: 'Cirurgião', totalHours: 36, status: 'Regular' },
]

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Relatórios Gerenciais</h2>
        <p className="text-muted-foreground">
          Análise de dados das escalas e desempenho profissional.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Horas Cobertas na Semana</CardTitle>
            <CardDescription>Distribuição de carga horária por dia da semana.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer
                config={{ hours: { label: 'Horas', color: 'hsl(var(--primary))' } }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Profissionais em Destaque</CardTitle>
            <CardDescription>Resumo de carga horária por médico.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Horas/Semana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.doc}>
                    <TableCell>
                      <p className="font-medium">{row.doc}</p>
                      <p className="text-xs text-muted-foreground">{row.role}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">{row.totalHours}h</span>
                      <p
                        className={`text-[10px] mt-0.5 ${row.status === 'Hora Extra' ? 'text-yellow-600' : 'text-primary'}`}
                      >
                        {row.status}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

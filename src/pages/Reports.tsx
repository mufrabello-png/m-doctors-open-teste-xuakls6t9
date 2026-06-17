import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Lightbulb, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/use-auth'

export default function Reports() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('vagas')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      setLoading(true)
      try {
        const res = await pb.send(`/backend/v1/relatorios?type=${activeTab}`, { method: 'GET' })
        setData(res)
      } catch (err) {
        toast({
          title: 'Erro ao buscar relatórios',
          description: 'Não foi possível contatar o serviço de dados.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeTab, user])

  const renderPagination = () => (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-card rounded-b-lg">
      <div className="text-sm text-muted-foreground">Mostrando página 1 de 1</div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 min-h-[44px]"
          aria-label="Página anterior"
          disabled
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-4 min-h-[44px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          1
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 min-h-[44px]"
          aria-label="Próxima página"
          disabled
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const getCriticidadeBadge = (criticidade: string) => {
    if (criticidade === 'alta')
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Alta</Badge>
    if (criticidade === 'media')
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200">
          Média
        </Badge>
      )
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
        Baixa
      </Badge>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Relatórios Gerenciais
          </h2>
          <p className="text-muted-foreground">
            Visão executiva de vagas, produtividade e riscos operacionais.
          </p>
        </div>
        <Button variant="outline" className="min-h-[44px]">
          <Download className="mr-2 h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none h-12 w-full justify-start gap-4 sm:gap-8 p-0 mb-6 overflow-x-auto">
          <TabsTrigger
            value="vagas"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-2 sm:px-4 h-12 bg-transparent font-medium"
          >
            Vagas Descobertas
          </TabsTrigger>
          <TabsTrigger
            value="produtividade"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-2 sm:px-4 h-12 bg-transparent font-medium"
          >
            Produtividade
          </TabsTrigger>
          <TabsTrigger
            value="riscos"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-2 sm:px-4 h-12 bg-transparent font-medium"
          >
            Riscos Operacionais
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              <TabsContent value="vagas" className="m-0">
                <Card className="border shadow-sm">
                  <CardHeader className="p-4 sm:p-6 pb-4 bg-muted/10 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Escalas sem Médico Alocado</CardTitle>
                      <CardDescription>
                        Acompanhe vagas críticas para preenchimento imediato.
                      </CardDescription>
                    </div>
                    <Button variant="secondary" size="sm" className="min-h-[44px]">
                      <Filter className="h-4 w-4 mr-2" /> Filtros
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table className="[&_th]:bg-muted/50 [&_tr:nth-child(even)]:bg-muted/20 hover:[&_tr]:bg-muted/50 hidden md:table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Instituição</TableHead>
                          <TableHead>Especialidade</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.data}</TableCell>
                            <TableCell>{item.instituicao}</TableCell>
                            <TableCell>{item.especialidade}</TableCell>
                            <TableCell>{item.horario}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Mobile responsive cards view */}
                    <div className="md:hidden flex flex-col gap-3 p-4">
                      {data?.items?.map((item: any) => (
                        <div
                          key={item.id}
                          className="border border-border rounded-lg p-4 shadow-sm bg-card"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-foreground">
                              {item.instituicao}
                            </span>
                            <Badge variant="outline">{item.status}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium">Data:</span> {item.data}
                            </p>
                            <p>
                              <span className="font-medium">Especialidade:</span>{' '}
                              {item.especialidade}
                            </p>
                            <p>
                              <span className="font-medium">Horário:</span> {item.horario}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {renderPagination()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="produtividade" className="m-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border shadow-sm">
                    <CardHeader className="bg-muted/10 border-b">
                      <CardTitle className="text-lg">Tempo de Preenchimento (Horas)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table className="[&_th]:bg-muted/50 [&_tr:nth-child(even)]:bg-muted/20">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Especialidade</TableHead>
                            <TableHead className="text-right">Média</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data?.tempoPreenchimento?.map((item: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{item.especialidade}</TableCell>
                              <TableCell className="text-right">{item.horas}h</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardHeader className="bg-muted/10 border-b">
                      <CardTitle className="text-lg">Taxa de Substituição Alta</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table className="[&_th]:bg-muted/50 [&_tr:nth-child(even)]:bg-muted/20">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Profissional</TableHead>
                            <TableHead className="text-right">Taxa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data?.substituicoes?.map((item: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{item.medico}</TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={cn(
                                    item.status === 'Alto' && 'text-red-600 font-semibold',
                                  )}
                                >
                                  {item.taxa}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="riscos" className="m-0">
                {data?.recomendacao && (
                  <Card className="border-primary/30 bg-primary/5 shadow-sm mb-6">
                    <CardContent className="p-4 sm:p-5 flex gap-4 items-start">
                      <div className="mt-1 p-2 rounded-full bg-primary/20 shrink-0">
                        <Lightbulb className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary mb-1">
                          Recomendação da IA Gestora
                        </h4>
                        <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                          {data.recomendacao}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border shadow-sm">
                  <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg">
                      Fatores de Risco para os Próximos 7 Dias
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table className="[&_th]:bg-muted/50 [&_tr:nth-child(even)]:bg-muted/20 hidden md:table">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Data</TableHead>
                          <TableHead>Descrição do Risco</TableHead>
                          <TableHead className="text-right">Criticidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.data}</TableCell>
                            <TableCell>{item.descricao}</TableCell>
                            <TableCell className="text-right">
                              {getCriticidadeBadge(item.criticidade)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Mobile cards view */}
                    <div className="md:hidden flex flex-col gap-3 p-4">
                      {data?.items?.map((item: any) => (
                        <div
                          key={item.id}
                          className="border border-border rounded-lg p-4 shadow-sm bg-card"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-foreground text-sm">
                              {item.data}
                            </span>
                            {getCriticidadeBadge(item.criticidade)}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.descricao}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  )
}

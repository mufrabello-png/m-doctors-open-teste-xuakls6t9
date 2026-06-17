import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Activity,
  Users,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

export default function Alerts() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [verificando, setVerificando] = useState(false)
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterSeveridade, setFilterSeveridade] = useState('todos')

  const loadAlerts = async () => {
    if (!user) return
    try {
      const records = await pb.collection('alerts').getFullList({
        sort: '-created',
      })
      setAlerts(records)
    } catch (err) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível carregar os alertas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [user])

  useRealtime('alerts', () => {
    loadAlerts()
  })

  const verificarAgora = async () => {
    setVerificando(true)
    try {
      const res = await pb.send('/backend/v1/alertas/verificar', { method: 'POST' })
      toast({
        title: 'Verificação concluída',
        description: `${res.gerados} novos alertas processados.`,
      })
    } catch (err) {
      toast({
        title: 'Erro na verificação',
        description: 'Falha ao contatar o servidor para auditoria.',
        variant: 'destructive',
      })
    } finally {
      setVerificando(false)
    }
  }

  const marcarLido = async (id: string) => {
    try {
      await pb.collection('alerts').update(id, { lido: true })
      toast({ title: 'Alerta marcado como lido' })
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do alerta.',
        variant: 'destructive',
      })
    }
  }

  const unreadAlerts = alerts.filter((a) => !a.lido)
  const summary = {
    vagas: unreadAlerts.filter((a) => a.tipo === 'Vagas sem profissional').length,
    ocupacao: unreadAlerts.filter((a) => a.tipo === 'Taxa de ocupação baixa').length,
    produtividade: unreadAlerts.filter((a) => a.tipo === 'Produtividade').length,
    riscos: unreadAlerts.filter((a) => a.tipo === 'Riscos próximos').length,
  }

  const filteredAlerts = alerts.filter((a) => {
    if (filterTipo !== 'todos' && a.tipo !== filterTipo) return false
    if (filterSeveridade !== 'todos' && a.severidade !== filterSeveridade) return false
    return true
  })

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-red-100',
          border: 'border-red-200',
          text: 'text-red-600',
          icon: ShieldAlert,
        }
      case 'medium':
        return {
          bg: 'bg-yellow-100',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: AlertCircle,
        }
      case 'low':
        return {
          bg: 'bg-green-100',
          border: 'border-green-200',
          text: 'text-green-700',
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

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Skeleton className="h-10 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Central de Alertas</h2>
          <p className="text-muted-foreground">
            Monitoramento proativo e notificações operacionais.
          </p>
        </div>
        <Button
          onClick={verificarAgora}
          disabled={verificando}
          className="min-h-[44px]"
          aria-label="Auditar sistema agora"
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', verificando && 'animate-spin')} />
          {verificando ? 'Auditando...' : 'Verificar Agora'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                Vagas sem profissional
              </p>
              <h3 className="text-2xl font-bold text-foreground">{summary.vagas}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <Users className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                Taxa de ocupação baixa
              </p>
              <h3 className="text-2xl font-bold text-foreground">{summary.ocupacao}</h3>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <Activity className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Produtividade</p>
              <h3 className="text-2xl font-bold text-foreground">{summary.produtividade}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Riscos próximos</p>
              <h3 className="text-2xl font-bold text-foreground">{summary.riscos}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <ShieldAlert className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-muted/30 p-3 rounded-lg border border-border">
        <div className="flex-1 w-full min-w-[200px]">
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger
              className="w-full min-h-[44px] bg-background"
              aria-label="Filtrar por tipo"
            >
              <SelectValue placeholder="Filtrar por Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="Vagas sem profissional">Vagas sem profissional</SelectItem>
              <SelectItem value="Taxa de ocupação baixa">Taxa de ocupação baixa</SelectItem>
              <SelectItem value="Produtividade">Produtividade</SelectItem>
              <SelectItem value="Riscos próximos">Riscos próximos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 w-full min-w-[200px]">
          <Select value={filterSeveridade} onValueChange={setFilterSeveridade}>
            <SelectTrigger
              className="w-full min-h-[44px] bg-background"
              aria-label="Filtrar por severidade"
            >
              <SelectValue placeholder="Filtrar por Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Severidades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-xl border border-border border-dashed">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary opacity-50 mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhum alerta no momento</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Tudo certo com as escalas médicas ou filtros aplicados sem resultados.
            </p>
            <Button onClick={verificarAgora} disabled={verificando} className="min-h-[44px]">
              <RefreshCw className={cn('mr-2 h-4 w-4', verificando && 'animate-spin')} />
              Verificar agora
            </Button>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const styles = getLevelStyles(alert.severidade)
            const Icon = styles.icon

            return (
              <Card
                key={alert.id}
                className={cn(
                  'border transition-colors hover:bg-muted/30',
                  styles.border,
                  alert.lido && 'opacity-60 bg-muted/10',
                )}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className={cn('mt-1 sm:mt-0 p-2 rounded-full shrink-0', styles.bg)}>
                    <Icon className={cn('h-5 w-5', styles.text)} />
                  </div>
                  <div className="flex-1 space-y-1 w-full">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-foreground leading-none">{alert.titulo}</h4>
                      <Badge variant="outline" className="text-xs shrink-0 bg-background">
                        {formatTime(alert.created)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pt-1">{alert.descricao}</p>
                    <p className="text-xs text-muted-foreground opacity-80 pt-1">
                      Tipo: {alert.tipo}
                    </p>
                  </div>
                  {!alert.lido && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => marcarLido(alert.id)}
                      className="shrink-0 min-h-[44px] w-full sm:w-auto"
                      aria-label={`Marcar alerta ${alert.titulo} como lido`}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marcar como lido
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

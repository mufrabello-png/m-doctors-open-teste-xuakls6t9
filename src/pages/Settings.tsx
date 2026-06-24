import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useSystemConfigs } from '@/hooks/use-system-configs'
import { useEffect, useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

const settingsSchema = z.object({
  doctorid_url: z.string().url('URL inválida.').min(1, 'Campo obrigatório.'),
  duuid_token: z.string().min(1, 'Campo obrigatório.'),
  openai_key: z.string().min(1, 'Campo obrigatório.'),
})

export default function Settings() {
  const { toast } = useToast()
  const { configs, saveConfigs, loading } = useSystemConfigs()
  const [testingConnection, setTestingConnection] = useState(false)

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const res = await pb.send('/backend/v1/doctor-id/test-connection', { method: 'GET' })
      toast({
        title: 'Conexão bem-sucedida',
        description: `Conexão bem-sucedida: ${res.count ?? 0} plantões encontrados.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro de Conexão',
        description: err.response?.message || err.message || 'Falha ao conectar com a API',
        variant: 'destructive',
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      doctorid_url: '',
      duuid_token: '',
      openai_key: '',
    },
  })

  useEffect(() => {
    if (!loading) {
      form.reset({
        doctorid_url: configs.doctorid_url || '',
        duuid_token: configs.duuid_token || '',
        openai_key: configs.openai_key || '',
      })
    }
  }, [configs, loading, form])

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    const { error } = await saveConfigs(values)
    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar as configurações. Tente novamente.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso!',
      })
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie as integrações de API e chaves de segurança.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Credenciais do Sistema</CardTitle>
          <CardDescription>
            Estas informações são armazenadas de forma criptografada para integração segura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4 text-center py-4 text-muted-foreground">
              Carregando configurações...
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="doctorid_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Base API DoctorID</FormLabel>
                        <FormControl>
                          <Input
                            className="h-11"
                            placeholder="https://api.doctorid.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duuid_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token DUUID</FormLabel>
                        <FormControl>
                          <Input
                            className="h-11"
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openai_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave OpenAI</FormLabel>
                        <FormControl>
                          <Input
                            className="h-11"
                            type="password"
                            placeholder="sk-••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end pt-4 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full sm:w-auto px-8"
                    onClick={handleTestConnection}
                    disabled={testingConnection || loading}
                  >
                    {testingConnection ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="mr-2 h-4 w-4" />
                    )}
                    Testar Conexão
                  </Button>
                  <Button type="submit" className="h-11 w-full sm:w-auto px-8" disabled={loading}>
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

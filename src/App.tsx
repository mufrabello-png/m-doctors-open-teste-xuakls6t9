import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from '@/components/Layout'
import { PageSkeleton } from '@/components/page-skeleton'
import { ErrorBoundary } from '@/components/error-boundary'
import { AuthProvider } from '@/hooks/use-auth'

// Lazy loaded pages to optimize performance as requested
const Login = lazy(() => import('@/pages/Login'))
const Index = lazy(() => import('@/pages/Index'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Chat = lazy(() => import('@/pages/Chat'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const Reports = lazy(() => import('@/pages/Reports'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const App = () => (
  <AuthProvider>
    <ErrorBoundary>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense
            fallback={
              <div className="h-screen w-screen flex flex-col">
                <PageSkeleton />
              </div>
            }
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </AuthProvider>
)

export default App

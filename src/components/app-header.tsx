import { useLocation } from 'react-router-dom'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppHeader() {
  const location = useLocation()
  const { isMobile } = useSidebar()

  const getPageTitle = () => {
    if (location.pathname.includes('/dashboard')) return 'Dashboard'
    if (location.pathname.includes('/chat')) return 'Chat Inteligente'
    if (location.pathname.includes('/alerts')) return 'Alertas'
    if (location.pathname.includes('/reports')) return 'Relatórios'
    if (location.pathname.includes('/settings')) return 'Configurações'
    return 'M Doctors'
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger className="h-11 w-11" />}
        <h1 className={cn('text-xl font-semibold text-foreground', isMobile && 'mx-auto')}>
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 relative text-muted-foreground hover:text-primary"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-destructive border-2 border-white" />
        </Button>
        <Avatar className="h-10 w-10 border-2 border-border cursor-pointer transition-transform hover:scale-105">
          <AvatarImage
            src="https://img.usecurling.com/ppl/thumbnail?gender=female&seed=2"
            alt="Dr. User"
          />
          <AvatarFallback>MD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}

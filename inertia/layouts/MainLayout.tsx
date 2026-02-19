import React from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { Home, Activity, Calendar, User, LogOut, ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import logo from '~/assets/logo.png'

interface AuthUser {
  id: number
  fullName: string
  role: string
}

interface SharedProps {
  auth?: { user: AuthUser | null }
}

const navItems = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/sessions', label: 'Séances', icon: Activity },
  { href: '/planning', label: 'Planning', icon: Calendar },
  { href: '/profile', label: 'Profil', icon: User },
]

function useIsActive(href: string) {
  const { url } = usePage()
  if (href === '/') return url === '/'
  return url === href || url.startsWith(href + '/')
}

function SidebarLink({ href, label, icon: Icon }: (typeof navItems)[number]) {
  const active = useIsActive(href)
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  )
}

function TabBarItem({ href, label, icon: Icon }: (typeof navItems)[number]) {
  const active = useIsActive(href)
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { auth } = usePage<SharedProps>().props

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Sporty" className="h-8 w-8" />
          <span className="text-lg font-semibold">Sporty</span>
        </div>
        <Avatar>
          <AvatarFallback>{auth?.user?.fullName?.charAt(0)?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </header>

      {/* Sidebar desktop */}
      <aside className="fixed top-14 bottom-0 left-0 hidden w-60 flex-col border-r bg-background p-4 md:flex">
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <SidebarLink key={item.href} {...item} />
          ))}
          {auth?.user?.role === 'admin' && (
            <SidebarLink href="/admin/users" label="Administration" icon={ShieldCheck} />
          )}
        </nav>
        <button
          onClick={() => router.post('/logout')}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          Se déconnecter
        </button>
      </aside>

      {/* Main content */}
      <main className="pt-14 pb-16 md:ml-60 md:pb-0">{children}</main>

      {/* Bottom tab bar mobile */}
      <nav className="fixed bottom-0 right-0 left-0 z-40 flex h-16 border-t bg-background md:hidden">
        {navItems.map((item) => (
          <TabBarItem key={item.href} {...item} />
        ))}
      </nav>
    </div>
  )
}

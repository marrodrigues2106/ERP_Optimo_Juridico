import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { specialtiesData } from '@/data/content'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isHome = location.pathname === '/'

  const headerClass = cn(
    'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b',
    scrolled
      ? 'bg-background/95 backdrop-blur-md border-border py-4 shadow-sm'
      : isHome
        ? 'bg-transparent border-transparent py-6 text-white'
        : 'bg-background border-border py-6 text-foreground',
  )

  const linkClass = cn(
    'text-sm font-medium hover:text-accent transition-colors',
    !scrolled && isHome ? 'text-white/90 hover:text-white' : 'text-foreground/80',
  )

  return (
    <header className={headerClass}>
      <div className="container px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <Scale
            className={cn(
              'w-8 h-8 transition-colors',
              !scrolled && isHome ? 'text-white' : 'text-primary group-hover:text-accent',
            )}
          />
          <div className="flex flex-col">
            <span
              className={cn(
                'font-serif font-bold text-lg leading-none tracking-wide',
                !scrolled && isHome ? 'text-white' : 'text-primary',
              )}
            >
              MORAES RODRIGUES
            </span>
            <span
              className={cn(
                'text-[0.65rem] uppercase tracking-[0.2em] font-medium mt-1',
                !scrolled && isHome ? 'text-white/70' : 'text-muted-foreground',
              )}
            >
              Advocacia Especializada
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          <Link to="/" className={linkClass}>
            Início
          </Link>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    'bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent data-[active]:bg-transparent h-auto p-0 font-medium',
                    linkClass,
                  )}
                >
                  Especialidades
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {specialtiesData.map((spec) => (
                      <li key={spec.id}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={`/especialidades/${spec.id}`}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
                          >
                            <div className="text-sm font-medium leading-none mb-2">
                              {spec.title}
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {spec.shortDesc}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <Link to="/equipe" className={linkClass}>
            Equipe
          </Link>
          <Link to="/contato" className={linkClass}>
            Contato
          </Link>

          <Button
            className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-[0_0_15px_rgba(22,163,74,0.3)] ml-4 group transition-all"
            asChild
          >
            <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
              Consulta via WhatsApp
            </a>
          </Button>
        </div>

        {/* Mobile Nav */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  !scrolled && isHome
                    ? 'text-white hover:bg-white/10'
                    : 'text-primary hover:bg-primary/5',
                )}
              >
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-background border-l-border">
              <SheetTitle className="font-serif text-xl mb-8 mt-4 text-primary">
                Menu Principal
              </SheetTitle>
              <div className="flex flex-col gap-6">
                <SheetClose asChild>
                  <Link to="/" className="text-lg font-medium">
                    Início
                  </Link>
                </SheetClose>
                <div className="text-lg font-medium border-b pb-2 text-primary">Especialidades</div>
                <div className="flex flex-col gap-4 pl-4 border-l-2 border-accent/20">
                  {specialtiesData.map((spec) => (
                    <SheetClose key={spec.id} asChild>
                      <Link
                        to={`/especialidades/${spec.id}`}
                        className="text-muted-foreground hover:text-accent font-medium"
                      >
                        {spec.title}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
                <SheetClose asChild>
                  <Link to="/equipe" className="text-lg font-medium">
                    Equipe
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/contato" className="text-lg font-medium">
                    Contato
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white mt-4 h-12 text-base"
                    asChild
                  >
                    <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                      Falar no WhatsApp
                    </a>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

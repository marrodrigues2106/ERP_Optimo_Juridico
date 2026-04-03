import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Menu, X, Instagram, Facebook, Phone as WhatsappIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { firmData, specialtiesData } from '@/data/content'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import logoImg from '../assets/logo-mr-advocacia-mk39e5yk0rfrezeo-007ff.png'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { Search } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Input } from '@/components/ui/input'
import { getClients } from '@/services/clients'
import { getCollaborators } from '@/services/collaborators'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const { isAuthenticated, signOut, user } = useAuth()
  const navigate = useNavigate()

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [orgLogo, setOrgLogo] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string>('')

  useEffect(() => {
    if (isAuthenticated) {
      getClients()
        .then(setClients)
        .catch(() => {})
      getCollaborators()
        .then(setCollaborators)
        .catch(() => {})

      if (user?.active_organization) {
        pb.collection('organizations')
          .getOne(user.active_organization)
          .then((org) => {
            if (org.logo) {
              setOrgLogo(pb.files.getURL(org, org.logo))
            }
            setOrgName(org.name)
          })
          .catch(() => {})
      }
    } else {
      pb.collection('organizations')
        .getFirstListItem('')
        .then((org) => {
          if (org.logo) {
            setOrgLogo(pb.files.getURL(org, org.logo))
          }
          setOrgName(org.name)
        })
        .catch(() => {})
    }
  }, [isAuthenticated, user])

  const isIntranet = pathname.startsWith('/intranet')

  const confirmLogout = () => {
    setLogoutDialogOpen(false)
    signOut()
    navigate('/login')
  }

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <header
      className={cn(
        'fixed top-0 w-full z-50 transition-all duration-300 border-b',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-gray-200 py-1'
          : 'bg-[#F9F9F9] border-transparent py-2',
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={isIntranet ? '/intranet' : '/'}
            className="flex items-center gap-2"
            onClick={closeMenu}
          >
            <div className="flex items-center">
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt={orgName || 'Moraes Rodrigues Advocacia'}
                  className="h-10 md:h-12 w-auto object-contain transition-all duration-300"
                />
              ) : (
                <span className="font-bold text-xl md:text-2xl text-primary tracking-tight whitespace-nowrap">
                  {orgName || 'MRA'}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {isIntranet && (
            <div className="hidden md:flex relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar processos, clientes..."
                className="pl-8 h-9 w-64 bg-slate-50 border-slate-200 focus-visible:ring-1"
              />
            </div>
          )}
          {!isIntranet ? (
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild active={pathname === '/'}>
                    <Link
                      to="/"
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'bg-transparent text-foreground hover:bg-transparent hover:text-secondary text-base font-medium',
                        pathname === '/' &&
                          'border-b-2 border-secondary rounded-none text-secondary',
                      )}
                    >
                      Início
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      'bg-transparent text-foreground hover:bg-transparent hover:text-secondary text-base font-medium',
                      pathname.includes('/especialidade') && 'text-secondary',
                    )}
                  >
                    Nossas Especialidades
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-white">
                      {specialtiesData.map((spec) => (
                        <li key={spec.id}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={`/especialidade/${spec.id}`}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-50 hover:text-secondary focus:bg-slate-50 focus:text-secondary"
                            >
                              <div className="text-sm font-medium leading-none font-serif text-primary">
                                {spec.title}
                              </div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-2">
                                {spec.shortDescription}
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild active={pathname === '/artigos'}>
                    <Link
                      to="/artigos"
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'bg-transparent text-foreground hover:bg-transparent hover:text-secondary text-base font-medium',
                        pathname === '/artigos' &&
                          'border-b-2 border-secondary rounded-none text-secondary',
                      )}
                    >
                      Artigos
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild active={pathname.includes('/login')}>
                    <Link
                      to={isAuthenticated ? '/intranet' : '/login'}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'bg-transparent text-foreground hover:bg-transparent hover:text-secondary text-base font-medium',
                        pathname.includes('/login') &&
                          'border-b-2 border-secondary rounded-none text-secondary',
                      )}
                    >
                      Acesso Restrito
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a
                      href="/#contato"
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'bg-transparent text-foreground hover:bg-transparent hover:text-secondary text-base font-medium',
                      )}
                    >
                      Contato
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          ) : (
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      to="/"
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'bg-transparent text-foreground hover:bg-transparent hover:text-secondary text-base font-medium',
                      )}
                    >
                      Ver Site Público
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <button
                      onClick={() => setLogoutDialogOpen(true)}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'bg-transparent text-foreground hover:bg-transparent hover:text-secondary text-base font-medium cursor-pointer',
                      )}
                    >
                      Sair
                    </button>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}

          <div className="flex items-center gap-5 text-primary/80 ml-2">
            {isIntranet ? (
              <></>
            ) : (
              <>
                <a
                  href={firmData.socials.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-secondary transition-colors"
                >
                  <WhatsappIcon size={20} />
                </a>
                <a
                  href={firmData.socials.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-secondary transition-colors"
                >
                  <Facebook size={20} />
                </a>
                <a
                  href={firmData.socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-secondary transition-colors"
                >
                  <Instagram size={20} />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden p-2 text-primary"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso encerrará sua sessão na intranet. Você precisará fazer login novamente para
              acessar o painel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>Sair da conta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-t shadow-lg py-4 px-4 flex flex-col gap-4 animate-in slide-in-from-top-2 max-h-[calc(100vh-64px)] overflow-y-auto pb-24">
          {!isIntranet ? (
            <>
              <Link
                to="/"
                className="text-lg font-medium py-2 border-b text-primary"
                onClick={closeMenu}
              >
                Início
              </Link>
              <div className="py-2 border-b">
                <span className="text-lg font-medium mb-2 block text-primary">
                  Nossas Especialidades
                </span>
                <div className="flex flex-col gap-2 pl-4">
                  {specialtiesData.map((spec) => (
                    <Link
                      key={spec.id}
                      to={`/especialidade/${spec.id}`}
                      className="text-muted-foreground py-1 hover:text-secondary"
                      onClick={closeMenu}
                    >
                      {spec.title}
                    </Link>
                  ))}
                </div>
              </div>
              <Link
                to="/artigos"
                className="text-lg font-medium py-2 border-b text-primary"
                onClick={closeMenu}
              >
                Artigos
              </Link>
              <Link
                to={isAuthenticated ? '/intranet' : '/login'}
                className="text-lg font-medium py-2 border-b text-primary"
                onClick={closeMenu}
              >
                Acesso Restrito
              </Link>
              <a
                href="/#contato"
                className="text-lg font-medium py-2 border-b text-primary"
                onClick={closeMenu}
              >
                Contato
              </a>
              <div className="flex items-center gap-6 mt-4 justify-center text-primary/80">
                <a href={firmData.socials.whatsapp} target="_blank" rel="noreferrer">
                  <WhatsappIcon size={24} />
                </a>
                <a href={firmData.socials.facebook} target="_blank" rel="noreferrer">
                  <Facebook size={24} />
                </a>
                <a href={firmData.socials.instagram} target="_blank" rel="noreferrer">
                  <Instagram size={24} />
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="py-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar processos..."
                    className="pl-8 h-10 w-full bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
              <Link
                to="/"
                className="text-lg font-medium py-2 border-b text-primary"
                onClick={closeMenu}
              >
                Ver Site Público
              </Link>
              <button
                className="text-lg font-medium py-2 border-b text-primary text-left w-full"
                onClick={() => {
                  closeMenu()
                  setLogoutDialogOpen(true)
                }}
              >
                Sair
              </button>
            </>
          )}
        </div>
      )}
    </header>
  )
}

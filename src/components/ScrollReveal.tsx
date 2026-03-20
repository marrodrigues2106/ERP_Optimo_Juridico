import { ReactNode } from 'react'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  className?: string
  animation?: string
}

export function ScrollReveal({ children, className, animation = 'animate-fade-in-up' }: Props) {
  const { ref, isVisible } = useScrollReveal()

  return (
    <div ref={ref} className={cn(isVisible ? animation : 'invisible', className)}>
      {children}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegalCase, updateLegalCase, getLegalCases } from '@/services/legal_cases'
import { getFinancesByLawsuit } from '@/services/finances'
import { getPaginatedCaseMovements, createCaseMovement } from '@/services/case_movements'
import { getInteractionsByLawsuit, createInteraction } from '@/services/crm_interactions'
import { getAgendaEventsByLawsuit } from '@/services/agenda'
import { getTasksByLawsuit, createTask, updateTask } from '@/services/tasks'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Briefcase, User, Plus, RefreshCw, Clock, Bell, Link as LinkIcon, X, FileText, MessageSquare, Scale, Calendar, ChevronLeft, ChevronRight, Info, DollarSign, Check, Phone, Mail, Users, StickyNote, Trash2 } from 'lucide-react'
import { EventFormModal } from './cases/EventFormModal'
import { runDatajudSync } from '@/lib/datajud/sync'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import pb from '@/lib/pocketbase/client'
import { Label } from '@/components/ui/label'

const renderMovementText = (text: string) => {
  if (!text) return text
  const keywords = ['NÚMERO ÚNICO:', 'POLO ATIVO', 'POLO PASSIVO', 'ADVOGADO \\(A/S\\)', 'DATA DE DISPONIBILIZAÇÃO:', 'DATA DE PUBLICAÇÃO:']
  const regex = new RegExp(`(${keywords.join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) => {
    if (keywords.some((k) => new RegExp(`^${k}<skip-file path="src/hooks/use-realtime.ts" type="typescript">
import { useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordSubscription } from 'pocketbase'

/**
 * Hook for real-time subscriptions to a PocketBase collection.
 * Includes a debounce mechanism to prevent request storms.
 */
export function useRealtime(
  collectionName: string,
  callback: (data: RecordSubscription<any>) => void,
  enabled: boolean = true,
  debounceMs: number = 300
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false

    pb.collection(collectionName)
      .subscribe('*', (e) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          if (!cancelled) callbackRef.current(e)
        }, debounceMs)
      })
      .then((fn) => {
        if (cancelled) {
          fn().catch(() => {})
        } else {
          unsubscribeFn = fn
        }
      })

    return () => {
      cancelled = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled, debounceMs])
}

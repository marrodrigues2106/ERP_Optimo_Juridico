import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getSettingByKey, setSettingByKey } from '@/services/settings'

export interface ComunicaHistoryEntry {
  term: string
  timestamp: string
  status: 'pending' | 'success' | 'error'
  resultsCount: number
  message: string
}

interface ComunicaContextType {
  baseUrl: string
  apiKey: string
  searchHistory: ComunicaHistoryEntry[]
  init: () => Promise<void>
  setSettings: (baseUrl: string, apiKey: string) => Promise<void>
  addHistory: (entry: ComunicaHistoryEntry) => void
  clearHistory: () => void
}

const ComunicaContext = createContext<ComunicaContextType | undefined>(undefined)

export const useComunicaStore = () => {
  const context = useContext(ComunicaContext)
  if (!context) throw new Error('useComunicaStore must be used within ComunicaProvider')
  return context
}

export const ComunicaProvider = ({ children }: { children: ReactNode }) => {
  const [baseUrl, setBaseUrl] = useState('https://comunicaapi.pje.jus.br/api/v1')
  const [apiKey, setApiKey] = useState('')
  const [searchHistory, setSearchHistory] = useState<ComunicaHistoryEntry[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('comunica-history')
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse comunica-history', e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('comunica-history', JSON.stringify(searchHistory))
  }, [searchHistory])

  useEffect(() => {
    const savedBaseUrl = localStorage.getItem('comunica-baseUrl')
    const savedApiKey = localStorage.getItem('comunica-apiKey')
    if (savedBaseUrl) setBaseUrl(savedBaseUrl)
    if (savedApiKey) setApiKey(savedApiKey)
  }, [])

  const init = async () => {
    try {
      const baseUrlRecord = await getSettingByKey('comunica_base_url')
      const apiKeyRecord = await getSettingByKey('comunica_api_key')
      if (baseUrlRecord?.value) {
        setBaseUrl(baseUrlRecord.value)
        localStorage.setItem('comunica-baseUrl', baseUrlRecord.value)
      }
      if (apiKeyRecord?.value) {
        setApiKey(apiKeyRecord.value)
        localStorage.setItem('comunica-apiKey', apiKeyRecord.value)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const setSettings = async (newBaseUrl: string, newApiKey: string) => {
    try {
      await setSettingByKey('comunica_base_url', newBaseUrl)
      await setSettingByKey('comunica_api_key', newApiKey)
    } catch (e) {
      console.error(e)
    }
    setBaseUrl(newBaseUrl)
    setApiKey(newApiKey)
    localStorage.setItem('comunica-baseUrl', newBaseUrl)
    localStorage.setItem('comunica-apiKey', newApiKey)
  }

  const addHistory = (entry: ComunicaHistoryEntry) => {
    setSearchHistory((prev) => {
      const newHistory = [entry, ...prev].slice(0, 50)
      return newHistory
    })
  }

  const clearHistory = () => {
    setSearchHistory([])
  }

  return (
    <ComunicaContext.Provider
      value={{ baseUrl, apiKey, searchHistory, init, setSettings, addHistory, clearHistory }}
    >
      {children}
    </ComunicaContext.Provider>
  )
}

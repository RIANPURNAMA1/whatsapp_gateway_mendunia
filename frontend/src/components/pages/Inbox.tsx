import { useEffect, useState, useCallback } from 'react'
import { 
  Search, MessageSquare, Loader2, 
  ChevronLeft, ChevronRight, ArrowDownLeft, 
  RefreshCcw, Smartphone, User, Phone, Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Badge } from '@/components/ui/elements'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/overlay'
import { Textarea } from '@/components/ui/elements'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useSocket } from '@/hooks/useSocket'

  interface MessageLog {
  id: number
  session_id: number
  direction: 'incoming' | 'outgoing'
  from_number: string
  from_name?: string
  to_number: string
  message_type: string
  content: string
  createdAt?: string
  created_at?: string
  is_read: number
}

export default function MessageLogPage() {
  const [logs, setLogs] = useState<MessageLog[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const socket = useSocket()

  // Send message state
  const [sendOpen, setSendOpen] = useState(false)
  const [sendTo, setSendTo] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [sending, setSending] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const r = await api.get('/messages/inbox/chats')
      if (r.data.success) {
        setLogs(r.data.data)
      }
    } catch (e: any) {
      console.error('Error fetching logs:', e)
      toast.error("Gagal memuat daftar pesan")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (!socket) return
    const handleIncoming = (data: { from: string; from_name: string; content: string; timestamp: string }) => {
      setLogs(prev => {
        const newLog: MessageLog = {
          id: Date.now(),
          session_id: data.sessionId || 0,
          direction: 'incoming',
          from_number: data.from,
          from_name: data.from_name || data.from,
          to_number: '',
          message_type: 'text',
          content: data.content,
          createdAt: data.timestamp,
          is_read: 0,
        }
        return [newLog, ...prev]
      })
    }
    socket.on('incoming_message', handleIncoming)
    return () => { socket.off('incoming_message', handleIncoming) }
  }, [socket])

  // --- Fungsi Format Nomor HP ---
  const formatNumber = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    return `+${clean}`;
  }

  const handleSendMessage = async () => {
    if (!sendTo.trim() || !sendMessage.trim()) {
      toast.error('Nomor dan pesan harus diisi')
      return
    }
    setSending(true)
    try {
      const sessionsRes = await api.get('/sessions')
      const connectedSession = sessionsRes.data.data.find((s: any) => s.status === 'connected')
      
      if (!connectedSession) {
        toast.error('Tidak ada perangkat WhatsApp terhubung')
        setSending(false)
        return
      }

      await api.post(`/sessions/${connectedSession.id}/send`, {
        phone: sendTo.replace(/\D/g, ''),
        message: sendMessage
      })
      toast.success('Pesan terkirim!')
      setSendOpen(false)
      setSendTo('')
      setSendMessage('')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal mengirim pesan')
    } finally {
      setSending(false)
    }
  }

  // Filter pencarian berdasarkan Nama atau Nomor atau Isi Pesan
  const filteredLogs = logs.filter(log => 
    log.from_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.from_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.content?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Log Pesan Masuk</h1>
          <p className="text-sm text-slate-500 font-medium">Monitoring aktivitas & nama pengirim secara real-time</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchLogs} 
            disabled={loading}
            className="bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
          >
            <RefreshCcw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh Data
          </Button>
          <Button 
            variant="wa"
            onClick={() => setSendOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Kirim Pesan
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-md bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Cari nama, nomor, atau pesan..." 
            className="pl-10 border-none bg-transparent focus-visible:ring-0 h-12 text-sm"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[15%]">Waktu</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[25%]">Pengirim (WA)</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[35%]">Isi Pesan</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-[12%]">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right w-[13%]">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-green-500 opacity-40" />
                    <span className="text-slate-400 font-bold italic">Menghubungkan ke database...</span>
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-all group">
                    {/* Kolom Waktu */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(log.createdAt || log.created_at) ? (
                        <>
                          <div className="text-slate-700 font-bold">
                            {new Date(log.createdAt || log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className="text-[11px] text-slate-400 font-bold">
                            {new Date(log.createdAt || log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Kolom Pengirim (NAMA & NOMOR) */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border border-green-100 group-hover:bg-white transition-colors shadow-sm">
                           <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800 tracking-tight line-clamp-1 capitalize">
                            {log.from_name || "Tanpa Nama"}
                          </span>
                          <div className="flex items-center text-[10px] text-slate-400 font-bold mt-0.5">
                            <Phone className="w-2.5 h-2.5 mr-1" />
                            {formatNumber(log.from_number)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Kolom Isi Pesan */}
                    <td className="px-6 py-4">
                      <div className="max-w-[350px] text-slate-600 leading-relaxed font-medium break-words">
                        {log.content || <span className="italic text-slate-300">File Media / Kosong</span>}
                      </div>
                    </td>

                    {/* Kolom Arah Pesan */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <Badge className="bg-green-100/50 text-green-700 border-green-200 text-[10px] font-black uppercase py-1 px-3 shadow-none rounded-full">
                           <ArrowDownLeft className="w-3 h-3 mr-1" /> Masuk
                        </Badge>
                      </div>
                    </td>

                    {/* Kolom Device */}
                    <td className="px-6 py-4 text-right">
                       <div className="inline-flex items-center justify-end gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-500 font-black border border-slate-200">
                         <span className="text-[10px]">SESSION {log.session_id}</span>
                         <Smartphone className="w-3.5 h-3.5" />
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center opacity-25">
                      <MessageSquare className="w-16 h-16 mb-4 text-slate-400" />
                      <p className="text-lg font-black text-slate-500 uppercase">Tidak Ada Data</p>
                      <p className="text-sm font-medium">Coba sesuaikan kata kunci pencarian Anda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Halaman {currentPage} / {totalPages || 1} — {filteredLogs.length} Entri
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(p => p - 1)
                window.scrollTo(0,0)
              }}
              className="h-9 px-4 bg-white font-bold text-xs shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            
            <div className="hidden md:flex items-center gap-1.5 mx-2">
               {Array.from({ length: totalPages }, (_, i) => i + 1)
                 .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                 .map((page, i, arr) => (
                   <div key={page} className="flex items-center">
                     {i > 0 && arr[i-1] !== page - 1 && <span className="text-slate-300 mx-1">...</span>}
                     <button
                       onClick={() => {
                         setCurrentPage(page)
                         window.scrollTo(0,0)
                       }}
                       className={cn(
                         "w-9 h-9 rounded-xl text-xs font-black transition-all border",
                         currentPage === page 
                          ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-110" 
                          : "bg-white hover:bg-slate-100 text-slate-500 border-slate-200"
                       )}
                     >
                       {page}
                     </button>
                   </div>
                 ))
               }
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => {
                setCurrentPage(p => p + 1)
                window.scrollTo(0,0)
              }}
              className="h-9 px-4 bg-white font-bold text-xs shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 opacity-50">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          Live Monitoring Active
        </p>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Kirim Pesan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nomor WhatsApp</label>
              <Input
                placeholder="6281234567890"
                value={sendTo}
                onChange={e => setSendTo(e.target.value)}
              />
              <p className="text-xs text-slate-400">Contoh: 6281234567890</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Pesan</label>
              <Textarea
                placeholder="Ketik pesan..."
                className="min-h-[100px]"
                value={sendMessage}
                onChange={e => setSendMessage(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendOpen(false)}>Batal</Button>
              <Button 
                variant="wa" 
                onClick={handleSendMessage}
                disabled={sending || !sendTo.trim() || !sendMessage.trim()}
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Kirim
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
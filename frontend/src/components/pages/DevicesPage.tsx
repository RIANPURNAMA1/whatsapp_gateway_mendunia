import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/elements'
import { Input, Label, Badge } from '@/components/ui/elements'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/overlay'
import { Smartphone, Plus, Wifi, WifiOff, Trash2, RefreshCw, QrCode, Loader2, PhoneCall } from 'lucide-react'
import api from '@/lib/api'
import type { WaSession } from '@/types'
import toast from 'react-hot-toast'
import { useSocket } from '@/hooks/useSocket'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

const statusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  connected: { label: 'Terhubung', variant: 'success' },
  connecting: { label: 'Menghubungkan...', variant: 'warning' },
  disconnected: { label: 'Terputus', variant: 'secondary' },
  banned: { label: 'Diblokir', variant: 'destructive' },
}

export default function DevicesPage() {
  const [sessions, setSessions] = useState<WaSession[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrData, setQrData] = useState<{ sessionId: number; qr: string } | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [connectingId, setConnectingId] = useState<number | null>(null)
  const socket = useSocket()

  const fetchSessions = useCallback(async () => {
    try {
      const r = await api.get('/sessions')
      setSessions(r.data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (!socket) return
    const handleQr = (data: { sessionId: number; qr: string }) => {
      setQrData(data)
      setQrOpen(true)
      setConnectingId(null)
    }
    const handleStatus = (data: { sessionId: number; status: string; phoneNumber?: string }) => {
      setSessions(prev => prev.map(s => s.id === data.sessionId
        ? { ...s, status: data.status as WaSession['status'], phone_number: data.phoneNumber || s.phone_number }
        : s
      ))
      if (data.status === 'connected') {
        toast.success(`Perangkat berhasil terhubung!`)
        setQrOpen(false)
        setQrData(null)
      }
    }
    socket.on('qr_code', handleQr)
    socket.on('session_status', handleStatus)
    return () => {
      socket.off('qr_code', handleQr)
      socket.off('session_status', handleStatus)
    }
  }, [socket])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await api.post('/sessions', { session_name: newName })
      toast.success('Perangkat ditambahkan')
      setAddOpen(false)
      setNewName('')
      fetchSessions()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal menambahkan')
    } finally {
      setCreating(false)
    }
  }

  const handleConnect = async (id: number) => {
    setConnectingId(id)
    try {
      await api.post(`/sessions/${id}/connect`)
      toast.success('Menghubungkan... Tunggu QR Code')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal menghubungkan')
      setConnectingId(null)
    }
  }

  const handleDisconnect = async (id: number) => {
    try {
      await api.post(`/sessions/${id}/disconnect`)
      toast.success('Perangkat terputus')
      fetchSessions()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal memutus')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus perangkat ini?')) return
    try {
      await api.delete(`/sessions/${id}`)
      toast.success('Perangkat dihapus')
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch (e: any) {
      toast.error('Gagal menghapus')
    }
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Perangkat WhatsApp</h1>
          <p className="text-sm text-slate-500">Kelola sesi WhatsApp yang terhubung</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="wa" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Tambah Perangkat
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-xl border animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-16 text-center">
            <Smartphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">Belum ada perangkat</p>
            <p className="text-sm text-slate-400 mt-1">Tambahkan perangkat WhatsApp untuk mulai blast</p>
            <Button variant="wa" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Tambah Perangkat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(session => {
            const sb = statusBadge[session.status] || statusBadge.disconnected
            return (
              <Card key={session.id} className="card-hover border-slate-100">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.status === 'connected' ? 'bg-green-50' : 'bg-slate-100'}`}>
                        <Smartphone className={`w-5 h-5 ${session.status === 'connected' ? 'text-green-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{session.session_name}</CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {session.phone_number ? `+${session.phone_number}` : 'Belum terhubung'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={sb.variant}>{sb.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.last_connected && (
                    <p className="text-xs text-slate-400">
                      Terakhir: {formatDistanceToNow(new Date(session.last_connected), { locale: id, addSuffix: true })}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {session.status === 'connected' ? (
                      <Button variant="outline" size="sm" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDisconnect(session.id)}>
                        <WifiOff className="w-3.5 h-3.5" /> Putuskan
                      </Button>
                    ) : (
                      <Button variant="wa" size="sm" className="flex-1" onClick={() => handleConnect(session.id)} disabled={connectingId === session.id}>
                        {connectingId === session.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                        {connectingId === session.id ? 'Menghubungkan...' : 'Hubungkan'}
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(session.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Device Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Perangkat WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nama Perangkat</Label>
              <Input
                placeholder="Contoh: WA Utama, WA Marketing"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button variant="wa" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Tambahkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-green-600" /> Scan QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-sm text-slate-500">Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Scan QR</p>
            {qrData?.qr ? (
              <div className="flex justify-center p-4 bg-white border-2 border-green-100 rounded-xl">
                <img src={qrData.qr} alt="QR Code" className="w-52 h-52" />
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-green-50 rounded-lg px-3 py-2">
              <PhoneCall className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              QR akan kadaluarsa dalam 60 detik. Refresh otomatis jika butuh QR baru.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { Link as LinkIcon, Plus, Trash2, Play, Pause, RefreshCw, Loader2, CheckCircle, XCircle, Send, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/elements'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/overlay'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface ExternalConnection {
  id: number
  name: string
  api_url: string
  api_token: string
  device_id: string | null
  is_active: number
  last_connected: string | null
  created_at: string
}

interface Device {
  id: number
  session_name: string
  status: string
}

export default function ExternalConnectionsPage() {
  const [connections, setConnections] = useState<ExternalConnection[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [testLoading, setTestLoading] = useState<number | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<ExternalConnection | null>(null)
  const [form, setForm] = useState({
    name: '',
    api_url: '',
    api_token: '',
    device_id: ''
  })

  const fetchConnections = useCallback(async () => {
    try {
      const r = await api.get('/external')
      if (r.data.success) setConnections(r.data.data)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDevices = async () => {
    try {
      const r = await api.get('/sessions')
      if (r.data.success) setDevices(r.data.data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { 
    fetchConnections() 
    fetchDevices()
  }, [fetchConnections])

  const handleCreate = async () => {
    if (!form.name || !form.api_url || !form.api_token) {
      toast.error('Mohon lengkapi semua field')
      return
    }
    try {
      const r = await api.post('/external', {
        ...form,
        device_id: form.device_id || null
      })
      if (r.data.success) {
        setConnections(prev => [r.data.data, ...prev])
        setCreateOpen(false)
        setForm({ name: '', api_url: '', api_token: '', device_id: '' })
        toast.success('Koneksi berhasil ditambahkan')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal membuat koneksi')
    }
  }

  const handleEdit = (conn: ExternalConnection) => {
    setForm({
      name: conn.name,
      api_url: conn.api_url,
      api_token: conn.api_token,
      device_id: conn.device_id || ''
    })
    setSelectedConnection(conn)
    setEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedConnection) return
    try {
      const r = await api.put(`/external/${selectedConnection.id}`, {
        ...form,
        device_id: form.device_id || null
      })
      if (r.data.success) {
        setConnections(prev => prev.map(c => c.id === selectedConnection.id ? r.data.data : c))
        setEditOpen(false)
        setForm({ name: '', api_url: '', api_token: '', device_id: '' })
        setSelectedConnection(null)
        toast.success('Koneksi diupdate')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal update koneksi')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus koneksi ini?')) return
    try {
      await api.delete(`/external/${id}`)
      setConnections(prev => prev.filter(c => c.id !== id))
      toast.success('Koneksi dihapus')
    } catch (e: any) {
      toast.error('Gagal menghapus koneksi')
    }
  }

  const handleTest = async (id: number) => {
    setTestLoading(id)
    try {
      const r = await api.post(`/external/${id}/test`)
      if (r.data.success) {
        toast.success('Koneksi berhasil!')
        fetchConnections()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Koneksi gagal')
    } finally {
      setTestLoading(null)
    }
  }

  const handleToggle = async (conn: ExternalConnection) => {
    try {
      const r = await api.put(`/external/${conn.id}`, { is_active: conn.is_active ? 0 : 1 })
      if (r.data.success) {
        setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, is_active: r.data.data.is_active } : c))
        toast.success(r.data.data.is_active ? 'Koneksi diaktifkan' : 'Koneksi dinonaktifkan')
      }
    } catch (e: any) {
      toast.error('Gagal update status')
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('id-ID', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-purple-500" />
            Integrasi External
          </h1>
          <p className="text-sm text-slate-500 font-medium">Hubungkan dengan sistem WhatsApp external</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" /> Tambah Koneksi
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
          </div>
        ) : connections.length === 0 ? (
          <div className="p-12 text-center">
            <LinkIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Belum ada koneksi external</p>
            <p className="text-sm text-slate-400">Tambahkan koneksi untuk integrasi dengan sistem lain</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {connections.map((conn) => (
              <div key={conn.id} className="p-4 md:p-5 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-slate-800">{conn.name}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        conn.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {conn.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                      {conn.last_connected ? (
                        <span className="text-[10px] text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Terhubung
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-400 mb-1">
                      <span className="font-mono">{conn.api_url}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Device: {conn.device_id || '-'} • Dibuat: {formatDate(conn.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleTest(conn.id)}
                      disabled={testLoading === conn.id}
                      title="Test Koneksi"
                    >
                      {testLoading === conn.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setSelectedConnection(conn)
                        setSendOpen(true)
                      }}
                      title="Kirim Pesan"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(conn)} title="Edit">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleToggle(conn)}
                      title={conn.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {conn.is_active ? (
                        <Pause className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Play className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(conn.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Koneksi External</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Nama Koneksi</label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                placeholder="Contoh: WA Blast Pro" 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">API URL</label>
              <Input 
                value={form.api_url} 
                onChange={(e) => setForm({...form, api_url: e.target.value})} 
                placeholder="https://api.wablast.com" 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">API Token / API Key</label>
              <Input 
                value={form.api_token} 
                onChange={(e) => setForm({...form, api_token: e.target.value})} 
                placeholder="Masukkan token API" 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Device ID (Opsional)</label>
              <Select value={form.device_id} onValueChange={(v) => setForm({...form, device_id: v})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih device (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.session_name} ({d.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Koneksi External</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Nama Koneksi</label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">API URL</label>
              <Input 
                value={form.api_url} 
                onChange={(e) => setForm({...form, api_url: e.target.value})} 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">API Token / API Key</label>
              <Input 
                value={form.api_token} 
                onChange={(e) => setForm({...form, api_token: e.target.value})} 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Device ID</label>
              <Select value={form.device_id} onValueChange={(v) => setForm({...form, device_id: v})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada</SelectItem>
                  {devices.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.session_name} ({d.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={handleUpdate} className="bg-purple-600 hover:bg-purple-700">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SendMessageDialog 
        open={sendOpen}
        onOpenChange={setSendOpen}
        connection={selectedConnection}
      />
    </div>
  )
}

function SendMessageDialog({ open, onOpenChange, connection }: { 
  open: boolean
  onOpenChange: (v: boolean) => void
  connection: ExternalConnection | null 
}) {
  const [sending, setSending] = useState(false)
  const [number, setNumber] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<any>(null)

  const handleSend = async () => {
    if (!number || !message) {
      toast.error('Mohon isi nomor dan pesan')
      return
    }
    if (!connection) return
    
    setSending(true)
    setResult(null)
    try {
      const r = await api.post(`/external/${connection.id}/send`, { number, message })
      if (r.data.success) {
        setResult(r.data)
        toast.success('Pesan terkirim!')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal mengirim')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setNumber('')
    setMessage('')
    setResult(null)
    onOpenChange(false)
  }

  if (!connection) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kirim Pesan via {connection.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Nomor Tujuan</label>
            <Input 
              value={number} 
              onChange={(e) => setNumber(e.target.value)} 
              placeholder="628123456789" 
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Pesan</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Isi pesan..." 
              className="mt-1 w-full h-24 p-3 border rounded-lg text-sm resize-none"
            />
          </div>
          {result && (
            <div className="bg-green-50 p-3 rounded-lg text-xs text-green-700">
              <pre className="whitespace-pre-wrap">{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Tutup</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-purple-600 hover:bg-purple-700">
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Kirim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
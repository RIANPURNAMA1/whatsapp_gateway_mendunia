import { useEffect, useState, useCallback } from 'react'
import { Key, Plus, Trash2, Copy, Check, ToggleLeft, ToggleRight, Loader2, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/elements'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/overlay'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface ApiKey {
  id: number
  key_value: string
  name: string | null
  is_active: number
  last_used: string | null
  created_at: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true)
      const r = await api.get('/keys')
      if (r.data.success) setKeys(r.data.data)
    } catch (e: any) {
      console.error(e)
      toast.error(e.response?.data?.message || 'Gagal memuat API Keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Nama tidak boleh kosong')
      return
    }
    setCreating(true)
    try {
      const r = await api.post('/keys', { name: newName })
      if (r.data.success) {
        setKeys(prev => [r.data.data, ...prev])
        setCreateOpen(false)
        setNewName('')
        toast.success('API Key berhasil dibuat')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal membuat API Key')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus API Key?')) return
    try {
      await api.delete(`/keys/${id}`)
      setKeys(prev => prev.filter(k => k.id !== id))
      toast.success('API Key dihapus')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal menghapus API Key')
    }
  }

  const handleToggle = async (id: number) => {
    try {
      const r = await api.put(`/keys/${id}/toggle`)
      if (r.data.success) {
        setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: r.data.data.is_active } : k))
        toast.success(r.data.data.is_active ? 'API Key diaktifkan' : 'API Key dinonaktifkan')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal update status')
    }
  }

  const handleCopy = (key: string, id: number) => {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('id-ID', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Key className="w-6 h-6 text-blue-500" />
            API Keys
          </h1>
          <p className="text-sm text-slate-500 font-medium">Kelola akses API untuk integrasi externe</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Buat API Key
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center">
            <Key className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Belum ada API Key</p>
            <p className="text-sm text-slate-400">Buat API Key untuk integrasi externe</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {keys.map((key) => (
              <div key={key.id} className="p-4 md:p-5 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-slate-800">{key.name || 'Tanpa Nama'}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        key.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {key.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <code className="bg-slate-100 px-2 py-1 rounded font-mono text-slate-600 max-w-[200px] truncate">
                        {key.key_value}
                      </code>
                      <button onClick={() => handleCopy(key.key_value, key.id)} className="p-1 hover:bg-slate-200 rounded">
                        {copiedId === key.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Dibuat: {formatDate(key.created_at)} • Terakhir digunakan: {formatDate(key.last_used)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleToggle(key.id)}>
                      {key.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(key.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
          <QrCode className="w-4 h-4" /> Dokumentasi API
        </h3>
        
        <div className="space-y-4 text-xs">
          <div>
            <p className="font-bold text-blue-900 mb-1">Profile</p>
            <pre className="text-blue-700 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
GET /api/public/profile</pre>
          </div>
          
          <div>
            <p className="font-bold text-blue-900 mb-1">Kirim Pesan</p>
            <pre className="text-blue-700 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
POST /api/public/send
</pre>
          </div>
          
          <div>
            <p className="font-bold text-blue-900 mb-1">Kirim Media (Image/Video)</p>
            <pre className="text-blue-700 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
POST /api/public/send-media
</pre>
          </div>
          
          <div>
            <p className="font-bold text-blue-900 mb-1">Daftar Perangkat</p>
            <pre className="text-blue-700 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
GET /api/public/devices</pre>
          </div>
          
          <div>
            <p className="font-bold text-blue-900 mb-1">Status Perangkat</p>
            <pre className="text-blue-700 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
GET /api/public/device/1/status</pre>
          </div>
          
          <div>
            <p className="font-bold text-blue-900 mb-1">Jadwalkan Pesan</p>
            <pre className="text-blue-700 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
POST /api/public/schedule
</pre>
          </div>
          
          <div>
            <p className="font-bold text-blue-900 mb-1">Daftar Pesan Masuk</p>
            <pre className="text-blue-700 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
GET /api/public/inbox?limit=50&offset=0</pre>
          </div>
          
          <div>
            <p className="font-bold text-blue-900 mb-1">Riwayat Chat dengan Nomor</p>
            <pre className="text-blue-700 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
GET /api/public/inbox/6281234567890</pre>
          </div>
          
          <div>
            <p className="font-bold text-blue-900 mb-1">Template</p>
            <pre className="text-blue-700 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
GET /api/public/templates
POST /api/public/templates 
DELETE /api/public/templates/:id</pre>
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat API Key Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Nama (Opsional)</label>
              <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="Contoh: Aplikasi Android" 
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-blue-600 hover:bg-blue-700">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Buat Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
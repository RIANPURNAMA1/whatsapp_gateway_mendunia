import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/elements'
import { Input, Label, Textarea, Badge } from '@/components/ui/elements'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/overlay'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/overlay'
import { Switch } from '@/components/ui/overlay'
import { FileText, Plus, Trash2, Edit2, Copy, Loader2, MessageSquareReply, Zap } from 'lucide-react'
import api from '@/lib/api'
import type { MessageTemplate, AutoReply, WaSession } from '@/types'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MessageTemplate | null>(null)
  const [form, setForm] = useState({ name: '', content: '' })
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/messages/templates')
      setTemplates(r.data.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const openCreate = () => { setEditing(null); setForm({ name: '', content: '' }); setOpen(true) }
  const openEdit = (t: MessageTemplate) => { setEditing(t); setForm({ name: t.name, content: t.content }); setOpen(true) }

  const handleSave = async () => {
    if (!form.name || !form.content) { toast.error('Nama dan isi wajib diisi'); return }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/messages/templates/${editing.id}`, form)
        toast.success('Template diperbarui')
      } else {
        await api.post('/messages/templates', form)
        toast.success('Template disimpan')
      }
      setOpen(false)
      fetch()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus template ini?')) return
    try { await api.delete(`/messages/templates/${id}`); toast.success('Dihapus'); fetch() }
    catch { toast.error('Gagal menghapus') }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Teks disalin!')
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Template Pesan</h1>
          <p className="text-sm text-slate-500">Simpan template pesan untuk digunakan ulang</p>
        </div>
        <Button variant="wa" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Buat Template
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-white rounded-xl border animate-pulse" />)}</div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">Belum ada template</p>
            <p className="text-sm text-slate-400">Simpan template pesan untuk hemat waktu</p>
            <Button variant="wa" className="mt-4" onClick={openCreate}><Plus className="w-4 h-4" /> Buat Template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {templates.map(t => (
            <Card key={t.id} className="card-hover border-slate-100">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-slate-700 text-sm">{t.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleCopy(t.content)} className="p-1.5 text-slate-400 hover:text-green-600 rounded transition-colors"><Copy className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 bg-slate-50 rounded-lg p-3 font-mono">{t.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Template' : 'Buat Template Baru'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nama Template *</Label>
              <Input placeholder="Contoh: Promo Akhir Tahun" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Isi Pesan *</Label>
              <Textarea
                placeholder="Halo {{name}}, ada promo spesial untuk Anda..."
                className="min-h-[140px]"
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
              />
              <p className="text-xs text-slate-400">Gunakan {'{{name}}'} untuk menyisipkan nama kontak secara otomatis</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button variant="wa" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO REPLY PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AutoReplyPage() {
  const [rules, setRules] = useState<AutoReply[]>([])
  const [sessions, setSessions] = useState<WaSession[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    session_id: '', trigger_keyword: '', match_type: 'contains', reply_message: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [rulesRes, sessRes] = await Promise.all([
        api.get('/messages/auto-reply'),
        api.get('/sessions'),
      ])
      setRules(rulesRes.data.data)
      setSessions(sessRes.data.data.filter((s: WaSession) => s.status === 'connected'))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSave = async () => {
    if (!form.session_id || !form.trigger_keyword || !form.reply_message) {
      toast.error('Session, keyword, dan balasan wajib diisi')
      return
    }
    setSaving(true)
    try {
      await api.post('/messages/auto-reply', form)
      toast.success('Auto reply ditambahkan')
      setOpen(false)
      setForm({ session_id: '', trigger_keyword: '', match_type: 'contains', reply_message: '' })
      fetchAll()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  const handleToggle = async (rule: AutoReply) => {
    try {
      await api.put(`/messages/auto-reply/${rule.id}`, { is_active: rule.is_active ? 0 : 1 })
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: r.is_active ? 0 : 1 } : r))
    } catch { toast.error('Gagal mengubah status') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus aturan ini?')) return
    try { await api.delete(`/messages/auto-reply/${id}`); toast.success('Dihapus'); fetchAll() }
    catch { toast.error('Gagal menghapus') }
  }

  const matchTypeLabel: Record<string, string> = {
    contains: 'Mengandung', exact: 'Sama Persis', starts_with: 'Diawali', regex: 'Regex'
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Auto Reply</h1>
          <p className="text-sm text-slate-500">Balas pesan masuk secara otomatis berdasarkan kata kunci</p>
        </div>
        <Button variant="wa" size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> Tambah Aturan
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border animate-pulse" />)}</div>
      ) : rules.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-16 text-center">
            <MessageSquareReply className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">Belum ada aturan auto reply</p>
            <p className="text-sm text-slate-400">Tambahkan aturan untuk balas pesan otomatis</p>
            <Button variant="wa" className="mt-4" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Tambah Aturan</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const sess = sessions.find(s => s.id === rule.session_id)
            return (
              <Card key={rule.id} className={`border-slate-100 transition-opacity ${rule.is_active ? '' : 'opacity-60'}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Zap className={`w-5 h-5 ${rule.is_active ? 'text-purple-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-slate-800">"{rule.trigger_keyword}"</span>
                      <Badge variant="info" className="text-[10px]">{matchTypeLabel[rule.match_type]}</Badge>
                      {sess && <Badge variant="wa" className="text-[10px]">{sess.session_name}</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{rule.reply_message}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{rule.reply_count} kali dipakai</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={rule.is_active === 1} onCheckedChange={() => handleToggle(rule)} />
                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Aturan Auto Reply</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Perangkat WhatsApp *</Label>
              {sessions.length === 0 ? (
                <p className="text-xs text-red-500 bg-red-50 p-3 rounded-lg">⚠ Tidak ada perangkat terhubung.</p>
              ) : (
                <Select value={form.session_id} onValueChange={v => setForm({ ...form, session_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih perangkat" /></SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.session_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kata Kunci *</Label>
                <Input placeholder="harga, info, promo" value={form.trigger_keyword} onChange={e => setForm({ ...form, trigger_keyword: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe Pencocokan</Label>
                <Select value={form.match_type} onValueChange={v => setForm({ ...form, match_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Mengandung</SelectItem>
                    <SelectItem value="exact">Sama Persis</SelectItem>
                    <SelectItem value="starts_with">Diawali</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pesan Balasan *</Label>
              <Textarea
                placeholder="Halo! Terima kasih sudah menghubungi kami..."
                className="min-h-[100px]"
                value={form.reply_message}
                onChange={e => setForm({ ...form, reply_message: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button variant="wa" onClick={handleSave} disabled={saving || sessions.length === 0}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

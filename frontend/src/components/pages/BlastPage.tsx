import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/elements'
import { Input, Label, Textarea, Badge } from '@/components/ui/elements'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/overlay'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/overlay'
import { Progress } from '@/components/ui/overlay'
import {
  Send, Plus, Play, Pause, Square, Trash2, ChevronRight,
  Loader2, CheckCircle2, XCircle, Clock, BarChart2, RefreshCw
} from 'lucide-react'
import api from '@/lib/api'
import type { BlastCampaign, WaSession, ContactGroup } from '@/types'
import toast from 'react-hot-toast'
import { useSocket } from '@/hooks/useSocket'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const statusColor: Record<string, string> = {
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  paused: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-purple-100 text-purple-700',
}
const statusLabel: Record<string, string> = {
  running: 'Berjalan', completed: 'Selesai', failed: 'Gagal',
  paused: 'Dijeda', draft: 'Draft', scheduled: 'Terjadwal',
}

interface CampaignProgress {
  status: string
  sentCount?: number
  failedCount?: number
  currentPhone?: string
  progress?: number
}

export default function BlastPage() {
  const [campaigns, setCampaigns] = useState<BlastCampaign[]>([])
  const [sessions, setSessions] = useState<WaSession[]>([])
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<BlastCampaign | null>(null)
  const [campaignLogs, setCampaignLogs] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<number, CampaignProgress>>({})
  const [saving, setSaving] = useState(false)
  const socket = useSocket()

  const [form, setForm] = useState({
    name: '', session_id: '', message: '',
    group_id: '', delay_min: '2000', delay_max: '5000',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [campRes, sessRes, grpRes] = await Promise.all([
        api.get('/blast'),
        api.get('/sessions'),
        api.get('/contacts/groups'),
      ])
      setCampaigns(campRes.data.data)
      setSessions(sessRes.data.data.filter((s: WaSession) => s.status === 'connected'))
      setGroups(grpRes.data.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!socket) return
    campaigns.forEach(c => {
      if (c.status === 'running' || c.status === 'paused') {
        socket.emit('join_campaign', c.id)
        socket.on(`campaign_${c.id}`, (data: CampaignProgress) => {
          setProgress(prev => ({ ...prev, [c.id]: data }))
          if (data.status === 'completed' || data.status === 'stopped') {
            fetchData()
          }
        })
      }
    })
    return () => {
      campaigns.forEach(c => socket.off(`campaign_${c.id}`))
    }
  }, [socket, campaigns, fetchData])

  const handleCreate = async () => {
    if (!form.name || !form.session_id || !form.message || !form.group_id) {
      toast.error('Isi semua field yang wajib')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      await api.post('/blast', fd)
      toast.success('Kampanye dibuat')
      setCreateOpen(false)
      setForm({ name: '', session_id: '', message: '', group_id: '', delay_min: '2000', delay_max: '5000' })
      fetchData()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal membuat kampanye')
    } finally { setSaving(false) }
  }

  const handleAction = async (id: number, action: 'start' | 'pause' | 'resume' | 'stop') => {
    try {
      await api.post(`/blast/${id}/${action}`)
      toast.success({ start: 'Kampanye dimulai', pause: 'Kampanye dijeda', resume: 'Kampanye dilanjutkan', stop: 'Kampanye dihentikan' }[action])
      fetchData()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kampanye ini?')) return
    try {
      await api.delete(`/blast/${id}`)
      toast.success('Kampanye dihapus')
      setCampaigns(prev => prev.filter(c => c.id !== id))
    } catch { toast.error('Gagal menghapus') }
  }

  const openDetail = async (c: BlastCampaign) => {
    setSelectedCampaign(c)
    setDetailOpen(true)
    try {
      const r = await api.get(`/blast/${c.id}`)
      setCampaignLogs(r.data.logs || [])
    } catch (e) { console.error(e) }
  }

  const getProg = (c: BlastCampaign) => {
    const live = progress[c.id]
    const sent = live?.sentCount ?? c.sent_count
    const failed = live?.failedCount ?? c.failed_count
    const pct = c.total_contacts > 0 ? Math.round(((sent + failed) / c.total_contacts) * 100) : 0
    return { sent, failed, pct, currentPhone: live?.currentPhone }
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Blast Pesan</h1>
          <p className="text-sm text-slate-500">Kirim pesan massal ke banyak kontak</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="wa" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Buat Kampanye
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border animate-pulse" />)}</div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-16 text-center">
            <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">Belum ada kampanye blast</p>
            <p className="text-sm text-slate-400 mt-1">Buat kampanye baru untuk kirim pesan massal</p>
            <Button variant="wa" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Buat Kampanye
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const { sent, failed, pct, currentPhone } = getProg(c)
            const liveStatus = progress[c.id]?.status || c.status
            return (
              <Card key={c.id} className="border-slate-100 hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 truncate">{c.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor[liveStatus] || statusColor.draft}`}>
                          {statusLabel[liveStatus] || liveStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mb-3">{c.message.substring(0, 80)}...</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{sent} terkirim</span>
                        <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-400" />{failed} gagal</span>
                        <span className="flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5 text-blue-400" />{c.total_contacts} kontak</span>
                        {c.created_at && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{format(new Date(c.created_at), 'dd MMM', { locale: id })}</span>}
                      </div>
                      {(liveStatus === 'running' || c.status === 'running') && (
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>{currentPhone ? `Mengirim ke ${currentPhone}...` : 'Memproses...'}</span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {(c.status === 'draft' || c.status === 'failed') && (
                        <Button size="sm" variant="wa" onClick={() => handleAction(c.id, 'start')}>
                          <Play className="w-3.5 h-3.5" /> Mulai
                        </Button>
                      )}
                      {(liveStatus === 'running') && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(c.id, 'pause')}>
                          <Pause className="w-3.5 h-3.5" /> Jeda
                        </Button>
                      )}
                      {c.status === 'paused' && (
                        <Button size="sm" variant="wa" onClick={() => handleAction(c.id, 'resume')}>
                          <Play className="w-3.5 h-3.5" /> Lanjut
                        </Button>
                      )}
                      {(liveStatus === 'running' || c.status === 'paused') && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleAction(c.id, 'stop')}>
                          <Square className="w-3.5 h-3.5" /> Stop
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openDetail(c)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Buat Kampanye Blast</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Nama Kampanye *</Label>
              <Input placeholder="Promo Lebaran 2025" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Perangkat WhatsApp *</Label>
              {sessions.length === 0 ? (
                <p className="text-xs text-red-500 bg-red-50 p-3 rounded-lg">⚠ Tidak ada perangkat terhubung. Hubungkan perangkat dulu.</p>
              ) : (
                <Select value={form.session_id} onValueChange={v => setForm({ ...form, session_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih perangkat" /></SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.session_name} (+{s.phone_number})</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Grup Kontak *</Label>
              <Select value={form.group_id} onValueChange={v => setForm({ ...form, group_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih grup kontak" /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name} ({g.contact_count} kontak)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pesan *</Label>
              <Textarea
                placeholder="Ketik pesan di sini...&#10;&#10;Tip: Gunakan {{name}} untuk nama kontak"
                className="min-h-[120px]"
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
              />
              <p className="text-xs text-slate-400">{form.message.length} karakter</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Delay Min (ms)</Label>
                <Input type="number" value={form.delay_min} onChange={e => setForm({ ...form, delay_min: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Delay Max (ms)</Label>
                <Input type="number" value={form.delay_max} onChange={e => setForm({ ...form, delay_max: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded">
              💡 Delay antara 2000–5000ms direkomendasikan untuk menghindari spam detection
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button variant="wa" onClick={handleCreate} disabled={saving || sessions.length === 0}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Buat Kampanye
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total', value: selectedCampaign.total_contacts, color: 'text-slate-700' },
                  { label: 'Terkirim', value: selectedCampaign.sent_count, color: 'text-green-600' },
                  { label: 'Gagal', value: selectedCampaign.failed_count, color: 'text-red-500' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {campaignLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 text-sm">
                    {log.status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> :
                      log.status === 'failed' ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" /> :
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <span className="font-mono text-xs text-slate-600 flex-1">+{log.phone_number}</span>
                    <span className="text-xs text-slate-500">{log.contact_name || '—'}</span>
                    {log.error_message && <span className="text-[10px] text-red-500 truncate max-w-[120px]">{log.error_message}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

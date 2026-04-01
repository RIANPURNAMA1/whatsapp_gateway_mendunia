import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/elements'
import { Input, Label, Textarea } from '@/components/ui/elements'
import { Send, Phone, MessageSquare, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import type { WaSession } from '@/types'
import toast from 'react-hot-toast'

interface SendResult {
  phone: string
  status: 'success' | 'failed'
  message?: string
}

export default function SendMessagePage() {
  const [sessions, setSessions] = useState<WaSession[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)

  const [form, setForm] = useState({
    phone: '',
    message: '',
    session_id: '',
  })

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/sessions')
      setSessions(res.data.data.filter((s: WaSession) => s.status === 'connected'))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const formatPhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1)
    }
    if (!cleaned.endsWith('@s.whatsapp.net')) {
      return cleaned
    }
    return cleaned
  }

  const handleSend = async () => {
    if (!form.session_id) {
      toast.error('Pilih perangkat WhatsApp terlebih dahulu')
      return
    }
    if (!form.phone) {
      toast.error('Masukkan nomor tujuan')
      return
    }
    if (!form.message) {
      toast.error('Masukkan pesan yang akan dikirim')
      return
    }

    setSending(true)
    setResult(null)

    try {
      const phone = formatPhone(form.phone)
      await api.post(`/sessions/${form.session_id}/send-single`, {
        phone,
        message: form.message,
      })
      setResult({ phone, status: 'success' })
      toast.success('Pesan berhasil dikirim!')
      setForm({ ...form, phone: '', message: '' })
    } catch (e: any) {
      const errMsg = e.response?.data?.message || 'Gagal mengirim pesan'
      setResult({ phone: form.phone, status: 'failed', message: errMsg })
      toast.error(errMsg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kirim Pesan</h1>
          <p className="text-sm text-slate-500">Kirim pesan ke nomor yang diinputkan</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSessions}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Form Kirim Pesan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Perangkat WhatsApp *</Label>
              {loading ? (
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ) : sessions.length === 0 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  Tidak ada perangkat yang terhubung. Silakan hubungkan perangkat terlebih dahulu.
                </div>
              ) : (
                <select
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={form.session_id}
                  onChange={(e) => setForm({ ...form, session_id: e.target.value })}
                >
                  <option value="">-- Pilih Perangkat --</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.session_name} ({s.phone_number || 'Menunggu...'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nomor Tujuan *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="08xxxxxxxxxx"
                  className="pl-10"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <p className="text-xs text-slate-400">
                Format: 08xxxxxxxxxx atau dengan kode negara (62xxx)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Pesan *</Label>
              <Textarea
                placeholder="Ketik pesan yang akan dikirim..."
                className="min-h-[150px]"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <p className="text-xs text-slate-400">{form.message.length} karakter</p>
            </div>

            <Button
              variant="wa"
              className="w-full"
              onClick={handleSend}
              disabled={sending || sessions.length === 0}
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Kirim Pesan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Pengiriman</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className={`p-4 rounded-xl ${result.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-3">
                  {result.status === 'success' ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-500" />
                  )}
                  <div>
                    <p className={`font-semibold ${result.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      {result.status === 'success' ? 'Berhasil Dikirim!' : 'Gagal Dikirim'}
                    </p>
                    <p className="text-sm text-slate-500">Ke: +{result.phone}</p>
                    {result.message && (
                      <p className="text-xs text-red-500 mt-1">{result.message}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Belum ada pengiriman</p>
                <p className="text-xs mt-1">Isi form di samping untuk mengirim pesan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

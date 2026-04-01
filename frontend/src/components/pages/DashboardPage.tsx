import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/elements'
import { Smartphone, Users, Send, MessageSquare, TrendingUp, CheckCircle2, XCircle, Clock, Shield } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '@/lib/api'
import type { DashboardStats, BlastCampaign } from '@/types'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { useAuthStore } from '@/store/authStore'

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

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin'
  const [stats, setStats] = useState<DashboardStats & { users?: { total: number }, role?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    {
      title: 'Perangkat Terhubung',
      value: `${stats.sessions.connected}/${stats.sessions.total}`,
      sub: 'WhatsApp aktif',
      icon: Smartphone,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Total Kontak',
      value: stats.contacts.total.toLocaleString(),
      sub: `${stats.contacts.groups} grup`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Kampanye Blast',
      value: stats.campaigns.total,
      sub: `${stats.campaigns.active} aktif`,
      icon: Send,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Pesan Terkirim',
      value: stats.messages.sent.toLocaleString(),
      sub: `${stats.messages.failed} gagal`,
      icon: MessageSquare,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    ...(isAdmin && stats.users ? [{
      title: 'User Aktif',
      value: stats.users.total,
      sub: 'user yang aktif',
      icon: Shield,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    }] : []),
  ] : []

  const chartData = stats?.chart.map(d => ({
    date: format(parseISO(d.date), 'dd MMM', { locale: id }),
    terkirim: Number(d.count),
  })) || []

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          {isAdmin ? 'Admin Dashboard' : 'Dashboard'}
        </h1>
        <p className="text-sm text-slate-500">
          {isAdmin 
            ? 'Ringkasan seluruh sistem WhatsApp Blast' 
            : 'Ringkasan aktivitas WhatsApp Blast Anda'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="card-hover border-slate-100">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{card.title}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 border-slate-100">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <CardTitle>Pesan Terkirim (7 Hari)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#25D366" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="terkirim" stroke="#25D366" strokeWidth={2} fill="url(#colorGreen)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
                Belum ada data pengiriman
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle>Kampanye Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recent_campaigns && stats.recent_campaigns.length > 0 ? (
              stats.recent_campaigns.map((c: BlastCampaign) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor[c.status]}`}>
                        {statusLabel[c.status]}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />{c.sent_count}
                        <XCircle className="w-3 h-3 text-red-400 ml-1" />{c.failed_count}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-slate-600">{c.total_contacts}</p>
                    <p className="text-[10px] text-slate-400">kontak</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Belum ada kampanye</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

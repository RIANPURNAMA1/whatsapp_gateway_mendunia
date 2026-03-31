import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input, Label, Card, CardContent } from '@/components/ui/elements'
import { Zap, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('Akun berhasil dibuat! Silakan login.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registrasi gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-teal-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#25D366] shadow-lg shadow-green-200 mb-4">
            <Zap className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Buat Akun Baru</h1>
          <p className="text-sm text-slate-500 mt-1">Daftar ke WA Blast Pro</p>
        </div>
        <Card className="shadow-lg border-slate-200/80">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Lengkap</Label>
                <Input placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" placeholder="Min 6 karakter" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" variant="wa" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
              </Button>
            </form>
            <p className="text-center text-sm text-slate-500 mt-4">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-green-600 font-semibold hover:underline">Masuk</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

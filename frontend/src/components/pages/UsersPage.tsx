import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/elements'
import { Input, Label } from '@/components/ui/elements'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/overlay'
import { UserPlus, Trash2, Edit2, Shield, CheckCircle2, XCircle, Loader2, Users } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useAuthStore } from '@/store/authStore'

interface UserData {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

const roleColors: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  user: 'bg-slate-100 text-slate-600',
}

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const isAdmin = currentUser?.role === 'admin'
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(res.data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openCreate = () => {
    setEditingUser(null)
    setForm({ name: '', email: '', password: '', role: 'user' })
    setModalOpen(true)
  }

  const openEdit = (user: UserData) => {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      toast.error('Nama dan email wajib diisi')
      return
    }
    if (!editingUser && !form.password) {
      toast.error('Password wajib diisi untuk user baru')
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, form)
        toast.success('User berhasil diupdate')
      } else {
        await api.post('/users', form)
        toast.success('User berhasil dibuat')
      }
      setModalOpen(false)
      fetchUsers()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return
    try {
      await api.delete(`/users/${id}`)
      toast.success('User berhasil dihapus')
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal menghapus')
    }
  }

  const handleToggleActive = async (user: UserData) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: !user.is_active })
      toast.success(`User berhasil ${user.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)
      fetchUsers()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal mengupdate')
    }
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{isAdmin ? 'Kelola User' : 'Kelola User Sistem'}</h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? 'Tambah dan kelola user biasa' : 'Tambah dan kelola semua user sistem'}
          </p>
        </div>
        <Button variant="wa" onClick={openCreate}>
          <UserPlus className="w-4 h-4" /> Tambah User
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">User</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Dibuat</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${roleColors[u.role]}`}>
                      {u.role === 'superadmin' && <Shield className="w-3 h-3 inline mr-1" />}
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`flex items-center gap-1 text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {u.is_active ? (
                        <><CheckCircle2 className="w-4 h-4" /> Aktif</>
                      ) : (
                        <><XCircle className="w-4 h-4" /> Nonaktif</>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy', { locale: id }) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => openEdit(u)}>
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </Button>
                      {u.id !== currentUser?.id && (
                        <Button size="icon" variant="ghost" className="w-8 h-8 text-red-400 hover:text-red-600" onClick={() => handleDelete(u.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada user</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nama Lengkap *</Label>
              <Input placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Password {editingUser ? '(kosongkan jika tidak diubah)' : '*'}</Label>
              <Input type="password" placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Min 6 karakter'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              {isAdmin ? (
                <div className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 flex items-center">
                  User (hanya bisa menambahkan user)
                </div>
              ) : (
                <select
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  {currentUser?.role === 'admin' && <option value="superadmin">Super Admin</option>}
                </select>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button variant="wa" onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingUser ? 'Simpan' : 'Buat User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

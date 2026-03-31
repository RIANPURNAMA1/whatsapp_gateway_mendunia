import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/elements'
import { Input, Label, Textarea, Badge } from '@/components/ui/elements'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/overlay'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/overlay'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { Users, Plus, Trash2, Search, Upload, FolderOpen, Phone, Loader2, FileText, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import type { Contact, ContactGroup } from '@/types'
import toast from 'react-hot-toast'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Modals
  const [addContact, setAddContact] = useState(false)
  const [addGroup, setAddGroup] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // Forms
  const [contactForm, setContactForm] = useState({ name: '', phone_number: '', group_id: '', notes: '' })
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importGroupId, setImportGroupId] = useState('')
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchGroups = useCallback(async () => {
    const r = await api.get('/contacts/groups')
    setGroups(r.data.data)
  }, [])

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' }
      if (search) params.search = search
      if (filterGroup) params.group_id = filterGroup
      const r = await api.get('/contacts', { params })
      setContacts(r.data.data)
      setTotal(r.data.total)
      setTotalPages(r.data.pages)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, search, filterGroup])

  useEffect(() => { fetchGroups() }, [fetchGroups])
  useEffect(() => { fetchContacts() }, [fetchContacts])

  const handleAddContact = async () => {
    if (!contactForm.phone_number) return
    setSaving(true)
    try {
      await api.post('/contacts', { ...contactForm, group_id: contactForm.group_id || null })
      toast.success('Kontak ditambahkan')
      setAddContact(false)
      setContactForm({ name: '', phone_number: '', group_id: '', notes: '' })
      fetchContacts()
      fetchGroups()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal menambah kontak')
    } finally { setSaving(false) }
  }

  const handleAddGroup = async () => {
    if (!groupForm.name) return
    setSaving(true)
    try {
      await api.post('/contacts/groups', groupForm)
      toast.success('Grup dibuat')
      setAddGroup(false)
      setGroupForm({ name: '', description: '' })
      fetchGroups()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gagal membuat grup')
    } finally { setSaving(false) }
  }

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Hapus kontak ini?')) return
    try {
      await api.delete(`/contacts/${id}`)
      toast.success('Kontak dihapus')
      setContacts(prev => prev.filter(c => c.id !== id))
      setTotal(t => t - 1)
    } catch { toast.error('Gagal menghapus') }
  }

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Hapus grup ini? Kontak tidak akan terhapus.')) return
    try {
      await api.delete(`/contacts/groups/${id}`)
      toast.success('Grup dihapus')
      fetchGroups()
    } catch { toast.error('Gagal menghapus') }
  }

  const handleImport = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      if (importGroupId) fd.append('group_id', importGroupId)
      const r = await api.post('/contacts/import', fd)
      toast.success(r.data.message)
      setImportOpen(false)
      setImportFile(null)
      fetchContacts()
      fetchGroups()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Import gagal')
    } finally { setImporting(false) }
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kontak</h1>
          <p className="text-sm text-slate-500">{total} total kontak</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAddGroup(true)}>
            <FolderOpen className="w-4 h-4" /> Grup
          </Button>
          <Button variant="wa" size="sm" onClick={() => setAddContact(true)}>
            <Plus className="w-4 h-4" /> Tambah
          </Button>
        </div>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Kontak ({total})</TabsTrigger>
          <TabsTrigger value="groups">Grup ({groups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari nama atau nomor..."
                className="pl-9"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={filterGroup} onValueChange={v => { setFilterGroup(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Semua Grup" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Grup</SelectItem>
                {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchContacts}><RefreshCw className="w-4 h-4" /></Button>
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white rounded-lg border animate-pulse" />)}</div>
          ) : contacts.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="py-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-slate-500">Belum ada kontak</p>
                <p className="text-sm text-slate-400">Tambah manual atau import dari file CSV</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {contacts.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-green-700">{(c.name || c.phone_number).charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{c.name || '—'}</p>
                        <p className="text-xs text-slate-400 font-mono">+{c.phone_number}</p>
                      </div>
                      {c.group_id && (
                        <Badge variant="secondary" className="text-[10px]">
                          {groups.find(g => g.id === c.group_id)?.name || 'Grup'}
                        </Badge>
                      )}
                      <button onClick={() => handleDeleteContact(c.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                  <span className="text-sm text-slate-500">Hal {page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="groups">
          <div className="flex justify-end mb-4">
            <Button variant="wa" size="sm" onClick={() => setAddGroup(true)}>
              <Plus className="w-4 h-4" /> Buat Grup
            </Button>
          </div>
          {groups.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="py-12 text-center">
                <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-slate-500">Belum ada grup</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(g => (
                <Card key={g.id} className="card-hover border-slate-100">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm">{g.name}</p>
                      <p className="text-xs text-slate-400">{g.contact_count} kontak</p>
                    </div>
                    <button onClick={() => handleDeleteGroup(g.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Contact Modal */}
      <Dialog open={addContact} onOpenChange={setAddContact}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Kontak</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input placeholder="Nama kontak" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor HP *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="6281234567890" className="pl-9 font-mono" value={contactForm.phone_number} onChange={e => setContactForm({ ...contactForm, phone_number: e.target.value })} />
              </div>
              <p className="text-xs text-slate-400">Format: 6281234... (tanpa +)</p>
            </div>
            <div className="space-y-1.5">
              <Label>Grup (opsional)</Label>
              <Select value={contactForm.group_id} onValueChange={v => setContactForm({ ...contactForm, group_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Pilih grup" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa Grup</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Input placeholder="Opsional" value={contactForm.notes} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddContact(false)}>Batal</Button>
              <Button variant="wa" onClick={handleAddContact} disabled={saving || !contactForm.phone_number}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Group Modal */}
      <Dialog open={addGroup} onOpenChange={setAddGroup}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buat Grup Kontak</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Nama Grup *</Label>
              <Input placeholder="Contoh: Pelanggan VIP" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input placeholder="Opsional" value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddGroup(false)}>Batal</Button>
              <Button variant="wa" onClick={handleAddGroup} disabled={saving || !groupForm.name}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Buat Grup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import Kontak dari File</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Format File yang Didukung:</p>
              <p>• CSV/TXT: Kolom 1 = Nomor HP, Kolom 2 = Nama (opsional)</p>
              <p>• Pemisah: koma (,), titik koma (;), atau tab</p>
              <p>• Contoh: <span className="font-mono">6281234567,John Doe</span></p>
            </div>
            <div className="space-y-1.5">
              <Label>File CSV/TXT</Label>
              <Input type="file" accept=".csv,.txt" onChange={e => setImportFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Masukkan ke Grup (opsional)</Label>
              <Select value={importGroupId} onValueChange={v => setImportGroupId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Tanpa grup" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa Grup</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button>
              <Button variant="wa" onClick={handleImport} disabled={importing || !importFile}>
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? 'Mengimport...' : 'Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

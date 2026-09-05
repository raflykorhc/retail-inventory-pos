import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axiosClient from "@/lib/axiosClient"
import { toast } from "@/components/ui/toast"
import { Store, Tags, Upload, Edit, Trash2, Search, Loader2, Trash } from "lucide-react"
import { useCategories, useUnits, useSuppliers, useSettings } from "@/hooks/queries/useMetadata"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeMenu, setActiveMenu] = React.useState<"atribut" | "profil">("atribut")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[600px] p-0 flex gap-0 overflow-hidden">
        {/* Sidebar Kiri */}
        <div className="w-64 bg-muted/30 border-r flex flex-col p-4">
          <div className="mb-6 px-2">
            <h2 className="text-lg font-semibold tracking-tight">Pengaturan</h2>
            <p className="text-sm text-muted-foreground">Kelola toko dan preferensi.</p>
          </div>
          <nav className="flex flex-col gap-1">
            <Button
              variant={activeMenu === "atribut" ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setActiveMenu("atribut")}
            >
              <Tags className="mr-2 h-4 w-4" />
              Atribut Produk
            </Button>
            <Button
              variant={activeMenu === "profil" ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setActiveMenu("profil")}
            >
              <Store className="mr-2 h-4 w-4" />
              Profil Toko
            </Button>
          </nav>
        </div>

        {/* Konten Utama */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-6 overflow-y-auto">
            {activeMenu === "atribut" && <AtributProduk />}
            {activeMenu === "profil" && <ProfilToko />}
          </div>
          <div className="border-t border-border/60 p-4 flex justify-end gap-2 bg-muted/50 mt-auto rounded-br-xl">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
            {activeMenu === "profil" && (
              <Button type="submit" form="profil-form">Simpan Perubahan</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AtributProduk() {
  const queryClient = useQueryClient()
  const { data: units, isLoading: loadingUnits } = useUnits()
  const { data: categories, isLoading: loadingCategories } = useCategories()
  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers()

  const [searchSatuan, setSearchSatuan] = React.useState("")
  const [searchKategori, setSearchKategori] = React.useState("")
  const [searchPemasok, setSearchPemasok] = React.useState("")

  const filteredUnits = units?.filter((u: any) => u.name.toLowerCase().includes(searchSatuan.toLowerCase()))
  const filteredCategories = categories?.filter((c: any) => c.name.toLowerCase().includes(searchKategori.toLowerCase()))
  const filteredSuppliers = suppliers?.filter((s: any) => s.name.toLowerCase().includes(searchPemasok.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Atribut Produk</h3>
        <p className="text-sm text-muted-foreground">Kelola satuan, kategori, dan pemasok untuk produk Anda.</p>
      </div>

      <Tabs defaultValue="satuan" className="flex flex-col w-full">
        <TabsList className="mb-4 self-start">
          <TabsTrigger value="satuan">Satuan</TabsTrigger>
          <TabsTrigger value="kategori">Kategori</TabsTrigger>
          <TabsTrigger value="pemasok">Pemasok</TabsTrigger>
        </TabsList>
        
        <TabsContent value="satuan">
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari satuan..." 
                  className="pl-8 h-8" 
                  value={searchSatuan}
                  onChange={(e) => setSearchSatuan(e.target.value)}
                />
              </div>
              <AddPopover type="satuan" />
            </div>
            {loadingUnits ? (
              <div className="text-sm border rounded p-3 bg-muted/20 text-center text-muted-foreground">Memuat data...</div>
            ) : units?.length ? (
              <div className="border rounded max-h-[300px] overflow-y-auto bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Satuan</TableHead>
                      <TableHead className="w-[100px] text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnits?.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <EditPopover item={u} type="satuan" />
                            <DeletePopover item={u} type="satuan" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-sm border rounded p-3 bg-muted/20 text-center text-muted-foreground">
                Belum ada satuan.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="kategori">
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari kategori..." 
                  className="pl-8 h-8" 
                  value={searchKategori}
                  onChange={(e) => setSearchKategori(e.target.value)}
                />
              </div>
              <AddPopover type="kategori" />
            </div>
            {loadingCategories ? (
              <div className="text-sm border rounded p-3 bg-muted/20 text-center text-muted-foreground">Memuat data...</div>
            ) : categories?.length ? (
              <div className="border rounded max-h-[300px] overflow-y-auto bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Kategori</TableHead>
                      <TableHead className="w-[100px] text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <EditPopover item={c} type="kategori" />
                            <DeletePopover item={c} type="kategori" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-sm border rounded p-3 bg-muted/20 text-center text-muted-foreground">
                Belum ada kategori.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pemasok">
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari pemasok..." 
                  className="pl-8 h-8" 
                  value={searchPemasok}
                  onChange={(e) => setSearchPemasok(e.target.value)}
                />
              </div>
              <AddPopover type="pemasok" />
            </div>
            {loadingSuppliers ? (
              <div className="text-sm border rounded p-3 bg-muted/20 text-center text-muted-foreground">Memuat data...</div>
            ) : suppliers?.length ? (
              <div className="border rounded max-h-[300px] overflow-y-auto bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Pemasok</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead className="w-[100px] text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers?.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{s.contact || '-'}</span>
                            {s.phone && <span className="text-xs text-muted-foreground">{s.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <EditPopover item={s} type="pemasok" />
                            <DeletePopover item={s} type="pemasok" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-sm border rounded p-3 bg-muted/20 text-center text-muted-foreground">
                Belum ada pemasok.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProfilToko() {
  const { data: settings, isLoading } = useSettings()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = React.useState({
    shopName: "",
    shopPhone: "",
    shopEmail: "",
    shopAddress: "",
    defaultSignee: "",
    shopLogo: ""
  })

  React.useEffect(() => {
    if (settings) {
      setFormData({
        shopName: settings.shopName || "",
        shopPhone: settings.shopPhone || "",
        shopEmail: settings.shopEmail || "",
        shopAddress: settings.shopAddress || "",
        defaultSignee: settings.defaultSignee || "",
        shopLogo: settings.shopLogo || ""
      })
    }
  }, [settings])

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, shopLogo: event.target?.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await axiosClient.post('/settings', data)
    },
    onSuccess: () => {
      toast.success("Profil toko berhasil disimpan!")
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => {
      toast.error("Gagal menyimpan profil toko")
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground">Memuat profil...</div>

  return (
    <form id="profil-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profil Toko</h3>
        <p className="text-sm text-muted-foreground">Atur informasi toko yang akan tampil di struk dan nota.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-6">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/png, image/jpeg, image/jpg" 
            onChange={handleLogoUpload} 
          />
          <div className="flex-shrink-0">
            <div 
              className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.shopLogo ? (
                <img src={formData.shopLogo} alt="Logo Toko" className="h-full w-full object-contain p-1" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Unggah Logo</span>
                </>
              )}
            </div>
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-medium">Logo Toko</h4>
            <p className="text-sm text-muted-foreground">
              Direkomendasikan ukuran 1:1, format PNG atau JPG (Maks. 2MB).
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
              >
                Pilih File
              </Button>
              {formData.shopLogo && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  type="button" 
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setFormData(prev => ({ ...prev, shopLogo: "" }))}
                >
                  Hapus Logo
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Field>
            <FieldLabel htmlFor="store-name">Nama Toko</FieldLabel>
            <Input id="store-name" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} placeholder="Misal: Acme Inc." />
          </Field>
          <Field>
            <FieldLabel htmlFor="store-phone">No. Telepon</FieldLabel>
            <Input id="store-phone" value={formData.shopPhone} onChange={e => setFormData({...formData, shopPhone: e.target.value})} placeholder="Misal: 08123456789" />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="store-email">Email Toko</FieldLabel>
          <Input id="store-email" type="email" value={formData.shopEmail} onChange={e => setFormData({...formData, shopEmail: e.target.value})} placeholder="Misal: hello@acme.com" />
        </Field>

        <Field>
          <FieldLabel htmlFor="store-address">Alamat Toko</FieldLabel>
          <Textarea 
            id="store-address" 
            placeholder="Masukkan alamat lengkap toko" 
            className="resize-none" 
            rows={3} 
            value={formData.shopAddress}
            onChange={e => setFormData({...formData, shopAddress: e.target.value})}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="store-signature">Penanggung Jawab Cetak (Hormat Kami)</FieldLabel>
          <Input id="store-signature" value={formData.defaultSignee} onChange={e => setFormData({...formData, defaultSignee: e.target.value})} placeholder="Misal: Budi Santoso / Manajemen" />
          <FieldDescription>
            Nama ini akan tercetak di bagian bawah nota atau struk.
          </FieldDescription>
        </Field>
      </div>
    </form>
  )
}

function EditPopover({ item, type }: { item: any, type: string }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(item.name || "")
  const [contact, setContact] = React.useState(item.contact || "")
  const [phone, setPhone] = React.useState(item.phone || "")
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (open) {
      setName(item.name || "")
      setContact(item.contact || "")
      setPhone(item.phone || "")
    }
  }, [open, item])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const endpoint = type === 'satuan' ? '/units' : type === 'kategori' ? '/categories' : '/suppliers'
      const payload = type === 'pemasok' ? { name, contact, phone } : { name }
      await axiosClient.put(`${endpoint}/${item.id}`, payload)
    },
    onSuccess: () => {
      toast.success("Berhasil diperbarui!")
      queryClient.invalidateQueries({ queryKey: [type === 'satuan' ? 'units' : type === 'kategori' ? 'categories' : 'suppliers'] })
      setOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Gagal memperbarui")
    }
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground hover:text-foreground" />}>
        <Edit className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-medium">Edit {type === 'satuan' ? 'Satuan' : type === 'kategori' ? 'Kategori' : 'Pemasok'}</h4>
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          {type === 'pemasok' && (
            <>
              <div className="space-y-2">
                <Label>Kontak</Label>
                <Input value={contact} onChange={e => setContact(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>No. Telepon</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </>
          )}
          <Button className="w-full" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !name.trim()}>
            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Simpan"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AddPopover({ type }: { type: string }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [contact, setContact] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (open) {
      setName("")
      setContact("")
      setPhone("")
    }
  }, [open])

  const addMutation = useMutation({
    mutationFn: async () => {
      const endpoint = type === 'satuan' ? '/units' : type === 'kategori' ? '/categories' : '/suppliers'
      const payload = type === 'pemasok' ? { name, contact, phone } : { name }
      await axiosClient.post(endpoint, payload)
    },
    onSuccess: () => {
      toast.success("Berhasil ditambahkan!")
      queryClient.invalidateQueries({ queryKey: [type === 'satuan' ? 'units' : type === 'kategori' ? 'categories' : 'suppliers'] })
      setOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Gagal menambahkan")
    }
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        Tambah {type === 'satuan' ? 'Satuan' : type === 'kategori' ? 'Kategori' : 'Pemasok'}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-medium">Tambah {type === 'satuan' ? 'Satuan' : type === 'kategori' ? 'Kategori' : 'Pemasok'}</h4>
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          {type === 'pemasok' && (
            <>
              <div className="space-y-2">
                <Label>Kontak</Label>
                <Input value={contact} onChange={e => setContact(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>No. Telepon</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </>
          )}
          <Button className="w-full" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !name.trim()}>
            {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Simpan"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DeletePopover({ item, type }: { item: any, type: string }) {
  const [open, setOpen] = React.useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const endpoint = type === 'satuan' ? '/units' : type === 'kategori' ? '/categories' : '/suppliers'
      await axiosClient.delete(`${endpoint}/${item.id}`)
    },
    onSuccess: () => {
      toast.success("Berhasil dihapus!")
      queryClient.invalidateQueries({ queryKey: [type === 'satuan' ? 'units' : type === 'kategori' ? 'categories' : 'suppliers'] })
      setOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Gagal menghapus data")
    }
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon-sm" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50" />}>
        <Trash2 className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-60" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm">Hapus {item.name}?</h4>
            <p className="text-xs text-muted-foreground mt-1">Data yang dihapus tidak bisa dikembalikan.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)} disabled={deleteMutation.isPending}>
              Batal
            </Button>
            <Button variant="destructive" size="sm" className="flex-1" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Hapus
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}


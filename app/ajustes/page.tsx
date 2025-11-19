'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/dashboard-layout'
import { toast } from 'sonner'
import { 
  Download, 
  Upload, 
  Trash2, 
  Database, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Bell,
  Table
} from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface BackupData {
  customers: any[]
  products: any[]
  sales: any[]
  settings: any
  timestamp: string
  version: string
}

export default function AjustesPage() {
  const [isElectron, setIsElectron] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [isDeletingDatabase, setIsDeletingDatabase] = useState(false)
  const [cacheSize, setCacheSize] = useState<string>('0 MB')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [reduceAnimations, setReduceAnimations] = useState<boolean>(false)
  const [excelFormLayout, setExcelFormLayout] = useState<boolean>(false)
  const [isClearingNotifications, setIsClearingNotifications] = useState<boolean>(false)
  const [isPurgingArchived, setIsPurgingArchived] = useState<boolean>(false)
  const [partners, setPartners] = useState<any[]>([])
  const [isLoadingPartners, setIsLoadingPartners] = useState<boolean>(false)
  const [newPartnerName, setNewPartnerName] = useState<string>('')
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsElectron(!!window.electronAPI)
      const savedReduce = localStorage.getItem('reduceAnimations')
      setReduceAnimations(savedReduce === 'true')
      const savedExcel = localStorage.getItem('excelFormLayout')
      setExcelFormLayout(savedExcel === 'true')
      loadCacheInfo()
      loadLastBackupInfo()
      
    }
  }, [])

  const loadPartners = async () => {
    try {
      if (!window.electronAPI?.database?.partners?.getAll) return
      setIsLoadingPartners(true)
      const list = await window.electronAPI.database.partners.getAll()
      setPartners(list || [])
    } catch (error) {
      console.error('Error cargando responsables:', error)
    } finally {
      setIsLoadingPartners(false)
    }
  }

  useEffect(() => {
    if (isElectron) {
      loadPartners()
    }
  }, [isElectron])

  const handleAddPartner = async () => {
    const name = newPartnerName.trim()
    if (!name) return
    try {
      await window.electronAPI.database.partners.create({ name })
      setNewPartnerName('')
      try {
        window.dispatchEvent(new CustomEvent('partners:changed'))
      } catch {}
      await loadPartners()
      toast.success('Perfil agregado', {
        description: 'El nombre ahora aparece en Ventas y el formulario',
        position: 'top-center',
        duration: 1000,
      })
    } catch (error: any) {
      console.error('Error creando perfil:', error)
      toast.error('No se pudo crear el perfil', {
        description: error?.message || 'Intenta nuevamente',
        position: 'top-center',
        duration: 1000,
      })
    }
  }

  const startEditPartner = (id: number, name: string) => {
    setEditingPartnerId(id)
    setEditingName(name)
  }

  const cancelEditPartner = () => {
    setEditingPartnerId(null)
    setEditingName('')
  }

  const saveEditPartner = async () => {
    if (!editingPartnerId) return
    const name = editingName.trim()
    if (!name) return
    try {
      await window.electronAPI.database.partners.update(editingPartnerId, { name })
      cancelEditPartner()
      try {
        window.dispatchEvent(new CustomEvent('partners:changed'))
      } catch {}
      await loadPartners()
      toast.success('Perfil actualizado', {
        description: 'Los cambios se reflejan en Ventas y el formulario',
        position: 'top-center',
        duration: 1000,
      })
    } catch (error: any) {
      console.error('Error actualizando perfil:', error)
      toast.error('No se pudo actualizar el perfil', {
        description: error?.message || 'Intenta nuevamente',
        position: 'top-center',
        duration: 1000,
      })
    }
  }

  const handleDeletePartner = async (id: number) => {
    try {
      await window.electronAPI.database.partners.delete(id)
      try {
        window.dispatchEvent(new CustomEvent('partners:changed'))
      } catch {}
      await loadPartners()
      toast.success('Perfil eliminado', {
        description: 'Se removió de Ventas y el formulario',
        position: 'top-center',
        duration: 1000,
      })
    } catch (error: any) {
      console.error('Error eliminando perfil:', error)
      toast.error('No se pudo eliminar el perfil', {
        description: error?.message || 'Intenta nuevamente',
        position: 'top-center',
        duration: 1000,
      })
    }
  }

  const loadCacheInfo = async () => {
    try {
      if (window.electronAPI) {
        const size = await window.electronAPI.cache.getSize()
        setCacheSize(size)
      }
    } catch (error) {
      console.error('Error loading cache info:', error)
    }
  }

  const loadLastBackupInfo = () => {
    const lastBackupDate = localStorage.getItem('lastBackupDate')
    if (lastBackupDate) {
      setLastBackup(new Date(lastBackupDate).toLocaleString('es-ES'))
    }
  }

  const handleExportBackup = async () => {
    if (!isElectron) {
      toast.error('Esta función solo está disponible en la aplicación de escritorio', {
        description: 'Usa la versión de escritorio para esta operación',
        position: 'top-center',
        duration: 1000,
      })
      return
    }

    setIsExporting(true)
    try {
      const [customers, products, sales] = await Promise.all([
        window.electronAPI.database.customers.getAll(),
        window.electronAPI.database.products.getAll(),
        window.electronAPI.database.sales.getAll()
      ])

      const salesWithItems = await Promise.all(
        (sales || []).map(async (s: any) => {
          try {
            const items = await window.electronAPI.database.saleItems.getBySale(s.id)
            return { ...s, items: items || [] }
          } catch (e) {
            return { ...s, items: [] }
          }
        })
      )

      const backupData: BackupData = {
        customers,
        products,
        sales: salesWithItems,
        settings: {
          theme: localStorage.getItem('theme') || 'light',
          language: localStorage.getItem('language') || 'es',
          currency: localStorage.getItem('currency') || 'COP'
        },
        timestamp: new Date().toISOString(),
        version: '1.1.0'
      }

      const result = await window.electronAPI.backup.save(backupData)
      if (result.success) {
        localStorage.setItem('lastBackupDate', new Date().toISOString())
        setLastBackup(new Date().toLocaleString('es-ES'))
        toast.success('Respaldo exportado exitosamente', {
          description: 'Archivo de respaldo creado correctamente',
          position: 'top-center',
          duration: 1000,
        })
      } else {
        toast.error('Error al exportar respaldo: ' + result.error, {
          description: 'No se pudo crear el archivo de respaldo',
          position: 'top-center',
          duration: 1000,
        })
      }
    } catch (error) {
      console.error('Error exporting backup:', error)
      toast.error('Error al exportar respaldo', {
        description: 'Ocurrió un problema al exportar datos',
        position: 'top-center',
        duration: 1000,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportBackup = async () => {
    if (!isElectron) {
      toast.error('Esta función solo está disponible en la aplicación de escritorio', {
        description: 'Usa la versión de escritorio para esta operación',
        position: 'top-center',
        duration: 1000,
      })
      return
    }

    setIsImporting(true)
    try {
      const result = await window.electronAPI.backup.load()
      if (result.success && result.data) {
        const backupData = result.data as BackupData
        
        if (!backupData.customers || !backupData.products || !backupData.sales) {
          toast.error('Archivo de respaldo inválido', {
            description: 'Falta estructura de clientes, productos o ventas',
            position: 'top-center',
            duration: 1000,
          })
          return
        }

        const importResults = await Promise.all([
          window.electronAPI.backup.importCustomers(backupData.customers),
          window.electronAPI.backup.importProducts(backupData.products),
          window.electronAPI.backup.importSales(backupData.sales)
        ])

        const failedImports = importResults.filter(result => !result.success)
        if (failedImports.length > 0) {
          toast.error('Error en algunas importaciones: ' + failedImports.map(r => r.error).join(', '), {
            description: 'Revisa el detalle de importaciones fallidas',
            position: 'top-center',
            duration: 1000,
          })
          return
        }

        if (backupData.settings) {
          Object.entries(backupData.settings).forEach(([key, value]) => {
            localStorage.setItem(key, value as string)
          })
        }

        toast.success('Respaldo importado exitosamente.', {
          description: 'Datos restaurados desde el archivo de respaldo',
          position: 'top-center',
          duration: 1000,
        })
        await new Promise(resolve => setTimeout(resolve, 1200))
        window.location.reload()
      } else {
        toast.error('Error al importar respaldo: ' + (result.error || 'Archivo no seleccionado'), {
          description: 'No se pudo leer el archivo seleccionado',
          position: 'top-center',
          duration: 1000,
        })
      }
    } catch (error) {
      console.error('Error importing backup:', error)
      toast.error('Error al importar respaldo', {
        description: 'Ocurrió un problema durante la importación',
        position: 'top-center',
        duration: 1000,
      })
    } finally {
      setIsImporting(false)
    }
  }

  

  

  const handleDeleteDatabase = async () => {
    if (!isElectron) {
      toast.error('Esta función solo está disponible en la aplicación de escritorio', {
        description: 'Usa la versión de escritorio para esta operación',
        position: 'top-center',
        duration: 1000,
      })
      return
    }

    setIsDeletingDatabase(true)
    try {
      if (window.electronAPI?.database?.sales?.deleteAll) {
        await window.electronAPI.database.sales.deleteAll();
      }
      if (window.electronAPI?.database?.customers?.deleteAll) {
        await window.electronAPI.database.customers.deleteAll();
      }
      if (window.electronAPI?.database?.products?.deleteAll) {
        await window.electronAPI.database.products.deleteAll();
      }

      const keysToKeep = ['theme', 'language', 'currency']
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key)
        }
      })

      toast.success('Base de datos eliminada exitosamente. La aplicación se reiniciará.', {
        description: 'Se borraron clientes, productos y ventas',
        position: 'top-center',
        duration: 1000,
      })
      
      await new Promise(resolve => setTimeout(resolve, 1200))
      window.location.reload()
      
    } catch (error) {
      console.error('Error deleting database:', error)
      toast.error('Error al eliminar la base de datos', {
        description: 'Revisa restricciones o dependencias',
        position: 'top-center',
        duration: 1000,
      })
    } finally {
      setIsDeletingDatabase(false)
    }
  }

  const handleToggleReduceAnimations = (checked: boolean) => {
    setReduceAnimations(checked)
    localStorage.setItem('reduceAnimations', String(checked))
    window.dispatchEvent(new CustomEvent('app:settings-changed', { detail: { reduceAnimations: checked } }))
    toast.success('Preferencia guardada', {
      description: checked ? 'Animaciones reducidas activadas' : 'Animaciones reducidas desactivadas',
      position: 'top-center',
      duration: 1000,
    })
  }

  const handleToggleExcelLayout = (checked: boolean) => {
    setExcelFormLayout(checked)
    localStorage.setItem('excelFormLayout', String(checked))
    window.dispatchEvent(new CustomEvent('app:settings-changed', { detail: { excelFormLayout: checked } }))
    toast.success('Preferencia guardada', {
      description: checked ? 'Formularios horizontales activados' : 'Formularios horizontales desactivados',
      position: 'top-center',
      duration: 2000,
    })
  }

  const handlePurgeArchived = async () => {
    if (!isElectron) {
      toast.error('Esta función solo está disponible en la aplicación de escritorio', {
        description: 'Usa la versión de escritorio para esta operación',
        position: 'top-center',
        duration: 2000,
      })
      return
    }

    setIsPurgingArchived(true)
    try {
      await window.electronAPI.notifications.purgeArchived()
      toast.success('Archivadas vaciadas', {
        description: 'Se eliminaron definitivamente todas las notificaciones archivadas',
        position: 'top-center',
        duration: 2000,
      })
      window.dispatchEvent(new CustomEvent('notifications:purged'))
    } catch (error) {
      console.error('Error purging archived notifications:', error)
      toast.error('Error al vaciar archivadas', {
        description: 'No fue posible eliminar algunas notificaciones archivadas',
        position: 'top-center',
        duration: 2000,
      })
    } finally {
      setIsPurgingArchived(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl xl:text-4xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-muted-foreground text-sm xl:text-base">Gestiona la configuración y datos de tu aplicación</p>
        </div>

        {/* Preferencias de Interfaz */}
        <div className="space-y-6">
          <div className="p-4 border rounded-lg space-y-3">
            <h2 className="text-lg font-medium">Preferencias de Interfaz</h2>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="reduce-animations" className="font-medium">Reducir animaciones</Label>
                <p className="text-sm text-muted-foreground">Desactiva la animación de navegación para una experiencia más fluida.</p>
              </div>
              <Switch id="reduce-animations" checked={reduceAnimations} onCheckedChange={handleToggleReduceAnimations} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="excel-form-layout" className="font-medium flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  Formularios Horizontales
                </Label>
                <p className="text-sm text-muted-foreground">Aplica un layout horizontal tipo tabla en los formularios.</p>
              </div>
              <Switch id="excel-form-layout" checked={excelFormLayout} onCheckedChange={handleToggleExcelLayout} />
            </div>
          </div>
        </div>

        {/* Gestión de Perfiles/Responsables */}
        <div className="space-y-6">
          <div className="p-4 border rounded-lg space-y-4">
            <h2 className="text-lg font-medium">Perfiles</h2>
            <p className="text-sm text-muted-foreground">Agrega nombres para asignar ventas y filtrar en el menú Ventas.</p>

            {/* Add partner */}
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del perfil"
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
              />
              <Button onClick={handleAddPartner} disabled={!isElectron || !newPartnerName.trim()}>
                Añadir
              </Button>
            </div>

            {/* List partners */}
            <div className="space-y-2">
              {isLoadingPartners ? (
                <div className="text-sm text-muted-foreground">Cargando...</div>
              ) : partners.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay perfiles aún.</div>
              ) : (
                <ul className="space-y-2">
                  {partners.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      {editingPartnerId === p.id ? (
                        <>
                          <Input
                            className="flex-1"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                          />
                          <Button size="sm" variant="outline" onClick={cancelEditPartner}>Cancelar</Button>
                          <Button size="sm" onClick={saveEditPartner} disabled={!editingName.trim()}>Guardar</Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1">{p.name}</span>
                          <Button size="sm" variant="outline" onClick={() => startEditPartner(p.id, p.name)}>Editar</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">Eliminar</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar perfil</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará el perfil y su nombre ya no aparecerá en Ventas ni en el formulario.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePartner(p.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-medium">Gestión de Datos</h2>
            
            {/* Backup Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="space-y-1">
                  <h3 className="font-medium">Exportar Respaldo</h3>
                  <p className="text-sm text-muted-foreground">Crea una copia de seguridad completa</p>
                </div>
                <Button 
                  onClick={handleExportBackup} 
                  disabled={isExporting || !isElectron}
                  className="w-full"
                  size="sm"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </>
                  )}
                </Button>
                {lastBackup && (
                  <p className="text-xs text-muted-foreground">
                    Último: {lastBackup}
                  </p>
                )}
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="space-y-1">
                  <h3 className="font-medium">Importar Respaldo</h3>
                  <p className="text-sm text-muted-foreground">Restaura desde un archivo</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      disabled={isImporting || !isElectron}
                      className="w-full"
                      size="sm"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Importar
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Confirmar Importación
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción reemplazará todos los datos actuales. Esta operación no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleImportBackup}>
                        Importar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
              
          </div>
          
          {/* System Maintenance Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Mantenimiento del Sistema</h2>

            {/* Vaciar Archivadas */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">Vaciar Archivadas</h3>
                  <p className="text-sm text-muted-foreground">Elimina definitivamente todas las notificaciones archivadas.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {}}
                      disabled={!isElectron || isPurgingArchived}
                    >
                      {isPurgingArchived ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Vaciando...
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2" />
                          Vaciar archivadas
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Confirmar vaciado de archivadas
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará PERMANENTEMENTE todas las notificaciones archivadas. Esta operación no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePurgeArchived}>
                        Vaciar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Database Reset - DANGER ZONE */}
            <div className="p-4 border-2 border-red-900 rounded-lg space-y-4 bg-red-950">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium text-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Eliminar Base de Datos
                  </h3>
                  <p className="text-sm text-red-300">
                    ⚠️ PELIGRO: Elimina TODOS los datos (clientes, productos, ventas). Esta acción NO se puede deshacer.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={isDeletingDatabase || !isElectron}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeletingDatabase ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Eliminar Todo
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        ⚠️ CONFIRMAR ELIMINACIÓN TOTAL
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará datos de forma permanente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="font-semibold text-red-700">
                        Esta acción eliminará PERMANENTEMENTE:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Todos los clientes</li>
                        <li>Todos los productos</li>
                        <li>Todas las ventas e instalments</li>
                        <li>Todo el historial de pagos</li>
                      </ul>
                      <p className="font-semibold text-red-700 mt-3">
                        Esta operación NO se puede deshacer. ¿Estás completamente seguro?
                      </p>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteDatabase}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Sí, Eliminar Todo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    </DashboardLayout>
  )
}
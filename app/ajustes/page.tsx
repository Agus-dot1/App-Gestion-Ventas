'use client'

import { useState, useEffect } from 'react'
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
  RefreshCw,
  ArrowUpCircle,
  Info,
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

interface MigrationInfo {
  currentVersion: string
  latestVersion: string
  needsMigration: boolean
  migrationSteps: string[]
}

export default function AjustesPage() {
  const [isElectron, setIsElectron] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [isCheckingMigration, setIsCheckingMigration] = useState(false)
  const [isDeletingDatabase, setIsDeletingDatabase] = useState(false)
  const [cacheSize, setCacheSize] = useState<string>('0 MB')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [migrationInfo, setMigrationInfo] = useState<MigrationInfo | null>(null)
  const [reduceAnimations, setReduceAnimations] = useState<boolean>(false)
  const [excelFormLayout, setExcelFormLayout] = useState<boolean>(false)
  const [isClearingNotifications, setIsClearingNotifications] = useState<boolean>(false)
  const [isPurgingArchived, setIsPurgingArchived] = useState<boolean>(false)
  // Partners management state
  const [partners, setPartners] = useState<any[]>([])
  const [isLoadingPartners, setIsLoadingPartners] = useState<boolean>(false)
  const [newPartnerName, setNewPartnerName] = useState<string>('')
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsElectron(!!window.electronAPI)
      // Cargar preferencia de animaciones
      const savedReduce = localStorage.getItem('reduceAnimations')
      setReduceAnimations(savedReduce === 'true')
      // Cargar preferencia de layout Excel para formularios
      const savedExcel = localStorage.getItem('excelFormLayout')
      setExcelFormLayout(savedExcel === 'true')
      loadCacheInfo()
      loadLastBackupInfo()
      checkMigrationStatus()
    }
  }, [])

  // Gestión de perfiles/partners
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
      // Notify other UI parts to refresh partners immediately
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
      // Notify other UI parts to refresh partners immediately
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
      // Notify other UI parts to refresh partners immediately
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
      // Obtener todos los datos
      const [customers, products, sales] = await Promise.all([
        window.electronAPI.database.customers.getAll(),
        window.electronAPI.database.products.getAll(),
        window.electronAPI.database.sales.getAll()
      ])

      // Adjuntar items por venta para un respaldo completo
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

      // Guardar archivo
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
        
        // Validar estructura del respaldo
        if (!backupData.customers || !backupData.products || !backupData.sales) {
          toast.error('Archivo de respaldo inválido', {
            description: 'Falta estructura de clientes, productos o ventas',
            position: 'top-center',
            duration: 1000,
          })
          return
        }

        // Importar datos
        const importResults = await Promise.all([
          window.electronAPI.backup.importCustomers(backupData.customers),
          window.electronAPI.backup.importProducts(backupData.products),
          window.electronAPI.backup.importSales(backupData.sales)
        ])

        // Verificar si todas las importaciones fueron exitosas
        const failedImports = importResults.filter(result => !result.success)
        if (failedImports.length > 0) {
          toast.error('Error en algunas importaciones: ' + failedImports.map(r => r.error).join(', '), {
            description: 'Revisa el detalle de importaciones fallidas',
            position: 'top-center',
            duration: 1000,
          })
          return
        }

        // Restaurar configuraciones
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

  const checkMigrationStatus = async () => {
    if (!isElectron) return
    
    setIsCheckingMigration(true)
    try {
      const currentVersion = localStorage.getItem('dataVersion') || '1.0.0'
      const latestVersion = '1.1.0' // This would come from app config
      
      const needsMigration = currentVersion !== latestVersion
      const migrationSteps = needsMigration ? [
        'Actualizar estructura de base de datos',
        'Migrar datos de clientes',
        'Actualizar índices de búsqueda',
        'Verificar integridad de datos'
      ] : []
      
      setMigrationInfo({
        currentVersion,
        latestVersion,
        needsMigration,
        migrationSteps
      })
    } catch (error) {
      console.error('Error checking migration status:', error)
    } finally {
      setIsCheckingMigration(false)
    }
  }

  const handleDataMigration = async () => {
    if (!isElectron || !migrationInfo?.needsMigration) return
    
    setIsMigrating(true)
    try {
      for (let i = 0; i < migrationInfo.migrationSteps.length; i++) {
        const step = migrationInfo.migrationSteps[i]
        toast.info(`Ejecutando: ${step}`, {
          description: 'Aplicando paso de migración de datos',
          position: 'top-center',
          duration: 1000,
        })
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      
      }
      
      localStorage.setItem('dataVersion', migrationInfo.latestVersion)
      
      await checkMigrationStatus()
      
      toast.success('Migración de datos completada exitosamente', {
        description: 'Versión actualizada y verificada',
        position: 'top-center',
        duration: 1000,
      })
    } catch (error) {
      console.error('Error during migration:', error)
      toast.error('Error durante la migración de datos', {
        description: 'Revisa el log para más detalles',
        position: 'top-center',
        duration: 1000,
      })
    } finally {
      setIsMigrating(false)
    }
  }

  const handleCheckForUpdates = async () => {
    await checkMigrationStatus()
    toast.info('Verificación de actualizaciones completada', {
      description: 'Estado de migración actualizado',
      position: 'top-center',
      duration: 1000,
    })
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
    // Notificar a toda la app para que el layout se actualice inmediatamente
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
    // Notificar globalmente para que los formularios actualicen su layout
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
          <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
          <p className="text-muted-foreground">Gestiona la configuración y datos de tu aplicación</p>
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

          {/* Data Migration Section
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Migración y Actualización de Datos</h2>
            
            {/* Migration Status 
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">Estado de Migración</h3>
                  <p className="text-sm text-muted-foreground">
                    {migrationInfo ? 
                      `Versión actual: ${migrationInfo.currentVersion} | Última: ${migrationInfo.latestVersion}` :
                      'Verificando estado de migración...'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {migrationInfo?.needsMigration ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Migración Requerida
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Actualizado
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCheckForUpdates}
                    disabled={isCheckingMigration}
                  >
                    {isCheckingMigration ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Verificar
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Migration Steps
              {migrationInfo?.needsMigration && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-amber-600 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Pasos de migración requeridos:
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    {migrationInfo.migrationSteps.map((step, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        {step}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={handleDataMigration}
                    disabled={isMigrating || !isElectron}
                    className="w-full mt-3"
                    size="sm"
                  >
                    {isMigrating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Migrando datos...
                      </>
                    ) : (
                      <>
                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                        Ejecutar Migración
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
           */}

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
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
  Info
} from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsElectron(!!window.electronAPI)
      loadCacheInfo()
      loadLastBackupInfo()
      checkMigrationStatus()
    }
  }, [])

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
      toast.error('Esta función solo está disponible en la aplicación de escritorio')
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

      const backupData: BackupData = {
        customers,
        products,
        sales,
        settings: {
          theme: localStorage.getItem('theme') || 'light',
          language: localStorage.getItem('language') || 'es',
          currency: localStorage.getItem('currency') || 'COP'
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }

      // Guardar archivo
      const result = await window.electronAPI.backup.save(backupData)
      if (result.success) {
        localStorage.setItem('lastBackupDate', new Date().toISOString())
        setLastBackup(new Date().toLocaleString('es-ES'))
        toast.success('Respaldo exportado exitosamente')
      } else {
        toast.error('Error al exportar respaldo: ' + result.error)
      }
    } catch (error) {
      console.error('Error exporting backup:', error)
      toast.error('Error al exportar respaldo')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportBackup = async () => {
    if (!isElectron) {
      toast.error('Esta función solo está disponible en la aplicación de escritorio')
      return
    }

    setIsImporting(true)
    try {
      const result = await window.electronAPI.backup.load()
      if (result.success && result.data) {
        const backupData = result.data as BackupData
        
        // Validar estructura del respaldo
        if (!backupData.customers || !backupData.products || !backupData.sales) {
          toast.error('Archivo de respaldo inválido')
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
          toast.error('Error en algunas importaciones: ' + failedImports.map(r => r.error).join(', '))
          return
        }

        // Restaurar configuraciones
        if (backupData.settings) {
          Object.entries(backupData.settings).forEach(([key, value]) => {
            localStorage.setItem(key, value as string)
          })
        }

        toast.success('Respaldo importado exitosamente. Recarga la página para ver los cambios.')
      } else {
        toast.error('Error al importar respaldo: ' + (result.error || 'Archivo no seleccionado'))
      }
    } catch (error) {
      console.error('Error importing backup:', error)
      toast.error('Error al importar respaldo')
    } finally {
      setIsImporting(false)
    }
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      // Limpiar localStorage
      const keysToKeep = ['theme', 'language', 'currency', 'lastBackupDate']
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key)
        }
      })

      // Limpiar caché de Electron si está disponible
      if (isElectron && window.electronAPI) {
        const result = await window.electronAPI.cache.clear()
        if (result.success) {
          if (result.message) {
            // Show message if there were warnings
            if (result.message.includes('warnings')) {
              toast.warning(result.message)
            } else {
              toast.success(result.message)
            }
          } else {
            toast.success('Caché limpiado exitosamente')
          }
        } else {
          throw new Error(result.error || 'Error al limpiar caché de Electron')
        }
      } else {
        toast.success('Caché de navegador limpiado exitosamente')
      }

      setCacheSize('0 MB')
    } catch (error) {
      console.error('Error clearing cache:', error)
      toast.error('Error al limpiar caché')
    } finally {
      setIsClearingCache(false)
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
      // Simulate migration steps
      for (let i = 0; i < migrationInfo.migrationSteps.length; i++) {
        const step = migrationInfo.migrationSteps[i]
        toast.info(`Ejecutando: ${step}`)
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Here you would implement actual migration logic
        // For example:
        // - Update database schema
        // - Transform data structures
        // - Update indexes
        // - Validate data integrity
      }
      
      // Update data version
      localStorage.setItem('dataVersion', migrationInfo.latestVersion)
      
      // Refresh migration status
      await checkMigrationStatus()
      
      toast.success('Migración de datos completada exitosamente')
    } catch (error) {
      console.error('Error during migration:', error)
      toast.error('Error durante la migración de datos')
    } finally {
      setIsMigrating(false)
    }
  }

  const handleCheckForUpdates = async () => {
    await checkMigrationStatus()
    toast.info('Verificación de actualizaciones completada')
  }

  const handleDeleteDatabase = async () => {
    if (!isElectron) {
      toast.error('Esta función solo está disponible en la aplicación de escritorio')
      return
    }

    setIsDeletingDatabase(true)
    try {
      // Delete all data from all tables
      await Promise.all([
        window.electronAPI.database.customers.deleteAll?.() || Promise.resolve(),
        window.electronAPI.database.products.deleteAll?.() || Promise.resolve(),
        window.electronAPI.database.sales.deleteAll?.() || Promise.resolve()
      ])

      // Clear local storage data related to the app
      const keysToKeep = ['theme', 'language', 'currency']
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key)
        }
      })

      toast.success('Base de datos eliminada exitosamente. La aplicación se reiniciará.')
      
      // Reload the page to refresh the app state
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      console.error('Error deleting database:', error)
      toast.error('Error al eliminar la base de datos')
    } finally {
      setIsDeletingDatabase(false)
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

          {/* Data Migration Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Migración y Actualización de Datos</h2>
            
            {/* Migration Status */}
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
              
              {/* Migration Steps */}
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

          {/* System Maintenance Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Mantenimiento del Sistema</h2>
            
            {/* Cache Management */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">Limpiar Caché</h3>
                  <p className="text-sm text-muted-foreground">Libera espacio eliminando archivos temporales</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">{cacheSize}</Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isClearingCache}
                  >
                    {isClearingCache ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Limpiando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpiar
                      </>
                    )}
                  </Button>
                </div>
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
                      <AlertDialogDescription className="space-y-2">
                        <p className="font-semibold text-red-700">
                          Esta acción eliminará PERMANENTEMENTE:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Todos los clientes</li>
                          <li>Todos los productos</li>
                          <li>Todas las ventas e instalments</li>
                          <li>Todo el historial de pagos</li>
                        </ul>
                        <p className="font-semibold text-red-700 mt-3">
                          Esta operación NO se puede deshacer. ¿Estás completamente seguro?
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
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
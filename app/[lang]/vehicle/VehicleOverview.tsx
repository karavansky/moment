'use client'

import { useState, memo, useMemo } from 'react'
import { Button, Spinner, toast, Modal, AlertDialog } from '@heroui/react'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { useTranslation } from '@/components/Providers'
import { useDisclosure } from '@/lib/useDisclosure'
import { useScheduling } from '@/contexts/SchedulingContext'
import { generateId } from '@/lib/generate-id'
import type { VehicleType, VehicleStatus } from '@/types/transport'
import WorkerSelect from '@/components/scheduling/WorkerSelect'
import type { WorkersForSelect } from '@/components/scheduling/WorkerSelect'

interface VehicleOverviewProps {
  className?: string
}

function VehicleOverview({ className }: VehicleOverviewProps) {
  const { t } = useTranslation()
  const { vehicles, workers, teams, isLoading, isLiveMode, addVehicle, updateVehicle, deleteVehicle } = useScheduling()
  const [isSaving, setIsSaving] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()

  // Form state
  const [plateNumber, setPlateNumber] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType>('STANDARD')
  const [status, setStatus] = useState<VehicleStatus>('ACTIVE')
  const [selectedDriverID, setSelectedDriverID] = useState<string | null>(null)

  // Prepare workers for WorkerSelect
  const workersForSelect: WorkersForSelect = useMemo(() => {
    const rootWorkers = workers
      .filter(w => !w.teamId)
      .map(w => ({
        id: w.id,
        name: w.name,
        surname: w.surname || '',
        fullName: `${w.name} ${w.surname || ''}`.trim(),
      }))

    const groups = teams.map(team => ({
      id: team.id,
      label: team.teamName,
      options: workers
        .filter(w => w.teamId === team.id)
        .map(w => ({
          id: w.id,
          name: w.name,
          surname: w.surname || '',
          fullName: `${w.name} ${w.surname || ''}`.trim(),
          teamName: team.teamName,
        })),
    })).filter(group => group.options.length > 0)

    return { rootWorkers, groups }
  }, [workers, teams])

  const handleCreate = () => {
    setIsCreating(true)
    setEditingVehicle(null)
    setPlateNumber('')
    setVehicleType('STANDARD')
    setStatus('ACTIVE')
    setSelectedDriverID(null)
    onOpen()
  }

  const handleEdit = (vehicle: any) => {
    setIsCreating(false)
    setEditingVehicle(vehicle)
    setPlateNumber(vehicle.plateNumber)
    setVehicleType(vehicle.type)
    setStatus(vehicle.status)
    setSelectedDriverID(vehicle.currentDriverID || null)
    onOpen()
  }

  const handleSave = async () => {
    if (!plateNumber.trim()) {
      toast.danger(t('vehicle.fleet.enterPlate'))
      return
    }

    try {
      setIsSaving(true)

      if (isCreating) {
        addVehicle({
          id: generateId(),
          firmaID: 'mock',
          plateNumber: plateNumber.trim(),
          type: vehicleType,
          status,
          currentDriverID: selectedDriverID,
          currentLat: null,
          currentLng: null,
          lastLocationUpdate: null,
          createdAt: new Date(),
        })
        toast.success(t('vehicle.fleet.added'))
      } else if (editingVehicle) {
        // Detect driver change
        const driverChanged = editingVehicle.currentDriverID !== selectedDriverID

        // Find selected driver to get name and surname
        const selectedDriver = selectedDriverID
          ? workers.find(w => w.id === selectedDriverID)
          : null

        updateVehicle({
          ...editingVehicle,
          plateNumber: plateNumber.trim(),
          type: vehicleType,
          status,
          currentDriverID: selectedDriverID,
          currentDriverName: selectedDriver?.name || null,
          currentDriverSurname: selectedDriver?.surname || null,
        })

        if (driverChanged && selectedDriverID) {
          toast.success(t('vehicle.fleet.updatedWithDriver'))
        } else if (driverChanged && !selectedDriverID) {
          toast.success(t('vehicle.fleet.updatedDriverRemoved'))
        } else {
          toast.success(t('vehicle.fleet.updated'))
        }
      }

      onClose()
    } catch (error) {
      console.error('Error saving vehicle:', error)
      toast.danger(t('vehicle.fleet.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const handleDelete = async (vehicle: any) => {
    setDeleteTarget(vehicle)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    try {
      deleteVehicle(deleteTarget.id)
      toast.success(t('vehicle.fleet.deleted'))
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      toast.danger(t('vehicle.fleet.deleteError'))
    }
    setDeleteTarget(null)
  }

  const typeLabel = (type: VehicleType) => t(`vehicle.fleet.types.${type}`, type)
  const statusLabel = (status: VehicleStatus) => t(`vehicle.fleet.statuses.${status}`, status)

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className || ''}`}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-4 h-full overflow-y-auto ${className || ''}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{t('vehicle.fleet.title')} ({vehicles.length})</h3>
        <Button variant="primary" size="sm" onPress={handleCreate}>
          <Plus className="w-4 h-4 mr-1" /> {t('vehicle.fleet.addVehicle')}
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-default-400">
          <Truck className="w-16 h-16 mb-4 opacity-50" />
          <p>{t('vehicle.fleet.noVehicles')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-default-200">
              <tr className="text-left">
                <th className="pb-3 pr-4 font-medium">{t('vehicle.fleet.plateNumber')}</th>
                <th className="pb-3 pr-4 font-medium">{t('vehicle.fleet.type')}</th>
                <th className="pb-3 pr-4 font-medium">{t('vehicle.fleet.status')}</th>
                <th className="pb-3 pr-4 font-medium">{t('vehicle.fleet.driver')}</th>
                <th className="pb-3 font-medium text-right">{t('vehicle.fleet.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(vehicle => (
                <tr key={vehicle.id} className="border-b border-default-100 last:border-0">
                  <td className="py-3 pr-4 font-medium">{vehicle.plateNumber}</td>
                  <td className="py-3 pr-4">{typeLabel(vehicle.type)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        vehicle.status === 'ACTIVE'
                          ? 'bg-success-100 text-success-700'
                          : vehicle.status === 'REPAIR'
                            ? 'bg-warning-100 text-warning-700'
                            : 'bg-default-100 text-default-500'
                      }`}
                    >
                      {statusLabel(vehicle.status)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-default-500">
                    {vehicle.currentDriverID
                      ? `${vehicle.currentDriverName || ''} ${vehicle.currentDriverSurname || ''}`.trim()
                      : t('vehicle.fleet.noDriver')}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onPress={() => handleEdit(vehicle)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="danger" size="sm" onPress={() => handleDelete(vehicle)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
          <Modal.Container className="max-w-md" placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <span>{isCreating ? t('vehicle.fleet.addTitle') : t('vehicle.fleet.editTitle')}</span>
              </Modal.Header>
              <Modal.Body className="gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">{t('vehicle.fleet.plateNumber')}</label>
                  <input
                    type="text"
                    placeholder={t('vehicle.fleet.platePlaceholder')}
                    value={plateNumber}
                    onChange={e => setPlateNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-default-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">{t('vehicle.fleet.type')}</label>
                  <select
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value as VehicleType)}
                    className="w-full px-3 py-2 border border-default-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="STANDARD">{t('vehicle.fleet.types.STANDARD')}</option>
                    <option value="MINIVAN">{t('vehicle.fleet.types.MINIVAN')}</option>
                    <option value="WHEELCHAIR">{t('vehicle.fleet.types.WHEELCHAIR')}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">{t('vehicle.fleet.status')}</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2 border border-default-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ACTIVE">{t('vehicle.fleet.statuses.ACTIVE')}</option>
                    <option value="REPAIR">{t('vehicle.fleet.statuses.MAINTENANCE')}</option>
                    <option value="INACTIVE">{t('vehicle.fleet.statuses.INACTIVE')}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <WorkerSelect
                    workersForSelect={workersForSelect}
                    selectedWorkerID={selectedDriverID}
                    onSelectionChange={setSelectedDriverID}
                    label={t('vehicle.fleet.driverLabel')}
                    placeholder={t('vehicle.fleet.driverPlaceholder')}
                    clearable
                  />
                  {!isCreating && editingVehicle?.currentDriverID && editingVehicle.currentDriverID !== selectedDriverID && (
                    <p className="text-xs text-warning-600">
                      ⚠️ {t('vehicle.fleet.driverChangeWarning')}
                    </p>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" onPress={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" isDisabled={isSaving} onPress={handleSave}>
                  {isSaving ? <Spinner size="sm" /> : isCreating ? t('vehicle.fleet.add') : t('common.save')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog.Backdrop isOpen={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }} isDismissable>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{t('vehicle.fleet.confirmDelete')} {deleteTarget?.plateNumber}?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">{t('common.cancel')}</Button>
              <Button variant="danger" onPress={confirmDelete}>
                <Trash2 className="w-4 h-4" /> {t('common.delete')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  )
}

export default memo(VehicleOverview)

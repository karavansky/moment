'use client'

import { useState, memo } from 'react'
import { Button, Spinner, toast, Modal } from '@heroui/react'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { useDisclosure } from '@/lib/useDisclosure'
import { useScheduling } from '@/contexts/SchedulingContext'
import { generateId } from '@/lib/generate-id'
import type { VehicleType, VehicleStatus } from '@/types/transport'

interface VehicleOverviewProps {
  className?: string
}

function VehicleOverview({ className }: VehicleOverviewProps) {
  const { vehicles, isLoading, isLiveMode, addVehicle, updateVehicle, deleteVehicle } = useScheduling()
  const [isSaving, setIsSaving] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()

  // Form state
  const [plateNumber, setPlateNumber] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType>('STANDARD')
  const [status, setStatus] = useState<VehicleStatus>('ACTIVE')

  const handleCreate = () => {
    setIsCreating(true)
    setEditingVehicle(null)
    setPlateNumber('')
    setVehicleType('STANDARD')
    setStatus('ACTIVE')
    onOpen()
  }

  const handleEdit = (vehicle: any) => {
    setIsCreating(false)
    setEditingVehicle(vehicle)
    setPlateNumber(vehicle.plateNumber)
    setVehicleType(vehicle.type)
    setStatus(vehicle.status)
    onOpen()
  }

  const handleSave = async () => {
    if (!plateNumber.trim()) {
      toast.danger('Введите гос. номер')
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
          currentDriverID: null,
          currentLat: null,
          currentLng: null,
          lastLocationUpdate: null,
          createdAt: new Date(),
        })
        toast.success('Транспорт добавлен')
      } else if (editingVehicle) {
        updateVehicle({
          ...editingVehicle,
          plateNumber: plateNumber.trim(),
          type: vehicleType,
          status,
        })
        toast.success('Транспорт обновлен')
      }

      onClose()
    } catch (error) {
      console.error('Error saving vehicle:', error)
      toast.danger('Ошибка сохранения')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (vehicle: any) => {
    if (!confirm(`Удалить транспорт ${vehicle.plateNumber}?`)) return

    try {
      deleteVehicle(vehicle.id)
      toast.success('Транспорт удален')
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      toast.danger('Ошибка удаления')
    }
  }

  const vehicleTypeLabels: Record<VehicleType, string> = {
    STANDARD: 'Стандарт',
    MINIVAN: 'Минивэн',
    WHEELCHAIR: 'Для инвалидов',
  }

  const vehicleStatusLabels: Record<VehicleStatus, string> = {
    ACTIVE: 'Активный',
    REPAIR: 'Ремонт',
    INACTIVE: 'Неактивный',
  }

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
        <h3 className="text-lg font-semibold">Автопарк ({vehicles.length})</h3>
        <Button variant="primary" size="sm" onPress={handleCreate}>
          <Plus className="w-4 h-4 mr-1" /> Добавить транспорт
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-default-400">
          <Truck className="w-16 h-16 mb-4 opacity-50" />
          <p>Транспорт не добавлен</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-default-200">
              <tr className="text-left">
                <th className="pb-3 pr-4 font-medium">Гос. номер</th>
                <th className="pb-3 pr-4 font-medium">Тип</th>
                <th className="pb-3 pr-4 font-medium">Статус</th>
                <th className="pb-3 pr-4 font-medium">Водитель</th>
                <th className="pb-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(vehicle => (
                <tr key={vehicle.id} className="border-b border-default-100 last:border-0">
                  <td className="py-3 pr-4 font-medium">{vehicle.plateNumber}</td>
                  <td className="py-3 pr-4">{vehicleTypeLabels[vehicle.type]}</td>
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
                      {vehicleStatusLabels[vehicle.status]}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-default-500">
                    {vehicle.currentDriverID || '—'}
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
                <span>{isCreating ? 'Добавить транспорт' : 'Редактировать транспорт'}</span>
              </Modal.Header>
              <Modal.Body className="gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Гос. номер</label>
                  <input
                    type="text"
                    placeholder="A123BC777"
                    value={plateNumber}
                    onChange={e => setPlateNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-default-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Тип транспорта</label>
                  <select
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value as VehicleType)}
                    className="w-full px-3 py-2 border border-default-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="STANDARD">Стандарт</option>
                    <option value="MINIVAN">Минивэн</option>
                    <option value="WHEELCHAIR">Для инвалидов</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Статус</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2 border border-default-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ACTIVE">Активный</option>
                    <option value="REPAIR">Ремонт</option>
                    <option value="INACTIVE">Неактивный</option>
                  </select>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" onPress={onClose}>
                  Отмена
                </Button>
                <Button variant="primary" isDisabled={isSaving} onPress={handleSave}>
                  {isSaving ? <Spinner size="sm" /> : isCreating ? 'Добавить' : 'Сохранить'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}

export default memo(VehicleOverview)

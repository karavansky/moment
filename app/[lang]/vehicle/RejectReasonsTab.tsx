'use client'

import { useState, memo } from 'react'
import { Button, Spinner, toast, Modal, Switch, AlertDialog } from '@heroui/react'
import { Plus, Pencil, Trash2, Ban, ToggleLeft, ToggleRight } from 'lucide-react'
import { useTranslation } from '@/components/Providers'
import { useDisclosure } from '@/lib/useDisclosure'
import { useScheduling } from '@/contexts/SchedulingContext'
import { generateId } from '@/lib/generate-id'
import type { RejectReason } from '@/types/transport'

interface RejectReasonsTabProps {
  className?: string
}

function RejectReasonsTab({ className }: RejectReasonsTabProps) {
  const { t } = useTranslation()
  const { rejectReasons, isLoading, isLiveMode, addRejectReason, updateRejectReason, deleteRejectReason } = useScheduling()
  const [isSaving, setIsSaving] = useState(false)
  const [editingReason, setEditingReason] = useState<RejectReason | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()

  // Form state
  const [reasonText, setReasonText] = useState('')
  const [isActive, setIsActive] = useState(true)

  const handleCreate = () => {
    setIsCreating(true)
    setEditingReason(null)
    setReasonText('')
    setIsActive(true)
    onOpen()
  }

  const handleEdit = (reason: RejectReason) => {
    setIsCreating(false)
    setEditingReason(reason)
    setReasonText(reason.reasonText)
    setIsActive(reason.isActive)
    onOpen()
  }

  const handleSave = async () => {
    if (!reasonText.trim()) {
      toast.danger(t('vehicle.rejectReasons.enterText'))
      return
    }

    try {
      setIsSaving(true)

      if (isCreating) {
        addRejectReason({
          id: generateId(),
          firmaID: 'mock',
          reasonText: reasonText.trim(),
          isActive,
          createdAt: new Date(),
        })
        toast.success(t('vehicle.rejectReasons.added'))
      } else if (editingReason) {
        updateRejectReason({
          ...editingReason,
          reasonText: reasonText.trim(),
          isActive,
        })
        toast.success(t('vehicle.rejectReasons.updated'))
      }

      onClose()
    } catch (error) {
      console.error('Error saving reason:', error)
      toast.danger(t('vehicle.rejectReasons.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (reason: RejectReason) => {
    try {
      updateRejectReason({
        ...reason,
        isActive: !reason.isActive,
      })
      toast.success(reason.isActive ? t('vehicle.rejectReasons.deactivated') : t('vehicle.rejectReasons.activated'))
    } catch (error) {
      console.error('Error toggling reason:', error)
      toast.danger(t('vehicle.rejectReasons.toggleError'))
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<RejectReason | null>(null)

  const handleDelete = (reason: RejectReason) => {
    setDeleteTarget(reason)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    try {
      deleteRejectReason(deleteTarget.id)
      toast.success(t('vehicle.rejectReasons.deleted'))
    } catch (error) {
      console.error('Error deleting reason:', error)
      toast.danger(t('vehicle.rejectReasons.deleteError'))
    }
    setDeleteTarget(null)
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className || ''}`}>
        <Spinner size="lg" />
      </div>
    )
  }

  const activeReasons = rejectReasons.filter(r => r.isActive)
  const inactiveReasons = rejectReasons.filter(r => !r.isActive)

  return (
    <div className={`flex flex-col gap-4 h-full overflow-y-auto ${className || ''}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{t('vehicle.rejectReasons.title')} ({rejectReasons.length})</h3>
        <Button variant="primary" size="sm" onPress={handleCreate}>
          <Plus className="w-4 h-4 mr-1" /> {t('vehicle.rejectReasons.addReason')}
        </Button>
      </div>

      {rejectReasons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-default-400">
          <Ban className="w-16 h-16 mb-4 opacity-50" />
          <p>{t('vehicle.rejectReasons.noReasons')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active reasons */}
          {activeReasons.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-default-600 mb-3">
                {t('vehicle.rejectReasons.active')} ({activeReasons.length})
              </h4>
              <div className="space-y-2">
                {activeReasons.map(reason => (
                  <div
                    key={reason.id}
                    className="flex items-center justify-between p-3 bg-default-50 rounded-lg border border-default-200"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{reason.reasonText}</p>
                      <p className="text-xs text-default-400 mt-1">
                        {t('vehicle.rejectReasons.created')} {new Date(reason.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => handleToggleActive(reason)}
                      >
                        <ToggleRight className="w-4 h-4 text-success-600" />
                      </Button>
                      <Button variant="outline" size="sm" onPress={() => handleEdit(reason)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="danger" size="sm" onPress={() => handleDelete(reason)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive reasons */}
          {inactiveReasons.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-default-400 mb-3">
                {t('vehicle.rejectReasons.inactive')} ({inactiveReasons.length})
              </h4>
              <div className="space-y-2">
                {inactiveReasons.map(reason => (
                  <div
                    key={reason.id}
                    className="flex items-center justify-between p-3 bg-default-50 rounded-lg border border-default-100 opacity-60"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-default-500">{reason.reasonText}</p>
                      <p className="text-xs text-default-400 mt-1">
                        {t('vehicle.rejectReasons.created')} {new Date(reason.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => handleToggleActive(reason)}
                      >
                        <ToggleLeft className="w-4 h-4 text-default-400" />
                      </Button>
                      <Button variant="outline" size="sm" onPress={() => handleEdit(reason)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="danger" size="sm" onPress={() => handleDelete(reason)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
          <Modal.Container className="max-w-md" placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <span>{isCreating ? t('vehicle.rejectReasons.addTitle') : t('vehicle.rejectReasons.editTitle')}</span>
              </Modal.Header>
              <Modal.Body className="gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">{t('vehicle.rejectReasons.reasonText')}</label>
                  <input
                    type="text"
                    placeholder={t('vehicle.rejectReasons.reasonPlaceholder')}
                    value={reasonText}
                    onChange={e => setReasonText(e.target.value)}
                    className="w-full px-3 py-2 border border-default-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('vehicle.rejectReasons.isActive')}</label>
                  <Switch isSelected={isActive} onChange={(value: boolean) => setIsActive(value)} />
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" onPress={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" isDisabled={isSaving} onPress={handleSave}>
                  {isSaving ? <Spinner size="sm" /> : isCreating ? t('vehicle.rejectReasons.add') : t('common.save')}
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
              <AlertDialog.Heading>{t('vehicle.rejectReasons.confirmDelete')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>{deleteTarget?.reasonText}</p>
            </AlertDialog.Body>
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

export default memo(RejectReasonsTab)

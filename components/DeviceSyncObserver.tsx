'use client'

import { useDeviceSync } from '@/hooks/useDeviceSync'

export default function DeviceSyncObserver() {
  useDeviceSync()
  return null
}

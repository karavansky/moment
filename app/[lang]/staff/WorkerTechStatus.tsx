'use client'

import { Card, Separator, Button, Spinner } from '@heroui/react'
import { Worker } from '@/types/scheduling'
import {
  Smartphone,
  Bell,
  MapPin,
  CheckCircle2,
  XCircle,
  Battery,
  Gauge,
  RotateCw,
} from 'lucide-react'
import React, { memo, useState } from 'react'

interface WorkerTechStatusProps {
  worker: Worker
  isCreateNew?: boolean
  className?: string
}

export const WorkerTechStatus = memo(function WorkerTechStatus({
  worker,
  isCreateNew = false,
  className,
}: WorkerTechStatusProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{
    status: 'idle' | 'success' | 'error'
    message?: string
  }>({ status: 'idle' })

  if (isCreateNew) {
    return (
      <Card
        className={`w-full max-w-md border border-gray-200 dark:border-gray-700 ${className || ''}`}
      >
        <Card.Header>
          <Card.Title>Device & Telemetry</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-sm text-gray-500">Worker must log in to see technical status.</p>
        </Card.Content>
      </Card>
    )
  }

  const isConnected = !!worker.userID || !!worker.lastLoginAt

  const handleVerifyPush = async () => {
    setIsVerifying(true)
    setVerifyResult({ status: 'idle' })
    try {
      const res = await fetch('/api/staff/verify-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserID: worker.userID }),
      })
      const data = await res.json()
      if (data.success) {
        setVerifyResult({ status: 'success', message: 'Sent verification test successfully.' })
      } else {
        setVerifyResult({ status: 'error', message: data.reason || 'Verification failed.' })
      }
    } catch (err: any) {
      setVerifyResult({ status: 'error', message: 'Network error.' })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Card
      className={`w-full max-w-md border border-gray-200 dark:border-gray-700 ${className || ''}`}
    >
      <Card.Header className="pb-2">
        <Card.Title>Device & Telemetry</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="flex flex-col gap-4">
          {/* Connection Status */}
          <div className="flex items-start gap-3">
            <Smartphone
              className={`w-5 h-5 shrink-0 mt-0.5 ${isConnected ? 'text-blue-500' : 'text-gray-400'}`}
            />
            <div className="flex-1 w-full min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                App Installation
              </p>
              {isConnected ? (
                <div className="flex flex-col mt-0.5 w-full">
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active profile</span>
                  </div>
                  {worker.lastLoginAt && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      Last ping: {new Date(worker.lastLoginAt).toLocaleString()}
                    </p>
                  )}
                  {worker.osVersion && (
                    <p className="text-xs text-gray-500 mt-1 truncate flex items-center gap-1">
                      <Gauge className="w-3 h-3" /> PWA: {worker.pwaVersion || '?'} | Device:{' '}
                      {worker.osVersion}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Not connected to an account</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Battery Status */}
          <div className="flex items-start gap-3">
            <Battery
              className={`w-5 h-5 shrink-0 mt-0.5 ${(worker.batteryLevel ?? 0) > 20 ? 'text-green-500' : (worker.batteryLevel ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Battery Level</p>
              {worker.batteryLevel !== null && worker.batteryLevel !== undefined ? (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">{worker.batteryLevel}%</span>
                  <span>({worker.batteryStatus === 'charging' ? 'Charging ⚡' : 'Unplugged'})</span>
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-1">Status not reported yet</div>
              )}
            </div>
          </div>

          <Separator />

          {/* Background Location */}
          <div className="flex items-start gap-3">
            <MapPin
              className={`w-5 h-5 shrink-0 mt-0.5 ${worker.geolocationEnabled ? 'text-green-500' : 'text-gray-400'}`}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">GPS Connectivity</p>
              {worker.geolocationEnabled ? (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Allowed during appointments</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-red-500">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Tracking disconnected</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="flex items-start gap-3">
            <Bell
              className={`w-5 h-5 shrink-0 mt-0.5 ${worker.pushNotificationsEnabled ? 'text-blue-500' : 'text-gray-400'}`}
            />
            <div className="flex-1 w-full min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Push Notifications
                </p>
                {isConnected && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 min-h-0 text-xs px-2"
                    onPress={handleVerifyPush}
                    isDisabled={isVerifying}
                  >
                    {isVerifying ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <RotateCw className="w-3 h-3 mr-1" />
                        Ping Device
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                {worker.pushNotificationsEnabled ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>User allowed in portal</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-red-500">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Opted-out by user</span>
                  </div>
                )}

                {worker.hasPushSubscription ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Hardware token bound successfully</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-red-500">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>No bound APNs/FCM devices</span>
                  </div>
                )}

                {verifyResult.status === 'success' && (
                  <div className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded text-xs break-all">
                    {verifyResult.message}
                  </div>
                )}
                {verifyResult.status === 'error' && (
                  <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded text-xs break-all">
                    {verifyResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card>
  )
})

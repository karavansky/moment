'use client'

import { useState, useEffect, use } from 'react'
import { Switch, Spinner, Dropdown, Autocomplete, Button, Label, ListBox, AlertDialog, TextField, Input, toastQueue, Tag, TagGroup, EmptyState, SearchField, useFilter } from '@heroui/react'
import { Bell, MapPin, ShieldAlert, Share, Plus, Download, Globe, Trash2, User } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useAuth } from '@/components/AuthProvider'
import { useSession } from 'next-auth/react'
import { usePWAInstall } from '@/contexts/PWAInstallContext'
import { useTranslation } from '@/components/Providers'
import { CountriesHelper } from '@/lib/countries'
import CityAutocomplete from '@/components/settings/CityAutocomplete'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface UserSettings {
  pushNotificationsEnabled: boolean
  geolocationEnabled: boolean
  lang?: string
  country?: string
  citiesID?: number[]
}

interface City {
  id: number
  city: string
  firmaID: number
}

export default function SettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = use(params)
  const { session, status: authStatus } = useAuth()
  const { update: updateSession } = useSession()
  const push = usePushNotifications()
  const geo = useGeolocation()
  const { isInstallable, installPWA } = usePWAInstall()
  const { contains } = useFilter({ sensitivity: 'base' })

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [policyError, setPolicyError] = useState(false)
  const { t } = useTranslation()

  // Regional settings state
  const [cities, setCities] = useState<City[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [newCityName, setNewCityName] = useState('')
  const [addingCity, setAddingCity] = useState(false)

  // State for tracking popover open state
  const [isCountryOpen, setIsCountryOpen] = useState(false)
  const [isCitiesOpen, setIsCitiesOpen] = useState(false)

  // Scroll to selected item when popover opens
  useEffect(() => {
    if (isCountryOpen && settings?.country) {
      setTimeout(() => {
        console.log('[Auto-scroll] Looking for country:', settings.country)

        // Try different selectors
        let selectedItem = document.querySelector(`[data-key="${settings.country}"]`)
        console.log('[Auto-scroll] Found with data-key:', selectedItem)

        if (!selectedItem) {
          selectedItem = document.querySelector(`[id="${settings.country}"]`)
          console.log('[Auto-scroll] Found with id:', selectedItem)
        }

        if (!selectedItem) {
          selectedItem = document.querySelector(`[aria-selected="true"]`)
          console.log('[Auto-scroll] Found with aria-selected:', selectedItem)
        }

        // Log all ListBox items to see their attributes
        const allItems = document.querySelectorAll('[role="option"]')
        console.log('[Auto-scroll] All options:', allItems.length)
        allItems.forEach((item, i) => {
          console.log(`  Item ${i}:`, {
            id: item.getAttribute('id'),
            dataKey: item.getAttribute('data-key'),
            ariaSelected: item.getAttribute('aria-selected'),
            textContent: item.textContent?.slice(0, 30)
          })
        })

        if (selectedItem) {
          console.log('[Auto-scroll] Scrolling to:', selectedItem)
          selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' })
        } else {
          console.log('[Auto-scroll] No selected item found')
        }
      }, 300) // Увеличил timeout до 300ms
    }
  }, [isCountryOpen, settings?.country])

  useEffect(() => {
    if (isCitiesOpen && settings?.citiesID && settings.citiesID.length > 0) {
      setTimeout(() => {
        const firstCityId = settings.citiesID?.[0]?.toString()
        if (!firstCityId) return
        console.log('[Auto-scroll Cities] Looking for city:', firstCityId)

        // Try different selectors
        let selectedItem = document.querySelector(`[data-key="${firstCityId}"]`)
        console.log('[Auto-scroll Cities] Found with data-key:', selectedItem)

        if (!selectedItem) {
          selectedItem = document.querySelector(`[id="${firstCityId}"]`)
          console.log('[Auto-scroll Cities] Found with id:', selectedItem)
        }

        if (!selectedItem) {
          selectedItem = document.querySelector(`[aria-selected="true"]`)
          console.log('[Auto-scroll Cities] Found with aria-selected:', selectedItem)
        }

        if (selectedItem) {
          console.log('[Auto-scroll Cities] Scrolling to:', selectedItem)
          selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' })
        } else {
          console.log('[Auto-scroll Cities] No selected item found')
        }
      }, 300)
    }
  }, [isCitiesOpen, settings?.citiesID])

  // Profile fields state
  const [userName, setUserName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileChanged, setProfileChanged] = useState(false)

  const isDirector = session?.user?.status === 0 || session?.user?.status === null

  // Debug: Watch settings.country changes
  useEffect(() => {
    console.log('[Settings] Country value changed:', settings?.country)
  }, [settings?.country])

  // Initialize profile fields from session
  useEffect(() => {
    if (session?.user) {
      console.log('[Settings] Session user data:', {
        name: session.user.name,
        email: session.user.email,
        organisationName: session.user.organisationName,
        firmaID: session.user.firmaID,
        status: session.user.status,
      })
      setUserName(session.user.name || '')
      setOrganizationName(session.user.organisationName || '')
      setProfileChanged(false)
    }
  }, [session])

  // Track profile changes
  useEffect(() => {
    if (!session?.user) return
    const nameChanged = userName !== (session.user.name || '')
    const orgChanged = isDirector && organizationName !== (session.user.organisationName || '')
    setProfileChanged(nameChanged || orgChanged)
  }, [userName, organizationName, session, isDirector])

  const handleSaveProfile = async () => {
    if (!profileChanged) return

    setSavingProfile(true)
    try {
      const body: { name: string; organisationName?: string } = { name: userName }
      if (isDirector) {
        body.organisationName = organizationName
      }

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        console.log('[Settings] Profile saved successfully, updating session...')

        // Update session with new data
        // NextAuth will merge these updates into the session
        await updateSession({
          user: {
            name: userName,
            organisationName: isDirector ? organizationName : undefined,
          }
        })

        console.log('[Settings] Session updated with new data')

        toastQueue.add({
          title: 'Profile Updated',
          description: 'Your profile has been saved successfully',
          variant: 'success',
        })

        // Reset profileChanged flag
        setProfileChanged(false)
      } else {
        toastQueue.add({
          title: 'Save Failed',
          description: 'Failed to update profile. Please try again.',
          variant: 'danger',
        })
        console.error('[Settings] Failed to save profile')
      }
    } catch (err) {
      toastQueue.add({
        title: 'Error',
        description: 'An error occurred while saving your profile',
        variant: 'danger',
      })
      console.error('[Settings] Save profile error:', err)
    } finally {
      setSavingProfile(false)
    }
  }

  // Fetch settings from server
  useEffect(() => {
    if (authStatus !== 'authenticated') return

    fetch('/api/settings')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) setSettings(data)
      })
      .catch(err => console.error('[Settings] Fetch error:', err))
      .finally(() => setLoading(false))
  }, [authStatus])

  // Fetch cities list if Director
  useEffect(() => {
    if (authStatus !== 'authenticated' || !isDirector) return

    setLoadingCities(true)
    fetch('/api/cities')
      .then(res => (res.ok ? res.json() : []))
      .then(data => setCities(data))
      .catch(err => console.error('[Settings] Fetch cities error:', err))
      .finally(() => setLoadingCities(false))
  }, [authStatus, isDirector])

  // Debug: Check actual permission status
  useEffect(() => {
    console.log('[SettingsPage] Geo hook state:', {
      permission: geo.permission,
      isReady: geo.isReady,
      isTracking: geo.isTracking,
    })

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      // Check permissions API
      navigator.permissions?.query({ name: 'geolocation' }).then(result => {
        console.log('[SettingsPage] navigator.permissions.query:', result.state)
      })

      // Try to get position to verify access
      navigator.geolocation.getCurrentPosition(
        () => console.log('[SettingsPage] getCurrentPosition: Success'),
        error => {
          console.log('[SettingsPage] getCurrentPosition: Error', error.message)
          if (error.message.toLowerCase().includes('permissions policy')) {
            setPolicyError(true)
          }
        }
      )
    }
  }, [geo.permission, geo.isReady, geo.isTracking])

  // Explicitly sync Push Subscription ownership with the backend when the user visits settings
  useEffect(() => {
    if (push.isReady && push.isSubscribed && push.syncSubscription) {
      push.syncSubscription()
    }
  }, [push.isReady, push.isSubscribed, push.syncSubscription])

  const updateSetting = async (key: keyof UserSettings, value: boolean | string | number[]) => {
    console.log('[updateSetting] Updating:', key, '=', value)
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (res.ok) {
        const updated = await res.json()
        console.log('[updateSetting] Response:', updated)
        setSettings(updated)
        console.log('[updateSetting] State updated, new country:', updated.country)
      } else {
        console.error('[updateSetting] Response not ok:', res.status, res.statusText)
      }
    } catch (err) {
      console.error('[Settings] Update error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddCity = async () => {
    if (!newCityName.trim() || !session?.user?.firmaID) return

    setAddingCity(true)
    try {
      const res = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: newCityName.trim() }),
      })
      if (res.ok) {
        const newCity = await res.json()
        setCities([...cities, newCity])
        setNewCityName('')
      }
    } catch (err) {
      console.error('[Settings] Add city error:', err)
    } finally {
      setAddingCity(false)
    }
  }

  const handleDeleteCity = async (cityId: number) => {
    try {
      const res = await fetch(`/api/cities/${cityId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setCities(cities.filter(c => c.id !== cityId))
        // Remove city from citiesID if it was selected
        if (settings?.citiesID?.includes(cityId)) {
          const newCitiesID = settings.citiesID.filter(id => id !== cityId)
          await updateSetting('citiesID', newCitiesID)
        }
      }
    } catch (err) {
      console.error('[Settings] Delete city error:', err)
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (authStatus !== 'authenticated') {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Profile Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
        </div>

        {settings && session?.user && (
          <div className="space-y-4">
            {/* User Name */}
            <TextField name="userName" className="w-full" onChange={setUserName}>
              <Label>Your Name</Label>
              <Input
                type="text"
                value={userName}
                placeholder="Enter your name"
              />
            </TextField>

            {/* Organization Name - Director only */}
            {isDirector && (
              <TextField name="organizationName" className="w-full" onChange={setOrganizationName}>
                <Label>
                  Organization Name
                  <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400">
                    (Director only)
                  </span>
                </Label>
                <Input
                  type="text"
                  value={organizationName}
                  placeholder="Enter organization name"
                />
              </TextField>
            )}

            {/* Email (read-only) */}
            <TextField name="email" className="w-full" isDisabled>
              <Label>Email</Label>
              <Input
                type="email"
                value={session.user.email || ''}
                readOnly
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Email cannot be changed
              </p>
            </TextField>

            {/* Save Changes Button */}
            <div className="flex gap-2 items-center">
              <Button
                variant="primary"
                onPress={handleSaveProfile}
                isDisabled={!profileChanged || savingProfile}
                className="flex-1"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
              {profileChanged && !savingProfile && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Unsaved changes
                </span>
              )}
            </div>

            {/* Delete Account Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <AlertDialog>
                <Button variant="danger" fullWidth>
                  Delete Account
                </Button>
                <AlertDialog.Backdrop>
                  <AlertDialog.Container>
                    <AlertDialog.Dialog className="sm:max-w-[400px]">
                      <AlertDialog.CloseTrigger />
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="danger" />
                        <AlertDialog.Heading>Delete Account Permanently?</AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        <p>
                          This action cannot be undone. This will permanently delete your account and remove all associated data including:
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                          <li>All workers</li>
                          <li>All clients</li>
                          <li>All appointments</li>
                          <li>All routes</li>
                          <li>All reports</li>
                          <li>Organization settings</li>
                        </ul>
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button slot="close" variant="tertiary">
                          Cancel
                        </Button>
                        <Button slot="close" variant="danger">
                          Delete Forever
                        </Button>
                      </AlertDialog.Footer>
                    </AlertDialog.Dialog>
                  </AlertDialog.Container>
                </AlertDialog.Backdrop>
              </AlertDialog>
            </div>
          </div>
        )}
      </section>

      {/* Regional Settings Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Regional Settings</h2>
        </div>

        {settings && (
          <div className="space-y-4">
            {/* Language Selection - All users */}
            <div>
              <Label className="text-sm font-medium text-gray-900 dark:text-white block mb-2">
                Interface Language
              </Label>
              <LanguageSwitcher currentLang={lang} variant="full" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Choose your preferred interface language. Your selection is automatically saved.
              </p>
            </div>

            {/* Country Selection - Director only */}
            {isDirector && (
              <div>
                <Autocomplete
                  fullWidth
                  className="max-w-xs"
                  name="country"
                  value={settings.country || null}
                  onChange={(key: React.Key | React.Key[] | null) => {
                    console.log('[Country Autocomplete] onChange called with key:', key)
                    if (key && !Array.isArray(key)) {
                      console.log('[Country Autocomplete] Calling updateSetting with:', key)
                      updateSetting('country', key as string)
                    }
                  }}
                  onOpenChange={setIsCountryOpen}
                  isDisabled={saving}
                  placeholder="Select country"
                >
                  <Label>
                    Country
                    <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400">
                      (Director only)
                    </span>
                  </Label>
                  <Autocomplete.Trigger>
                    <Autocomplete.Value />
                    <Autocomplete.ClearButton />
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover>
                    <Autocomplete.Filter filter={contains}>
                      <SearchField autoFocus name="search">
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input placeholder="Search country..." />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox
                        className="max-h-60 overflow-y-auto"
                        renderEmptyState={() => <EmptyState>No countries found</EmptyState>}
                      >
                        {CountriesHelper.getAllCountries().map(({ code, data }) => {
                          const FlagIcon = data.flag
                          return (
                            <ListBox.Item key={code} id={code} textValue={data.name}>
                              <div className="flex items-center gap-2">
                                <FlagIcon className="w-4 h-3 rounded-sm" />
                                {data.name}
                              </div>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          )
                        })}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                </Autocomplete>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select your country for better address suggestions
                </p>
              </div>
            )}

            {/* Cities Management - Director only */}
            {isDirector && (
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white block mb-2">
                  City Filtering
                  <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400">
                    (Director only)
                  </span>
                </label>

                {/* City List */}
                {loadingCities ? (
                  <Spinner size="sm" />
                ) : (
                  <div className="space-y-2">
                    {cities.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                          {cities.map(city => (
                            <div
                              key={city.id}
                              className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg"
                            >
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {city.city}
                              </span>
                              <Button
                                variant="tertiary"
                                size="sm"
                                onPress={() => handleDeleteCity(city.id)}
                                aria-label={`Delete ${city.city}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Cities Selection */}
                        <div className="mt-3">
                          <Autocomplete
                            fullWidth
                            className="max-w-xs"
                            name="cities"
                            value={settings.citiesID?.map(id => id.toString()) || []}
                            onChange={(keys: React.Key | React.Key[] | null) => {
                              const keysArray = Array.isArray(keys) ? keys : (keys ? [keys] : [])
                              const citiesID = keysArray.map(k => parseInt(String(k)))
                              updateSetting('citiesID', citiesID)
                            }}
                            onOpenChange={setIsCitiesOpen}
                            isDisabled={saving || cities.length === 0}
                            placeholder="Select cities to filter"
                            selectionMode="multiple"
                          >
                            <Label>Filter addresses by cities</Label>
                            <Autocomplete.Trigger>
                              <Autocomplete.Value>
                                {({ defaultChildren, isPlaceholder, state }: any) => {
                                  if (isPlaceholder || state.selectedItems.length === 0) {
                                    return defaultChildren
                                  }

                                  const selectedItemsKeys = state.selectedItems.map((item: any) => item.key)

                                  return (
                                    <TagGroup
                                      size="sm"
                                      onRemove={(keys: Set<React.Key>) => {
                                        const newSelection = settings.citiesID?.filter(id => !keys.has(id.toString())) || []
                                        updateSetting('citiesID', newSelection)
                                      }}
                                    >
                                      <TagGroup.List>
                                        {selectedItemsKeys.map((selectedItemKey: React.Key) => {
                                          const city = cities.find(c => c.id.toString() === selectedItemKey)
                                          if (!city) return null

                                          return (
                                            <Tag key={city.id.toString()} id={city.id.toString()}>
                                              {city.city}
                                            </Tag>
                                          )
                                        })}
                                      </TagGroup.List>
                                    </TagGroup>
                                  )
                                }}
                              </Autocomplete.Value>
                              <Autocomplete.ClearButton />
                              <Autocomplete.Indicator />
                            </Autocomplete.Trigger>
                            <Autocomplete.Popover>
                              <Autocomplete.Filter filter={contains}>
                                <SearchField autoFocus name="search">
                                  <SearchField.Group>
                                    <SearchField.SearchIcon />
                                    <SearchField.Input placeholder="Search city..." />
                                  </SearchField.Group>
                                </SearchField>
                                <ListBox
                                  className="max-h-60 overflow-y-auto"
                                  renderEmptyState={() => <EmptyState>No cities found</EmptyState>}
                                >
                                  {cities.map(city => (
                                    <ListBox.Item key={city.id.toString()} id={city.id.toString()} textValue={city.city}>
                                      {city.city}
                                      <ListBox.ItemIndicator />
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Autocomplete.Filter>
                            </Autocomplete.Popover>
                          </Autocomplete>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No cities added yet
                      </p>
                    )}

                    {/* Add City Form */}
                    {settings?.country ? (
                      <div className="space-y-2 mt-3">
                        <Label className="text-sm font-medium text-gray-900 dark:text-white">
                          Add City
                        </Label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <CityAutocomplete
                              value={newCityName}
                              onChange={setNewCityName}
                              placeholder="Search and add a city..."
                              countryCode={settings.country}
                              aria-label="Search for a city"
                            />
                          </div>
                          <Button
                            variant="primary"
                            size="md"
                            onPress={handleAddCity}
                            isDisabled={addingCity || !newCityName.trim()}
                          >
                            {addingCity ? 'Adding...' : 'Add'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Please select a country first to add cities
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Manage cities for address filtering
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Push Notifications Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Push Notifications
          </h2>
        </div>

        {/* iOS without PWA: show install instructions */}
        {push.needsPWAInstall ? (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Install app to enable notifications
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Push notifications require the app to be installed on your home screen:
            </p>
            <ol className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
              <li className="flex items-center gap-1.5">
                <span>1.</span> Tap <Share className="w-3.5 h-3.5 inline" /> Share in Safari
              </li>
              <li className="flex items-center gap-1.5">
                <span>2.</span> Tap <Plus className="w-3.5 h-3.5 inline" /> Add to Home Screen
              </li>
              <li>3. Open the app from your home screen</li>
            </ol>
          </div>
        ) : (
          <>
            {/* Browser permission status */}
            <PermissionRow
              label="Browser permission"
              permission={push.permission}
              isReady={push.isReady}
              onRequest={push.permission === 'prompt' ? push.subscribe : undefined}
              requestLabel="Enable"
            />

            {/* Server toggle */}
            {settings && (
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Receive notifications
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get notified about appointment changes
                  </p>
                </div>
                <Switch
                  isSelected={settings.pushNotificationsEnabled}
                  isDisabled={saving}
                  onChange={(value: boolean) => updateSetting('pushNotificationsEnabled', value)}
                  size="sm"
                />
              </div>
            )}

            {/* Subscription status */}
            {push.isReady && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {push.isSubscribed
                  ? 'Active push subscription on this device'
                  : push.permission === 'granted'
                    ? 'Reconnecting subscription...'
                    : 'No active subscription'}
              </div>
            )}
          </>
        )}
      </section>

      {/* GPS Location Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">GPS Location</h2>
        </div>

        {/* Browser permission status */}
        <PermissionRow
          label="Browser permission"
          permission={geo.permission}
          isReady={geo.isReady}
          onRequest={geo.requestPermission}
          requestLabel="Allow"
        />

        {policyError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                Server Configuration Error
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Geolocation is blocked by the server&apos;s <code>Permissions-Policy</code> header.
                Please check your Nginx or Next.js configuration.
              </p>
            </div>
          </div>
        )}

        {/* Server toggle */}
        {settings && (
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Location tracking</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Share your location during open appointments
              </p>
            </div>
            <Switch
              isSelected={settings.geolocationEnabled}
              isDisabled={saving}
              onChange={(value: boolean) => updateSetting('geolocationEnabled', value)}
              size="sm"
            />
          </div>
        )}

        {/* Tracking status */}
        {geo.isReady && geo.isTracking && geo.position && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Currently tracking: {geo.position.latitude.toFixed(4)},{' '}
            {geo.position.longitude.toFixed(4)}
          </div>
        )}
      </section>

      {/* PWA App Installation Section */}
      {isInstallable && (
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('PWAInstall.settings')}
              </h2>
            </div>
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('PWAInstall.title')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] sm:max-w-xs">
                {t('PWAInstall.desc')}
              </p>
            </div>
            <button
              onClick={installPWA}
              className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              {t('PWAInstall.button')}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function PermissionRow({
  label,
  permission,
  isReady,
  onRequest,
  requestLabel,
}: {
  label: string
  permission: string
  isReady: boolean
  onRequest?: () => Promise<boolean | void>
  requestLabel: string
}) {
  const [requesting, setRequesting] = useState(false)
  const [showDeniedHelp, setShowDeniedHelp] = useState(false)

  const handleRequest = async () => {
    if (!onRequest) return
    setRequesting(true)
    await onRequest()
    setRequesting(false)
  }

  const handleDeniedClick = async () => {
    if (showDeniedHelp) {
      setShowDeniedHelp(false)
      return
    }

    if (onRequest) {
      setRequesting(true)
      const success = await onRequest()
      setRequesting(false)
      if (!success) setShowDeniedHelp(true)
    } else {
      setShowDeniedHelp(true)
    }
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        <div className="flex items-center gap-2">
          {permission === 'granted' && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
              Allowed
            </span>
          )}
          {permission === 'denied' && (
            <button
              onClick={handleDeniedClick}
              disabled={requesting}
              className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              {requesting ? <Spinner size="sm" /> : <ShieldAlert className="w-3 h-3" />}
              {requesting ? 'Checking...' : 'Blocked'}
            </button>
          )}
          {permission === 'prompt' && onRequest && (
            <button
              onClick={handleRequest}
              disabled={requesting}
              className="text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
            >
              {requesting ? 'Requesting...' : requestLabel}
            </button>
          )}
          {permission === 'unsupported' && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              Not supported
            </span>
          )}
        </div>
      </div>
      {showDeniedHelp && permission === 'denied' && (
        <div className="ml-1 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg text-xs text-gray-600 dark:text-gray-400">
          <p>Permission is blocked by your browser. To re-enable:</p>
          <ol className="mt-1 ml-4 list-decimal space-y-0.5">
            <li>Click the lock/info icon in the address bar</li>
            <li>Find the permission and set to &quot;Allow&quot;</li>
            <li>Refresh the page</li>
          </ol>
        </div>
      )}
    </div>
  )
}

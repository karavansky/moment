'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ComboBox, Input, ListBox, Spinner, EmptyState, Label, Collection } from '@heroui/react'
import { MapPin } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/components/AuthProvider'

interface PhotonFeature {
  properties: {
    name?: string
    street?: string
    housenumber?: string
    postcode?: string
    city?: string
    country?: string
    countrycode?: string
    osm_id: number
    osm_type: string
    osm_key?: string
    osm_value?: string
  }
  geometry: {
    coordinates: [number, number] // [lng, lat]
  }
}

interface PhotonResponse {
  features: PhotonFeature[]
}

export interface AddressFields {
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country: string
  latitude: number
  longitude: number
}

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string, lat?: number, lng?: number) => void
  onAddressSelect?: (fields: AddressFields) => void
  placeholder?: string
  fullWidth?: boolean
  'aria-label'?: string
  isDisabled?: boolean
}

interface AddressItem {
  id: string
  address: string
  city?: string
  feature: PhotonFeature
}

function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Введите адрес...',
  fullWidth,
  'aria-label': ariaLabel,
  isDisabled = false,
}: AddressAutocompleteProps) {
  const { session } = useAuth()
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)

  // Debounce input для уменьшения количества запросов
  const debouncedInput = useDebounce(inputValue, 300)

  // Scroll input into view when focused (important for mobile when keyboard opens)
  const handleFocus = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }, 300) // Delay to allow keyboard animation to complete
  }, [])

  // Fetch suggestions from Photon API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)

    try {
      // Get user's language preference from session (Photon supports: de, en, fr)
      const userLang = session?.user?.lang || 'en'
      // Map user language to Photon-supported languages
      const photonLang = ['de', 'en', 'fr'].includes(userLang) ? userLang : 'en'

      const params = new URLSearchParams({
        q: query,
        limit: '10',
        lang: photonLang,
      })

      // Add country filter if available
      if (session?.user?.country) {
        params.append('country', session.user.country.toUpperCase())
      }

      const response = await fetch(`/api/photon?${params}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Photon API error:', response.status, errorData)
        throw new Error('Failed to fetch suggestions')
      }

      const data: PhotonResponse = await response.json()
      setSuggestions(data.features || [])
    } catch (error) {
      console.error('Address autocomplete error:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.lang, session?.user?.country])

  // Trigger fetch when debounced input changes
  useEffect(() => {
    if (debouncedInput) {
      fetchSuggestions(debouncedInput)
    } else {
      setSuggestions([])
    }
  }, [debouncedInput, fetchSuggestions])

  // Format address from Photon feature
  const formatAddress = (feature: PhotonFeature): string => {
    const p = feature.properties

    // For places (cities/towns), use name instead of street
    // For addresses (streets/buildings), use street + housenumber
    const addressPart = p.street
      ? [p.street, p.housenumber].filter(Boolean).join(' ')
      : p.name

    const parts = [
      addressPart,
      p.postcode,
      p.city,
      p.country,
    ].filter(Boolean)

    return parts.join(', ')
  }

  // Handle selection
  const handleSelect = (key: React.Key | null) => {
    if (!key) return

    const selectedId = String(key)
    const feature = suggestions.find(
      (f) => String(f.properties.osm_id) === selectedId
    )

    if (feature) {
      const address = formatAddress(feature)
      const [lng, lat] = feature.geometry.coordinates
      const p = feature.properties

      setInputValue(address)
      onChange(address, lat, lng)
      onAddressSelect?.({
        street: p.street || p.name || '',
        houseNumber: p.housenumber || '',
        postalCode: p.postcode || '',
        city: p.city || '',
        country: p.countrycode?.toUpperCase() || '',
        latitude: lat,
        longitude: lng,
      })
    }
  }

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue) // Update parent with text-only value
  }

  // Prepare items for ComboBox
  const items: AddressItem[] = suggestions.map((feature) => ({
    id: String(feature.properties.osm_id),
    address: formatAddress(feature),
    city: feature.properties.city,
    feature,
  }))

  return (
    <ComboBox
      allowsCustomValue
      allowsEmptyCollection
      fullWidth={fullWidth}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onSelectionChange={handleSelect}
      menuTrigger="focus"
      items={items}
      isDisabled={isDisabled}
    >
      <Label className="sr-only">{ariaLabel || placeholder}</Label>
      <div ref={inputRef}>
        <ComboBox.InputGroup>
          <Input
            placeholder={placeholder}
            fullWidth={fullWidth}
            onFocus={handleFocus}
          />
        </ComboBox.InputGroup>
      </div>
      <ComboBox.Popover>
        <ListBox
          renderEmptyState={() => (
            <EmptyState>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Spinner size="sm" />
                  <span className="text-sm text-default-400">Поиск адресов...</span>
                </div>
              ) : inputValue.length < 3 ? (
                <div className="py-4 text-center text-sm text-default-400">
                  Введите минимум 3 символа для поиска
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-default-400">
                  Адреса не найдены
                </div>
              )}
            </EmptyState>
          )}
        >
          {(item: AddressItem) => (
            <ListBox.Item key={item.id} id={item.id} textValue={item.address}>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-default-400 shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm truncate">{item.address}</span>
                  {item.city && (
                    <span className="text-xs text-default-400 truncate">
                      {item.city}
                    </span>
                  )}
                </div>
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  )
}

export default AddressAutocomplete

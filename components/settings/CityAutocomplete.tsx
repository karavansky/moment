'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ComboBox, Input, ListBox, Spinner, EmptyState, Label } from '@heroui/react'
import { MapPin } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface PhotonFeature {
  properties: {
    name?: string
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

interface CityAutocompleteProps {
  value: string
  onChange: (cityName: string) => void
  placeholder?: string
  countryCode: string  // Required! Must have country selected first
  'aria-label'?: string
}

interface CityItem {
  id: string
  name: string
  country: string
  feature: PhotonFeature
}

function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a city...',
  countryCode,
  'aria-label': ariaLabel,
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)

  // Debounce input для уменьшения количества запросов
  const debouncedInput = useDebounce(inputValue, 300)

  // Fetch suggestions from Photon API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      return
    }

    // Country is required for accurate results
    if (!countryCode) {
      console.warn('⚠️ CityAutocomplete: countryCode is required but not provided')
      setSuggestions([])
      return
    }

    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        q: query,
        limit: '10',
        osm_tag: 'place', // Only search for places (cities, towns, villages)
        country: countryCode.toUpperCase(), // REQUIRED: filter by country
      })

      console.log('🔍 Fetching city suggestions for:', query, 'country:', countryCode.toUpperCase())
      const response = await fetch(`/api/photon?${params}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Photon API error:', response.status, errorData)
        throw new Error('Failed to fetch suggestions')
      }

      const data: PhotonResponse = await response.json()

      // Filter to only include cities, towns, villages
      const cityFeatures = data.features?.filter(f => {
        const props = f.properties
        return props.osm_key === 'place' &&
               ['city', 'town', 'village', 'municipality'].includes(props.osm_value || '')
      }) || []

      console.log('✅ Received city suggestions:', cityFeatures.length, cityFeatures)
      setSuggestions(cityFeatures)
    } catch (error) {
      console.error('City autocomplete error:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [countryCode])

  // Trigger fetch when debounced input changes
  useEffect(() => {
    if (debouncedInput) {
      fetchSuggestions(debouncedInput)
    } else {
      setSuggestions([])
    }
  }, [debouncedInput, fetchSuggestions])

  // Format city name from Photon feature
  const formatCityName = (feature: PhotonFeature): string => {
    return feature.properties.name || feature.properties.city || ''
  }

  // Handle selection
  const handleSelect = (key: React.Key | null) => {
    if (!key) return

    const selectedId = String(key)
    const feature = suggestions.find(
      (f) => String(f.properties.osm_id) === selectedId
    )

    if (feature) {
      const cityName = formatCityName(feature)
      setInputValue(cityName)
      onChange(cityName)
    }
  }

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue) // Update parent with text-only value
  }

  // Prepare items for ComboBox
  const items: CityItem[] = suggestions.map((feature) => ({
    id: String(feature.properties.osm_id),
    name: formatCityName(feature),
    country: feature.properties.country || '',
    feature,
  }))

  return (
    <ComboBox
      allowsCustomValue
      allowsEmptyCollection
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onSelectionChange={handleSelect}
      menuTrigger="focus"
      items={items}
    >
      <Label className="sr-only">{ariaLabel || placeholder}</Label>
      <div ref={inputRef}>
        <ComboBox.InputGroup>
          <Input
            placeholder={placeholder}
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
                  <span className="text-sm text-default-400">Searching cities...</span>
                </div>
              ) : inputValue.length < 2 ? (
                <div className="py-4 text-center text-sm text-default-400">
                  Enter at least 2 characters to search
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-default-400">
                  No cities found
                </div>
              )}
            </EmptyState>
          )}
        >
          {(item: CityItem) => (
            <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-default-400 shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm truncate">{item.name}</span>
                  {item.country && (
                    <span className="text-xs text-default-400 truncate">
                      {item.country}
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

export default CityAutocomplete

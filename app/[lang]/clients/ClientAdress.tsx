'use client'

import { Button, Card, ComboBox, Form, Input, Label, ListBox, TextField } from '@heroui/react'
import { Client } from '@/types/scheduling'
import { useDeferredValue, useEffect, useState } from 'react'
import { CountriesHelper } from '@/lib/countries'
import dynamic from 'next/dynamic'

// Динамический импорт карты для избежания SSR проблем
const AddressMap = dynamic(() => import('./AddressMap'), { ssr: false })

interface ClientAdressProps {
  client: Client
  className?: string
}

export function ClientAdress({ client, className }: ClientAdressProps) {
  const [addressData, setAddressData] = useState({
    street: client.street || '',
    city: client.city || '',
    zipCode: client.postalCode || '',
    houseNumber: client.houseNumber || '',
    country: client.country || '',
    district: client.district || '',
  })
  // country хранит название страны (Germany, USA, etc.), а countryCode - код (de, us, etc.)
  const [country, setCountry] = useState(client.country || '')
  const [cityQuery, setCityQuery] = useState(client.city || '')
  const [streetQuery, setStreetQuery] = useState(client.street || '')

  // Состояние для координат адреса
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  // Получаем код страны из названия или напрямую из кода
  // Если пользователь ввёл код (de, DE), конвертируем в название
  // Если ввёл название (Germany), получаем код
  const normalizedCountry = CountriesHelper.getNameByCode(country.toLowerCase()) || country
  const countryCode = CountriesHelper.getCodeByName(normalizedCountry) || country.toLowerCase()

  // Отложенные значения для API
  const deferredCity = useDeferredValue(cityQuery)
  const deferredStreet = useDeferredValue(streetQuery)

  const [cities, setCities] = useState<any[]>([])
  const [streets, setStreets] = useState<Array<{ id: number; street: string; district: string }>>([])

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Собираем все данные адреса
    const addressToSave = {
      country,
      city: addressData.city,
      postalCode: addressData.zipCode,
      street: addressData.street,
      houseNumber: addressData.houseNumber,
      district: addressData.district,
    }

    console.log('Address to save:', addressToSave)

    // TODO: Отправить данные на сервер
    // await updateClientAddress(client.id, addressToSave)

    alert(`Address saved successfully!\n\n${JSON.stringify(addressToSave, null, 2)}`)
  }
  // 1. Поиск города (зависит от страны)
  useEffect(() => {
    console.log('Fetching cities for query:', deferredCity, 'country:', country, 'code:', countryCode)
    if (deferredCity.length < 1 || !country) {
      setCities([])
      return
    }

    const fetchCities = async () => {
      try {
        // Добавляем страну в запрос для улучшения релевантности результатов
        const searchQuery = `${deferredCity} ${normalizedCountry}`
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&osm_tag=place&lang=de&limit=20`
        )
        const data = await res.json()
        console.log('Cities API response:', data)

        // Проверяем наличие features в ответе
        if (!data.features || !Array.isArray(data.features)) {
          console.warn('No features in API response')
          setCities([])
          return
        }

        // Фильтруем по коду страны и типу места (city, town, village)
        const filtered = data.features.filter((f: any) => {
          const props = f.properties

          // Отладка: смотрим первый элемент
          if (data.features.indexOf(f) === 0) {
            console.log('Sample city properties:', {
              name: props.name,
              countrycode: props.countrycode,
              osm_key: props.osm_key,
              osm_value: props.osm_value,
              type: props.type
            })
            console.log('Comparing:', {
              apiCountrycode: props.countrycode?.toLowerCase(),
              expectedCode: countryCode.toLowerCase(),
              matches: props.countrycode?.toLowerCase() === countryCode.toLowerCase()
            })
          }

          const matchesCountry = props.countrycode?.toLowerCase() === countryCode.toLowerCase()
          const isPlace = props.osm_key === 'place' &&
                         ['city', 'town', 'village', 'municipality'].includes(props.osm_value)
          return matchesCountry && isPlace
        })
        console.log('Filtered cities:', filtered.length, 'results for country:', country)
        console.log('Looking for countrycode:', countryCode)
        setCities(filtered)
      } catch (error) {
        console.error('Error fetching cities:', error)
        setCities([])
      }
    }
    fetchCities()
  }, [deferredCity, country])

  // 2. Поиск улицы (зависит от страны и города)
  useEffect(() => {
    console.log('Fetching streets for query:', deferredStreet, 'city:', cityQuery)
    if (deferredStreet.length < 2 || !cityQuery || !country) {
      setStreets([])
      return
    }

    const fetchStreets = async () => {
      try {
        // Ищем улицу в контексте города и страны
        const searchQuery = `${deferredStreet} ${cityQuery} ${normalizedCountry}`
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&osm_tag=highway&lang=de&limit=50`
        )
        const data = await res.json()
        console.log('Streets API response:', data)

        // Проверяем наличие features в ответе
        if (!data.features || !Array.isArray(data.features)) {
          console.warn('No features in API response for streets')
          setStreets([])
          return
        }

        // Фильтруем по коду страны и городу
        const filtered = data.features.filter((f: any) => {
          const props = f.properties

          const matchesCountry = props.countrycode?.toLowerCase() === countryCode.toLowerCase()
          // Проверяем что улица относится к выбранному городу (точное совпадение city)
          const matchesCity = props.city?.toLowerCase() === cityQuery.toLowerCase()
          const isStreet = props.osm_key === 'highway' || props.street

          return matchesCountry && matchesCity && isStreet
        })
        console.log('Filtered streets:', filtered.length, 'results for city:', cityQuery, filtered)

        // Преобразуем в массив объектов {id, street, district}
        const streetObjects = filtered
          .map((f: any, index: number) => {
            const name = f.properties.name || f.properties.street
            const district = f.properties.district || ''
            return name ? { id: index, street: name, district } : null
          })
          .filter(Boolean) as Array<{ id: number; street: string; district: string }>

        // Убираем дубликаты по комбинации street + district
        const uniqueStreetsMap = new Map<string, { id: number; street: string; district: string }>()
        streetObjects.forEach(obj => {
          const key = `${obj.street}|${obj.district}`
          if (!uniqueStreetsMap.has(key)) {
            uniqueStreetsMap.set(key, obj)
          }
        })
        const uniqueStreets = Array.from(uniqueStreetsMap.values())

        // Сортируем: улицы, начинающиеся с введенного текста - в начало
        const searchLower = deferredStreet.toLowerCase()
        uniqueStreets.sort((a, b) => {
          const aStartsWith = a.street.toLowerCase().startsWith(searchLower)
          const bStartsWith = b.street.toLowerCase().startsWith(searchLower)

          if (aStartsWith && !bStartsWith) return -1
          if (!aStartsWith && bStartsWith) return 1
          return a.street.localeCompare(b.street)
        })

        console.log('Sorted unique streets:', uniqueStreets)
        setStreets(uniqueStreets)
      } catch (error) {
        console.error('Error fetching streets:', error)
        setStreets([])
      }
    }
    fetchStreets()
  }, [deferredStreet, country, cityQuery])

  const handleCitySelection = (key: React.Key | null) => {
    const selected = cities.find(c => c.properties.osm_id === key)
    if (selected) {
      const p = selected.properties
      setAddressData(prev => ({
        ...prev,
        city: p.name || '',
        zipCode: p.postcode || '',
      }))
      setCityQuery(p.name || '')
    }
  }

  const handleStreetSelection = (key: React.Key | null) => {
    console.log('Selected street key:', key)
    const selected = streets.find(s => s.id === Number(key))
    if (selected) {
      console.log('Selected street:', selected)

      setAddressData(prev => ({
        ...prev,
        street: selected.street,
        district: selected.district || prev.district, // Обновляем district только если он найден
      }))

      // В поле отображаем улицу с district для удобства
      const displayName = selected.district ? `${selected.street} (${selected.district})` : selected.street
      setStreetQuery(displayName)
    }
  }

  // Функция для получения почтового индекса по полному адресу
  const fetchPostalCode = async (street: string, houseNumber: string, city: string, country: string) => {
    if (!street || !city || !country) return

    try {
      const fullAddress = houseNumber
        ? `${street} ${houseNumber}, ${city}, ${country}`
        : `${street}, ${city}, ${country}`

      console.log('Fetching postal code for:', fullAddress)

      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(fullAddress)}&limit=1`
      )
      const data = await res.json()

      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const postcode = feature.properties.postcode

        if (postcode) {
          console.log('Found postal code:', postcode)
          setAddressData(prev => ({ ...prev, zipCode: postcode }))

          // Получаем координаты из геометрии
          if (feature.geometry && feature.geometry.coordinates) {
            const [lng, lat] = feature.geometry.coordinates
            setAddressCoordinates({ lat, lng })
            console.log('Found coordinates:', { lat, lng })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching postal code:', error)
    }
  }

  // Автоматически получаем почтовый индекс когда заполнены все необходимые поля
  useEffect(() => {
    if (addressData.street && addressData.city && country && addressData.houseNumber) {
      const timer = setTimeout(() => {
        fetchPostalCode(addressData.street, addressData.houseNumber, addressData.city, country)
      }, 500) // Debounce 500ms

      return () => clearTimeout(timer)
    }
  }, [addressData.street, addressData.houseNumber, addressData.city, country])
  return (
    <Card className="w-full max-w-md border border-gray-200 dark:border-gray-700">
      <Card.Header>
        <Card.Title className='capitalize'>Address</Card.Title>
        <Card.Description>wo Dienstleistungen erbracht werden</Card.Description>
      </Card.Header>
      <Form onSubmit={onSubmit} autoComplete="off">
        <Card.Content>
          <div className="flex flex-col gap-4">
           
            {/* Город */}
            <ComboBox
              className="w-full"
              inputValue={cityQuery}
              onInputChange={setCityQuery}
              onSelectionChange={handleCitySelection}
              items={cities}
              isDisabled={!country}
            >
              <Label>City / Stadt {cityQuery && `(${cities.length} results)`}</Label>
              <ComboBox.InputGroup>
                <Input placeholder={country ? "Type city name..." : "Select country first"} autoComplete="new-password" />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  {cities.length > 0 ? (
                    cities.map(item => (
                      <ListBox.Item key={item.properties.osm_id} textValue={item.properties.name}>
                        {item.properties.name}{' '}
                        {item.properties.postcode && `(${item.properties.postcode})`}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))
                  ) : (
                    <ListBox.Item key="empty" textValue="No results">
                      {cityQuery.length < 2 ? 'Type at least 2 characters...' : 'No cities found'}
                    </ListBox.Item>
                  )}
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>

            {/* Улица */}
            <ComboBox
              className="w-full"
              inputValue={addressData.street}
              onInputChange={setStreetQuery}
              onSelectionChange={handleStreetSelection}
              isDisabled={!cityQuery}
              
            >
              <Label>Street / Straße {streetQuery && `(${streets.length} results)`}</Label>
              <ComboBox.InputGroup>
                <Input placeholder={cityQuery ? "Type street name..." : "Select city first"} autoComplete="new-password" />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  {streets.length > 0 ? (
                    streets.map(streetObj => {
                      const displayName = streetObj.district
                        ? `${streetObj.street} (${streetObj.district})`
                        : streetObj.street
                      return (
                        <ListBox.Item key={streetObj.id} id={streetObj.id.toString()} textValue={displayName}>
                          {displayName}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )
                    })
                  ) : (
                    <ListBox.Item key="empty" textValue="No results">
                      {streetQuery.length < 3 ? 'Type at least 3 characters...' : 'No streets found'}
                    </ListBox.Item>
                  )}
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>
            <div className="flex items-center flex-row gap-2 w-full">

            {/* Номер дома */}
            <TextField name="houseNumber" className="w-full min-w-0" type="text">
              <Label>House Number / Hausnummer</Label>
              <Input
                placeholder="e.g. 12A"
                value={addressData.houseNumber}
                onChange={(e) => setAddressData(prev => ({ ...prev, houseNumber: e.target.value }))}
              />
            </TextField>

            {/* Почтовый индекс */}
            <TextField name="zipCode" className="w-full min-w-0" type="text">
              <Label>Postal Code / PLZ</Label>
              <Input
                placeholder="12345"
                value={addressData.zipCode}
                onChange={(e) => setAddressData(prev => ({ ...prev, zipCode: e.target.value }))}
              />
            </TextField>
                  </div>
            {/* Район/округ */}
            <TextField name="district" type="text">
              <Label>District / Bezirk (optional)</Label>
              <Input
                placeholder="e.g. Bad Godesberg"
                value={addressData.district}
                onChange={(e) => setAddressData(prev => ({ ...prev, district: e.target.value }))}
                autoComplete="off"
              />
            </TextField>


             {/* Страна */}
            <ComboBox
              className="w-full"
              inputValue={CountriesHelper.getNameByCode(country.toLowerCase()) || country}
              onInputChange={setCountry}
              onSelectionChange={(key) => {
                if (key) {
                  const countryName = CountriesHelper.getNameByCode(key.toString()) || key.toString()
                  setCountry(countryName)
                }
              }}
            >
              <Label>Country / Land</Label>
              <ComboBox.InputGroup>
                <Input placeholder="Select country..." autoComplete="new-password" />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  {CountriesHelper.getAllCountries().map(({ code, data }) => {
                    const FlagIcon = data.flag
                    return (
                      <ListBox.Item key={code} id={code} textValue={data.name}>
                        <div className="flex items-center gap-2">
                          <FlagIcon className="w-5 h-3" />
                          <span>{data.name}</span>
                        </div>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )
                  })}
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>

            {/* Карта адреса */}
            {addressCoordinates && addressData.zipCode && (
              <div className="w-full">
                <Label className="mb-2 block">Address Location / Standort</Label>
                <AddressMap
                  coordinates={addressCoordinates}
                  address={`${addressData.street} ${addressData.houseNumber}, ${addressData.zipCode} ${addressData.city}, ${country}`}
                />
              </div>
            )}

          </div>
        </Card.Content>
        <Card.Footer className="mt-4 flex flex-col gap-2">
          <Button className="w-full" type="submit" variant="primary">
            Save Address
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  )
}

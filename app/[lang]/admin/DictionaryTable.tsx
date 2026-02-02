'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from '@heroui/table'
import { Pagination } from '@heroui/pagination'
import {
  Input,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TextArea,
  Label,
  TextField,
} from '@heroui/react'
import { SimpleTooltip as Tooltip } from '@/components/SimpleTooltip'
import {
  Search,
  Edit,
  Save,
  Trash2,
  Plus,
  MoreVertical,
  Check,
  X,
  Download,
  Upload,
} from 'lucide-react'
import { useDisclosure } from '@/lib/useDisclosure'
// Типы для данных
interface JsonDictionary {
  [key: string]: any
}

interface DictionaryData {
  [languageCode: string]: JsonDictionary
}

interface FlatKeyValue {
  key: string
  path: string[]
  values: { [lang: string]: string }
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
}

interface DictionaryTableProps {
  dictionaries: DictionaryData
  onSave?: (updatedDictionaries: DictionaryData) => void
  onAddKey?: (keyPath: string[], values: { [lang: string]: string }) => void
  onDeleteKey?: (keyPath: string[]) => void
  maxPreviewLength?: number
}

const DictionaryTable: React.FC<DictionaryTableProps> = ({
  dictionaries,
  onSave,
  onAddKey,
  onDeleteKey,
  maxPreviewLength = 40,
}) => {
  // Состояния
  const [data, setData] = useState<DictionaryData>(dictionaries)
  const [flatData, setFlatData] = useState<FlatKeyValue[]>([])
  const [filteredData, setFilteredData] = useState<FlatKeyValue[]>([])
  const [editingCell, setEditingCell] = useState<{ key: string; lang: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const rowsPerPage = 10

  // Модальное окно для добавления/редактирования
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [newKeyPath, setNewKeyPath] = useState<string[]>([])
  const [newKeyInput, setNewKeyInput] = useState('')
  const [newValues, setNewValues] = useState<{ [lang: string]: string }>({})
  const [editingItem, setEditingItem] = useState<FlatKeyValue | null>(null)

  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()
  // Синхронизация данных с пропсами
  useEffect(() => {
    setData(dictionaries)
  }, [dictionaries])

  // Вызываем onSave после обновления data (но не при первоначальной загрузке)
  const isFirstRender = React.useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Проверяем, что data отличается от dictionaries (т.е. было локальное изменение)
    if (data !== dictionaries && onSave) {
      onSave(data)
    }
  }, [data, dictionaries, onSave])

  // Получаем список языков (мемоизируем для избежания бесконечных ререндеров)
  const languages = React.useMemo(() => Object.keys(data), [data])
  const defaultLanguage = languages[0] || 'en'

  // Функция для преобразования вложенного объекта в плоский массив
  const flattenObject = (
    obj: JsonDictionary,
    prefix: string[] = [],
    lang: string,
    existingData: FlatKeyValue[] = []
  ): FlatKeyValue[] => {
    let result: FlatKeyValue[] = [...existingData]

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = [...prefix, key]
        const value = obj[key]
        const fullKey = currentPath.join('.')
        const type = Array.isArray(value) ? 'array' : (typeof value as any)

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Рекурсивно обрабатываем вложенные объекты
          result = flattenObject(value, currentPath, lang, result)
        } else {
          // Находим существующую запись или создаем новую
          const existingIndex = result.findIndex(item => item.key === fullKey)

          if (existingIndex >= 0) {
            result[existingIndex].values[lang] = String(value)
            result[existingIndex].type = type
          } else {
            result.push({
              key: fullKey,
              path: currentPath,
              values: { [lang]: String(value) },
              type,
            })
          }
        }
      }
    }

    return result
  }

  // Инициализация и обновление данных
  useEffect(() => {
    let allFlatData: FlatKeyValue[] = []

    // Обрабатываем каждый словарь
    languages.forEach(lang => {
      allFlatData = flattenObject(data[lang], [], lang, allFlatData)
    })

    // Заполняем отсутствующие значения пустыми строками
    allFlatData.forEach(item => {
      languages.forEach(lang => {
        if (!item.values[lang]) {
          item.values[lang] = ''
        }
      })
    })

    // Сортируем по ключу
    allFlatData.sort((a, b) => a.key.localeCompare(b.key))

    setFlatData(allFlatData)
    setFilteredData(allFlatData)
  }, [data, languages])

  // Инициализация newValues при изменении languages
  useEffect(() => {
    const initialValues: { [lang: string]: string } = {}
    languages.forEach(lang => {
      initialValues[lang] = ''
    })
    setNewValues(initialValues)
  }, [languages])

  // Фильтрация данных (только по ключу)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(flatData)
      setPage(1)
      return
    }

    const filtered = flatData.filter(item => {
      const keyMatch = item.key.toLowerCase().includes(searchTerm.toLowerCase())

      const valueMatch = languages.some(lang =>
        item.values[lang]?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      return keyMatch || valueMatch

      //      return keyMatch;
    })

    setFilteredData(filtered)
    setPage(1)
  }, [searchTerm, flatData])

  // Функция для обновления значения
  const updateValue = (keyPath: string[], lang: string, value: string) => {
    setData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData))

      // Находим и обновляем вложенное свойство
      let current = newData[lang]
      for (let i = 0; i < keyPath.length - 1; i++) {
        if (!current[keyPath[i]]) {
          current[keyPath[i]] = {}
        }
        current = current[keyPath[i]]
      }

      // Преобразуем значение в правильный тип
      let typedValue: any = value
      const item = flatData.find(d => d.key === keyPath.join('.'))

      if (item) {
        switch (item.type) {
          case 'number':
            typedValue = Number(value)
            if (isNaN(typedValue)) typedValue = 0
            break
          case 'boolean':
            typedValue = value.toLowerCase() === 'true'
            break
          case 'array':
            try {
              typedValue = JSON.parse(value)
              if (!Array.isArray(typedValue)) typedValue = [value]
            } catch {
              typedValue = [value]
            }
            break
          case 'object':
            try {
              typedValue = JSON.parse(value)
            } catch {
              typedValue = { value }
            }
            break
          default:
            typedValue = value
        }
      }

      current[keyPath[keyPath.length - 1]] = typedValue

      return newData
    })
  }

  // Начало редактирования ячейки
  const startEditing = (key: string, lang: string, currentValue: string) => {
    setEditingCell({ key, lang })
    setEditValue(currentValue)
  }

  // Сохранение редактирования
  const saveEditing = () => {
    if (editingCell) {
      const keyPath = editingCell.key.split('.')
      updateValue(keyPath, editingCell.lang, editValue)
      setEditingCell(null)
      setEditValue('')
    }
  }

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // Добавление нового ключа
  const handleAddKey = () => {
    setModalMode('add')
    setNewKeyPath([])
    setNewKeyInput('')
    const initialValues: { [lang: string]: string } = {}
    languages.forEach(lang => {
      initialValues[lang] = ''
    })
    setNewValues(initialValues)
    onOpen()
  }

  // Редактирование существующего ключа
  const handleEditKey = (item: FlatKeyValue) => {
    setModalMode('edit')
    setEditingItem(item)
    setNewKeyPath(item.path)
    setNewKeyInput(item.key)
    setNewValues(item.values)
    onOpen()
  }

  // Удаление ключа
  const handleDeleteKey = (keyPath: string[]) => {
    if (window.confirm(`Удалить ключ "${keyPath.join('.')}"?`)) {
      setData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData))

        languages.forEach(lang => {
          let current = newData[lang]
          for (let i = 0; i < keyPath.length - 1; i++) {
            current = current[keyPath[i]]
            if (!current) break
          }
          if (current && current[keyPath[keyPath.length - 1]]) {
            delete current[keyPath[keyPath.length - 1]]
          }
        })

        if (onDeleteKey) {
          onDeleteKey(keyPath)
        }

        return newData
      })
    }
  }

  // Сохранение из модального окна
  const saveFromModal = () => {
    if (!newKeyInput.trim()) return

    const keyPath = newKeyInput.split('.')

    if (modalMode === 'add') {
      // Добавляем ключ во все словари
      setData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData))

        languages.forEach(lang => {
          let current = newData[lang]
          for (let i = 0; i < keyPath.length - 1; i++) {
            if (!current[keyPath[i]]) {
              current[keyPath[i]] = {}
            }
            current = current[keyPath[i]]
          }
          current[keyPath[keyPath.length - 1]] = newValues[lang] || ''
        })

        if (onAddKey) {
          onAddKey(keyPath, newValues)
        }

        return newData
      })
    } else if (modalMode === 'edit' && editingItem) {
      // Обновляем значения для всех языков
      languages.forEach(lang => {
        updateValue(editingItem.path, lang, newValues[lang] || '')
      })
    }

    onOpenChange()
  }

  // Скачивание JSON файла для конкретного языка
  const downloadJson = (lang: string) => {
    const jsonData = data[lang]
    const jsonString = JSON.stringify(jsonData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${lang}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Загрузка JSON файла для конкретного языка
  const handleFileUpload = (lang: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      try {
        const content = e.target?.result as string
        const jsonData = JSON.parse(content)

        // Используем функциональное обновление для получения актуального состояния
        setData(prevData => {
          const newData = JSON.parse(JSON.stringify(prevData))
          newData[lang] = jsonData
          return newData
        })

        alert(`Словарь ${lang}.json успешно загружен!`)
      } catch (error) {
        alert('Ошибка при загрузке файла. Проверьте формат JSON.')
      }
    }
    reader.readAsText(file)

    // Сброс input для возможности загрузки того же файла снова
    event.target.value = ''
  }

  // Создание ссылки для загрузки файла
  const fileInputRefs = useRef<{ [lang: string]: HTMLInputElement | null }>({})

  // Функция для обрезки текста
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Пагинация
  const pages = Math.ceil(filteredData.length / rowsPerPage)
  const items = React.useMemo(() => {
    const startIdx = (page - 1) * rowsPerPage
    const endIdx = startIdx + rowsPerPage
    return filteredData.slice(startIdx, endIdx)
  }, [filteredData, page, rowsPerPage])

  // Колонки для таблицы
  const columns = React.useMemo(
    () => [
      { key: 'actions', label: 'Действия' },
      { key: 'keyColumn', label: 'Ключ' },
      ...languages.map(lang => ({ key: lang, label: lang.toUpperCase() })),
    ],
    [languages]
  )

  // Определение типа значения для отображения
  const getValueTypeChip = (type: string) => {
    const colors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'accent'> = {
      string: 'accent',
      number: 'success',
      boolean: 'warning',
      array: 'default',
      object: 'default',
    }

    return (
      <Chip size="sm" color={colors[type] || 'default'} variant="soft">
        {type}
      </Chip>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Панель управления */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex-1 max-w-md">
            <Search className="w-4 h-4" />
            <Input
              placeholder="Поиск по ключу или значению..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onPress={handleAddKey}>
            <Plus className="w-4 h-4" />
            Добавить ключ
          </Button>
        </div>

        {/* Управление файлами словарей */}
        <div className="flex flex-wrap gap-2">
          {languages.map(lang => (
            <div
              key={lang}
              className="flex items-center gap-2 p-2 rounded-lg border border-default-200"
            >
              <span className="font-medium text-sm">{lang.toUpperCase()}</span>
              <div className="flex gap-1">
                <Tooltip key={lang} content={`Скачать ${lang}.json`} delay={10}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="tertiary"
                    onPress={() => downloadJson(lang)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </Tooltip>
                {/* Загрузка файла 
                <Tooltip content={`Загрузить ${lang}.json`}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    onPress={() => fileInputRefs.current[lang]?.click()}
                  >
                    <Upload className="w-3 h-3" />
                  </Button>
                </Tooltip>
*/}
                <input
                  type="file"
                  accept=".json"
                  ref={el => {
                    fileInputRefs.current[lang] = el
                  }}
                  onChange={e => handleFileUpload(lang, e)}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Таблица с горизонтальной прокруткой */}
      <div className="overflow-x-auto">
        <Table
          aria-label="Таблица словарей"
          className="min-w-max"
          bottomContent={
            pages > 1 ? (
              <div className="flex w-full justify-center">
                <Pagination
                  isCompact
                  showControls
                  showShadow
                  color="primary"
                  page={page}
                  total={pages}
                  onChange={setPage}
                />
              </div>
            ) : null
          }
        >
          <TableHeader columns={columns}>
            {column => (
              <TableColumn
                key={column.key}
                className={
                  column.key === 'keyColumn'
                    ? 'sticky left-0 bg-default-50 z-10'
                    : column.key === 'actions'
                      ? 'sticky right-0 bg-default-50 z-10'
                      : ''
                }
              >
                {column.label}
              </TableColumn>
            )}
          </TableHeader>

          <TableBody items={items}>
            {item => (
              <TableRow key={item.key}>
                {columnKey => {
                  // Колонка с ключом
                  if (columnKey === 'keyColumn') {
                    return (
                      <TableCell className="sticky left-0 bg-default-50 z-10">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{item.key}</span>
                          <div className="flex gap-2">
                            {getValueTypeChip(item.type)}
                            <Chip size="sm" variant="soft" color="default">
                              {item.path.length} ур.
                            </Chip>
                          </div>
                        </div>
                      </TableCell>
                    )
                  }

                  // Колонка с действиями
                  if (columnKey === 'actions') {
                    return (
                      <TableCell className="sticky right-0 bg-default-50 z-10">
                        <Dropdown>
                          <Button isIconOnly size="sm" variant="tertiary">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                          <Dropdown.Popover>
                            <Dropdown.Menu aria-label="Действия">
                              <Dropdown.Item key="edit" onPress={() => handleEditKey(item)}>
                                <Edit className="w-4 h-4" />
                                Редактировать все языки
                              </Dropdown.Item>
                              <Dropdown.Item
                                key="delete"
                                onPress={() => handleDeleteKey(item.path)}
                              >
                                <Trash2 className="w-4 h-4" /> Удалить
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown.Popover>
                        </Dropdown>
                      </TableCell>
                    )
                  }

                  // Колонки с языками
                  const lang = columnKey as string
                  const isEditing = editingCell?.key === item.key && editingCell?.lang === lang
                  const value = item.values[lang] || ''
                  const displayValue = truncateText(value, maxPreviewLength)

                  return (
                    <TableCell>
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <TextArea
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            rows={3}
                            className="min-h-10"
                          />
                          <div className="flex gap-1">
                            <Button size="sm" isIconOnly onPress={saveEditing}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger-soft"
                              isIconOnly
                              onPress={cancelEditing}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Tooltip
                          key={item.key + lang}
                          delay={0}
                          content={
                            <div className="max-w-xs">
                              <div className="font-medium mb-1">Полное значение:</div>
                              <div className="whitespace-pre-wrap wrap-break-word">{value || '(пусто)'}</div>
                            </div>
                          }
                        >
                          <div
                            className="p-2 rounded-md hover:bg-default-100 cursor-pointer min-h-10 flex items-center"
                            onClick={() => startEditing(item.key, lang, value)}
                          >
                            {value ? (
                              displayValue
                            ) : (
                              <span className="text-default-400">(пусто)</span>
                            )}
                          </div>
                        </Tooltip>
                      )}
                    </TableCell>
                  )
                }}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Модальное окно для добавления/редактирования */}
      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} variant="blur">
          <Modal.Container size="cover">
            <Modal.Dialog>
              <Modal.Heading>
                {modalMode === 'add' ? 'Добавить новый ключ' : 'Редактировать ключ'}
              </Modal.Heading>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Label>Ключ (через точку для вложенности)</Label>
                  <Input
                    placeholder="например: home.topmoto"
                    value={newKeyInput}
                    onChange={e => setNewKeyInput(e.target.value)}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {languages.map(lang => (
                      <TextField key={lang}
                        name="bio"
                        onChange={value => setNewValues(prev => ({ ...prev, [lang]: value }))}
                      >
                        <Label>{lang.toUpperCase()}</Label>
                        <TextArea
                          placeholder="Tell us about yourself..."
                          value={newValues[lang] || ''}
                          rows={5}
                        />
                      </TextField>
                    ))}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="danger-soft" onPress={onClose}>
                  Отмена
                </Button>
                <Button onPress={saveFromModal}>
                  {modalMode === 'add' ? 'Добавить' : 'Сохранить'}
                </Button>
              </ModalFooter>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Статистика */}
      <div className="flex flex-wrap gap-4 text-sm text-default-500">
        <div>
          Языков: <span className="font-semibold">{languages.length}</span>
        </div>
        <div>
          Всего ключей: <span className="font-semibold">{flatData.length}</span>
        </div>
        <div>
          Отфильтровано: <span className="font-semibold">{filteredData.length}</span>
        </div>
        <div>
          Страница:{' '}
          <span className="font-semibold">
            {page} из {pages}
          </span>
        </div>
        <div>
          Показано: <span className="font-semibold">{items.length} записей</span>
        </div>
      </div>
    </div>
  )
}

export default DictionaryTable

/*
                        <TextArea
                          key={lang}
                          placeholder={`Введите значение для ${lang.toUpperCase()}`}
                          value={newValues[lang] || ''}
                          onChange={e =>
                            setNewValues(prev => ({ ...prev, [lang]: e.target.value }))
                          }
                          rows={8}
                          fullWidth
                        />

*/

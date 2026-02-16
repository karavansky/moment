'use client'
import React, { memo, useMemo, useTransition } from 'react'
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Selection,
  Spinner,
  Checkbox,
  DropdownItemIndicator,
  Input,
  Modal,
  TextField,
  Label,
  ChipProps,
  Chip,
  InputGroup,
} from '@heroui/react'
import { SortDescriptor } from '@heroui/table'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
  VerticalDotsIcon,
} from '@/components/icons'
import scrollIntoView from 'scroll-into-view-if-needed'
import { Client, Groupe } from '@/types/scheduling'
import { QrCode, UserStar, Share2 } from 'lucide-react'
import { useTranslation } from '@/components/Providers'

interface GenericTabelleProps {
  //  list: Record<string, any>[]
  list: Client[]
  titel: string
  isLoading: boolean
  initialVisibleColumns?: string[]
  sortDescriptor?: SortDescriptor
  onRowClick?: (id: string) => void
  onAddNew?: () => void
  isShowColumns?: boolean
  groups: Groupe[]
  className?: string
}

const columnDefs = [
  { uid: 'client', sortable: true },
  { uid: 'status', sortable: true },
  { uid: 'groupe', sortable: true },
  { uid: 'email', sortable: true },
  { uid: 'strasse', sortable: true },
  { uid: 'houseNumber', sortable: true },
  { uid: 'plz', sortable: true },
  { uid: 'ort', sortable: true },
]

const statusDefs = [
  { uid: '0', value: 0, key: 'active' },
  { uid: '1', value: 1, key: 'paused' },
  { uid: '2', value: 2, key: 'archive' },
]

const columnNameKeys: Record<string, string> = {
  client: 'clients.table.columns.client',
  status: 'clients.table.columns.status',
  groupe: 'clients.table.columns.group',
  email: 'clients.table.columns.email',
  strasse: 'clients.table.columns.street',
  houseNumber: 'clients.table.columns.houseNumber',
  plz: 'clients.table.columns.postalCode',
  ort: 'clients.table.columns.city',
}
const statusColorMap: Record<string, ChipProps['color']> = {
  active: 'success',
  paused: 'warning',
  archive: 'danger',
}
const INITIAL_VISIBLE_COLUMNS = ['client', 'status', 'groupe']

const ClientsTable = function ClientsTable(props: GenericTabelleProps) {
  const { isShowColumns = false } = props
  const { t } = useTranslation()
  const [filterValue, setFilterValue] = React.useState('')
  const [isPending, startTransition] = useTransition()

  // Invite QR modal state
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false)
  const [inviteUrl, setInviteUrl] = React.useState('')
  const [isGeneratingInvite, setIsGeneratingInvite] = React.useState(false)

  const inviteModalState = useMemo(
    () => ({
      isOpen: inviteModalOpen,
      setOpen: (open: boolean) => { if (!open) setInviteModalOpen(false) },
      open: () => setInviteModalOpen(true),
      close: () => setInviteModalOpen(false),
      toggle: () => setInviteModalOpen(prev => !prev),
    }),
    [inviteModalOpen]
  )

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 2 }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteUrl(data.url)
        setInviteModalOpen(true)
      } else {
        console.error('[Invite] Error:', data.error)
      }
    } catch (error) {
      console.error('[Invite] Fetch error:', error)
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const handleShareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Invite — Client',
          url: inviteUrl,
        })
      } catch {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(inviteUrl)
    }
  }

  const columns = React.useMemo(
    () => columnDefs.map(col => ({ ...col, name: t(columnNameKeys[col.uid]) })),
    [t]
  )

  const statusOptions = React.useMemo(
    () => statusDefs.map(s => ({ ...s, name: t(`clients.table.status.${s.key}`) })),
    [t]
  )

  const list = React.useMemo(() => {
    return props.list
  }, [props.list])

  const [isMounted, setIsMounted] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<Selection>('all')

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>(
    props.sortDescriptor || {
      column: 'client',
      direction: 'ascending',
    }
  )
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
    new Set(INITIAL_VISIBLE_COLUMNS)
  )
  const [groupFilter, setGroupFilter] = React.useState<Selection>('all')
  const groupItems = React.useMemo(
    () => props.groups.map(group => ({ name: group.groupeName, uid: group.id })),
    [props.groups]
  )
  console.log('groupItems:', groupItems)
  type TypeList = (typeof list)[0]

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === 'all') return columns

    return columns.filter(column => Array.from(visibleColumns).includes(column.uid))
  }, [columns, visibleColumns])

  const hasSearchFilter = Boolean(filterValue)

  const filteredItems = React.useMemo(() => {
    let filteredUsers = [...list]

    if (hasSearchFilter) {
      filteredUsers = filteredUsers.filter(
        user =>
          user.name.toLowerCase().includes(filterValue.toLowerCase()) ||
          user.surname.toLowerCase().includes(filterValue.toLowerCase()) ||
          user.email?.toLowerCase().includes(filterValue.toLowerCase()) ||
          user.street.toLowerCase().includes(filterValue.toLowerCase()) ||
          user.postalCode.toLowerCase().includes(filterValue.toLowerCase()) ||
          user.city.toLowerCase().includes(filterValue.toLowerCase())
      )
    }

    // Фильтрация по статусу - преобразуем uid в числовые значения
    if (statusFilter !== 'all' && Array.from(statusFilter).length !== statusOptions.length) {
      const selectedStatusValues = Array.from(statusFilter)
        .map(uid => statusOptions.find(s => s.uid === uid)?.value)
        .filter((val): val is number => val !== undefined)

      filteredUsers = filteredUsers.filter(user => selectedStatusValues.includes(user.status))
    }

    // Фильтрация по группе
    if (groupFilter !== 'all' && Array.from(groupFilter).length !== groupItems.length) {
      const selectedGroupIds = Array.from(groupFilter)

      filteredUsers = filteredUsers.filter(user => {
        if (user.groupe && typeof user.groupe === 'object' && 'id' in user.groupe) {
          return selectedGroupIds.includes(user.groupe.id)
        }
        return false
      })
    }

    return filteredUsers
  }, [list, filterValue, statusFilter, groupFilter, groupItems, hasSearchFilter])
  /*
  const sorted = React.useMemo(() => {
    if (!list.length) return [] as typeof list
    const column = sortDescriptor.column as keyof TypeList
    return [...list].sort((a: TypeList, b: TypeList) => {
      const first = (a[column] as unknown as string) ?? ''
      const second = (b[column] as unknown as string) ?? ''
      const cmp = first < second ? -1 : first > second ? 1 : 0
      return sortDescriptor.direction === 'descending' ? -cmp : cmp
    })
  }, [sortDescriptor, list])
*/
  const handleSort = (columnUid: string) => {
    startTransition(() => {
      setSortDescriptor(prev => ({
        column: columnUid,
        direction:
          prev.column === columnUid && prev.direction === 'ascending' ? 'descending' : 'ascending',
      }))
    })
  }

  const handleStatusFilterChange = React.useCallback(
    (keys: Selection) => {
      startTransition(() => {
        setStatusFilter(keys)
      })
    },
    [startTransition]
  )

  const handleGroupFilterChange = React.useCallback(
    (keys: Selection) => {
      startTransition(() => {
        setGroupFilter(keys)
      })
    },
    [startTransition]
  )

  const toggleSelection = (id: string) => {
    setSelectedKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleAll = () => {
    if (selectedKeys.size === items.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(items.map(item => String(item.id))))
    }
  }

  const onSearchChange = React.useCallback(
    (value?: string) => {
      console.log('Search value:', value)
      startTransition(() => {
        if (value) {
          setFilterValue(value)
        } else {
          setFilterValue('')
        }
      })
    },
    [startTransition]
  )

  const items = React.useMemo(() => {
    return filteredItems
  }, [filteredItems])

  const isDate = (value: any): value is Date => {
    return value instanceof Date
  }

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a: Client, b: Client) => {
      let first: any
      let second: any

      switch (sortDescriptor.column) {
        case 'client':
          first = `${a.surname} ${a.name}`.toLowerCase()
          second = `${b.surname} ${b.name}`.toLowerCase()
          break
        case 'groupe':
          first = a.groupe?.groupeName || ''
          second = b.groupe?.groupeName || ''
          break
        default:
          first = a[sortDescriptor.column as keyof Client]
          second = b[sortDescriptor.column as keyof Client]
          break
      }
      // Обработка undefined/null значений
      if (first == null) first = ''
      if (second == null) second = ''

      // Приводим к строке для корректного сравнения
      first = String(first).toLowerCase()
      second = String(second).toLowerCase()

      const cmp = first < second ? -1 : first > second ? 1 : 0

      return sortDescriptor.direction === 'descending' ? -cmp : cmp
    })
  }, [sortDescriptor, items])

  const renderCell = React.useCallback((user: Client, columnKey: React.Key) => {
    const cellValue = user[columnKey as keyof Client]
    switch (columnKey) {
      case 'actions':
        return (
          <div className="relative flex justify-end items-center gap-2">
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly size="sm" variant="tertiary">
                  <VerticalDotsIcon className="text-default-300" />
                </Button>
              </DropdownTrigger>
              <Dropdown.Popover>
                <Dropdown.Menu aria-label="Actions menu" onAction={key => alert(key)}>
                  <Dropdown.Item key="view">{t('clients.table.view')} </Dropdown.Item>
                  <Dropdown.Item key="delete">{t('clients.table.delete')}</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        )
      case 'client':
        return (
          <div className="flex flex-col">
            <p className="text-bold text-small ">
              {user.surname} {user.name}
            </p>
          </div>
        )
      case 'status':
        let statusText = cellValue === 0 ? 'active' : cellValue === 1 ? 'paused' : 'archive'
        return (
          <Chip size="md" color={statusColorMap[statusText] || 'default'} className="capitalize">
            {statusText}
          </Chip>
        )
      case 'groupe':
        return (
          <Chip size="md" color="accent" className="capitalize">
            {typeof cellValue === 'object' && cellValue !== null && 'groupeName' in cellValue
              ? cellValue.groupeName
              : t('clients.table.noGroup')}
          </Chip>
        )
      default:
        if (cellValue === null || cellValue === undefined) return null

        if (isDate(cellValue)) {
          return (
            <div className="flex flex-col">
              <p className="text-bold text-small ">{cellValue.toLocaleDateString('de-DE')}</p>
            </div>
          )
        }
        /*
        if (typeof cellValue === 'object') {
          const display = cellValue.categoryName || cellValue.name || JSON.stringify(cellValue)
          return (
            <div className="flex flex-col">
              <p className="text-bold text-small ">{display}</p>
            </div>
          )
        }
*/
        const isNumber = typeof cellValue === 'number'
        const isString = typeof cellValue === 'string'

        let displayValue: string | number = cellValue as string | number

        if (!isNumber && !isString) {
          if (Array.isArray(cellValue)) {
            displayValue = cellValue.length.toString()
          } else if (typeof cellValue === 'object') {
            displayValue =
              (cellValue as any).categoryName ||
              (cellValue as any).name ||
              JSON.stringify(cellValue)
          }
        }

        const formattedValue = isNumber
          ? (cellValue as number).toLocaleString('de-DE')
          : displayValue

        return (
          <div className={`flex flex-col ${isNumber ? 'items-end' : ''}`}>
            <p className="text-bold text-small ">{formattedValue}</p>
          </div>
        )
    }
  }, [t])

  const topColumns = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex gap-3 justify-end items-center">
          <Dropdown>
            <Button variant="tertiary">
              <ChevronDownIcon className="text-small" />
              {t('clients.table.columnsButton')}
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                disallowEmptySelection
                aria-label="Table Columns"
                selectedKeys={visibleColumns}
                selectionMode="multiple"
                onSelectionChange={setVisibleColumns}
                items={columns}
              >
                {(column: any) => (
                  <Dropdown.Item key={column.uid} id={column.uid} className="capitalize">
                    {column.name}
                    <Dropdown.ItemIndicator />
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>
    )
  }, [visibleColumns, columns, setVisibleColumns, t])

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          <TextField
            className="hidden sm:block w-full max-w-80"
            name="filter"
            onChange={onSearchChange}
          >
            <InputGroup>
              <InputGroup.Prefix>
                <SearchIcon className="size-4 text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                className="w-full max-w-80"
                placeholder={t('clients.table.search')}
                value={filterValue}
              />
            </InputGroup>
          </TextField>
          <div className="flex gap-3 w-full sm:w-auto">
            <Dropdown>
              <Button variant="tertiary">
                {t('clients.table.statusFilter')}
                <ChevronDownIcon className="text-small" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  disallowEmptySelection
                  aria-label="Status Filter"
                  selectedKeys={statusFilter}
                  selectionMode="multiple"
                  onSelectionChange={handleStatusFilterChange}
                  items={statusOptions.map(status => ({ name: status.name, uid: status.uid }))}
                >
                  {statusOptions.map(status => (
                    <DropdownItem key={status.uid} id={status.uid} className="capitalize">
                      {status.name}
                      <Dropdown.ItemIndicator />
                    </DropdownItem>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            <Dropdown>
              <Button variant="tertiary">
                {t('clients.table.groupFilter')}
                <ChevronDownIcon className="text-small" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  disallowEmptySelection
                  aria-label="Group Filter"
                  selectedKeys={groupFilter}
                  selectionMode="multiple"
                  onSelectionChange={handleGroupFilterChange}
                  items={groupItems}
                >
                  {groupItems.map(item => (
                    <DropdownItem key={item.uid} id={item.uid} className="capitalize">
                      {item.name}
                      <Dropdown.ItemIndicator />
                    </DropdownItem>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            <Button
              variant="primary"
              className="ml-auto sm:ml-0"
              size="sm"
              isIconOnly
              isDisabled={isGeneratingInvite}
              onPress={handleGenerateInvite}
            >
              {isGeneratingInvite ? <Spinner size="sm" /> : <QrCode />}
            </Button>
            <Button variant="primary" className="ml-auto sm:ml-0" onPress={props.onAddNew}>
              {t('clients.table.addNew')}
              <PlusIcon />
            </Button>
          </div>
        </div>
      </div>
    )
  }, [filterValue, onSearchChange, statusFilter, groupFilter, groupItems, t, statusOptions])

  if (!isMounted) {
    return null
  }

  return (
    <div className={`flex flex-col gap-4 h-full ${props.className || ''} select-none`}>
      <div className="flex items-center pl-4 gap-2 shrink-0">
        <UserStar className="w-6 h-6 sm:w-6 sm:h-6  text-primary" />
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">{t('clients.title')}</h1>
        <TextField
          className="block sm:hidden w-full pl-4 max-w-70"
          name="filter"
          onChange={onSearchChange}
        >
          <InputGroup>
            <InputGroup.Prefix>
              <SearchIcon className="size-4 text-muted" />
            </InputGroup.Prefix>
            <InputGroup.Input
              className="w-full max-w-70"
              placeholder={t('clients.table.search')}
              value={filterValue}
            />
          </InputGroup>
        </TextField>
      </div>
      <div className="shrink-0">{topContent}</div>
      {isShowColumns && <div className="shrink-0">{topColumns}</div>}
      <div className="border-[0.5px] border-gray-300 rounded-2xl overflow-hidden shadow-sm relative flex flex-col flex-1 min-h-0">
        <div
          className={`flex-1 overflow-y-auto transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}
        >
          <table className="w-full text-left border-collapse">
            <thead className="surface surface--tertiary sticky top-0 z-10">
              <tr>
                <th className="h-10 px-4 border-b-[0.5px] border-gray-200 w-10">
                  <Checkbox
                    isSelected={selectedKeys.size === items.length && items.length > 0}
                    isIndeterminate={selectedKeys.size > 0 && selectedKeys.size < items.length}
                    onPress={toggleAll}
                  />
                </th>
                {headerColumns.map(column => (
                  <th
                    key={column.uid}
                    className="h-10 px-4 text-tiny font-normal text-default-500 uppercase border-b-[0.5px] border-gray-200 cursor-pointer hover:text-default-700"
                    onClick={() => column.sortable !== false && handleSort(column.uid)}
                  >
                    <div className="flex items-center gap-1">
                      {column.name}
                      {sortDescriptor.column === column.uid && (
                        <span>{sortDescriptor.direction === 'ascending' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.isLoading ? (
                <tr>
                  <td colSpan={headerColumns.length + 1} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="md" />
                      <span className="text-xs text-muted">{t('clients.table.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={headerColumns.length + 1}
                    className="h-24 text-center text-default-400"
                  >
                    {t('clients.table.noRecords')}
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {sortedItems.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.015,
                        layout: { duration: 0.3 },
                      }}
                      id={`row-${item.id}`}
                      className={`hover:bg-default-50/50 border-b-[0.5px] border-gray-200 last:border-b-0 transition-colors ${
                        props.onRowClick
                          ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                          : ''
                      }`}
                      onClick={() => props.onRowClick?.(String(item.id))}
                    >
                      <td className="py-3 px-4">
                        <Checkbox
                          isSelected={selectedKeys.has(String(item.id))}
                          onPress={() => toggleSelection(String(item.id))}
                        />
                      </td>
                      {headerColumns.map(column => (
                        <td key={column.uid} className="py-3 px-4">
                          {renderCell(item, column.uid)}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite QR Modal */}
      <Modal state={inviteModalState}>
        <Modal.Backdrop isOpen={inviteModalOpen} onOpenChange={() => setInviteModalOpen(false)} variant="blur">
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <h2 className="text-lg font-semibold">
                  {t('clients.inviteClient', 'Invite Client')}
                </h2>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col items-center gap-4 py-4">
                  {inviteUrl && (
                    <div className="p-4 bg-white rounded-xl">
                      <QRCodeSVG value={inviteUrl} size={200} />
                    </div>
                  )}
                  <p className="text-sm text-muted text-center break-all max-w-70">
                    {inviteUrl}
                  </p>
                </div>
              </Modal.Body>
              <Modal.Footer className="flex gap-2">
                <Button variant="tertiary" onPress={() => setInviteModalOpen(false)}>
                  {t('common.close', 'Close')}
                </Button>
                <Button variant="primary" onPress={handleShareInvite}>
                  <Share2 className="w-4 h-4" />
                  {t('common.share', 'Share')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}

export default React.memo(ClientsTable)

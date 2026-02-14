'use client'
import React, { useTransition } from 'react'
import {
  Button,
  Dropdown,
  DropdownItem,
  Selection,
  Spinner,
  Checkbox,
  ChipProps,
  Chip,
  TextField,
  InputGroup,
} from '@heroui/react'
import { SortDescriptor } from '@heroui/table'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon, SearchIcon } from '@/components/icons'
import { Users } from 'lucide-react'

export interface UserRow {
  userID: string
  name: string
  email: string
  emailVerified: boolean
  date: string
  provider: string
  isAdmin: boolean
}

const columns = [
  { name: 'User', uid: 'name', sortable: true },
  { name: 'Email', uid: 'email', sortable: true },
  { name: 'Provider', uid: 'provider', sortable: true },
  { name: 'Verified', uid: 'emailVerified', sortable: true },
  { name: 'Admin', uid: 'isAdmin', sortable: true },
  { name: 'Registered', uid: 'date', sortable: true },
]

const providerOptions = [
  { name: 'Google', uid: 'google' },
  { name: 'Apple', uid: 'apple' },
  { name: 'Credentials', uid: 'credentials' },
]

const verifiedOptions = [
  { name: 'Verified', uid: 'true' },
  { name: 'Not verified', uid: 'false' },
]

const providerColorMap: Record<string, ChipProps['color']> = {
  google: 'accent',
  apple: 'default',
  credentials: 'warning',
}

const INITIAL_VISIBLE_COLUMNS = ['name', 'email', 'provider', 'emailVerified', 'isAdmin', 'date']

interface UsersTableProps {
  list: UserRow[]
  isLoading: boolean
  onRowClick?: (userID: string) => void
  className?: string
}

export default function UsersTable({ list, isLoading, onRowClick, className }: UsersTableProps) {
  const [filterValue, setFilterValue] = React.useState('')
  const [isPending, startTransition] = useTransition()
  const [isMounted, setIsMounted] = React.useState(false)
  const [providerFilter, setProviderFilter] = React.useState<Selection>('all')
  const [verifiedFilter, setVerifiedFilter] = React.useState<Selection>('all')
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: 'date',
    direction: 'descending',
  })
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
    new Set(INITIAL_VISIBLE_COLUMNS)
  )

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === 'all') return columns
    return columns.filter(column => Array.from(visibleColumns).includes(column.uid))
  }, [visibleColumns])

  const filteredItems = React.useMemo(() => {
    let filtered = [...list]

    if (filterValue) {
      const lower = filterValue.toLowerCase()
      filtered = filtered.filter(
        user =>
          user.name.toLowerCase().includes(lower) ||
          user.email.toLowerCase().includes(lower)
      )
    }

    if (providerFilter !== 'all' && Array.from(providerFilter).length !== providerOptions.length) {
      const selected = Array.from(providerFilter)
      filtered = filtered.filter(user => selected.includes(user.provider))
    }

    if (verifiedFilter !== 'all' && Array.from(verifiedFilter).length !== verifiedOptions.length) {
      const selected = Array.from(verifiedFilter)
      filtered = filtered.filter(user => selected.includes(String(user.emailVerified)))
    }

    return filtered
  }, [list, filterValue, providerFilter, verifiedFilter])

  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let first: any
      let second: any

      switch (sortDescriptor.column) {
        case 'date':
          first = new Date(a.date).getTime()
          second = new Date(b.date).getTime()
          break
        case 'emailVerified':
          first = a.emailVerified ? 1 : 0
          second = b.emailVerified ? 1 : 0
          break
        case 'isAdmin':
          first = a.isAdmin ? 1 : 0
          second = b.isAdmin ? 1 : 0
          break
        default:
          first = String(a[sortDescriptor.column as keyof UserRow] ?? '').toLowerCase()
          second = String(b[sortDescriptor.column as keyof UserRow] ?? '').toLowerCase()
          break
      }

      const cmp = first < second ? -1 : first > second ? 1 : 0
      return sortDescriptor.direction === 'descending' ? -cmp : cmp
    })
  }, [sortDescriptor, filteredItems])

  const handleSort = (columnUid: string) => {
    startTransition(() => {
      setSortDescriptor(prev => ({
        column: columnUid,
        direction:
          prev.column === columnUid && prev.direction === 'ascending' ? 'descending' : 'ascending',
      }))
    })
  }

  const onSearchChange = React.useCallback(
    (value?: string) => {
      startTransition(() => {
        setFilterValue(value || '')
      })
    },
    [startTransition]
  )

  const toggleSelection = (id: string) => {
    setSelectedKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const toggleAll = () => {
    if (selectedKeys.size === sortedItems.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(sortedItems.map(item => item.userID)))
    }
  }

  const renderCell = React.useCallback((user: UserRow, columnKey: string) => {
    switch (columnKey) {
      case 'name':
        return (
          <div className="flex flex-col">
            <p className="text-bold text-small">{user.name}</p>
          </div>
        )
      case 'email':
        return (
          <div className="flex flex-col">
            <p className="text-small">{user.email}</p>
          </div>
        )
      case 'provider':
        return (
          <Chip size="md" color={providerColorMap[user.provider] || 'default'} className="capitalize">
            {user.provider}
          </Chip>
        )
      case 'emailVerified':
        return (
          <Chip size="md" color={user.emailVerified ? 'success' : 'warning'}>
            {user.emailVerified ? 'Verified' : 'Pending'}
          </Chip>
        )
      case 'isAdmin':
        return user.isAdmin ? (
          <Chip size="md" color="accent">Admin</Chip>
        ) : null
      case 'date':
        return (
          <div className="flex flex-col">
            <p className="text-small">{new Date(user.date).toLocaleDateString('de-DE')}</p>
          </div>
        )
      default:
        return null
    }
  }, [])

  if (!isMounted) return null

  return (
    <div className={`flex flex-col gap-4 h-full ${className || ''} select-none`}>
      <div className="flex items-center pl-4 gap-2 shrink-0">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">Users</h1>
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
              placeholder="Search..."
              value={filterValue}
            />
          </InputGroup>
        </TextField>
      </div>
      <div className="flex flex-col gap-4 shrink-0">
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
                placeholder="Search..."
                value={filterValue}
              />
            </InputGroup>
          </TextField>
          <div className="flex gap-3 w-full sm:w-auto">
            <Dropdown>
              <Button variant="tertiary">
                Provider
                <ChevronDownIcon className="text-small" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  disallowEmptySelection
                  aria-label="Provider Filter"
                  selectedKeys={providerFilter}
                  selectionMode="multiple"
                  onSelectionChange={(keys: Selection) => startTransition(() => setProviderFilter(keys))}
                  items={providerOptions}
                >
                  {providerOptions.map(item => (
                    <DropdownItem key={item.uid} id={item.uid} className="capitalize">
                      {item.name}
                      <Dropdown.ItemIndicator />
                    </DropdownItem>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            <Dropdown>
              <Button variant="tertiary">
                Verified
                <ChevronDownIcon className="text-small" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  disallowEmptySelection
                  aria-label="Verified Filter"
                  selectedKeys={verifiedFilter}
                  selectionMode="multiple"
                  onSelectionChange={(keys: Selection) => startTransition(() => setVerifiedFilter(keys))}
                  items={verifiedOptions}
                >
                  {verifiedOptions.map(item => (
                    <DropdownItem key={item.uid} id={item.uid}>
                      {item.name}
                      <Dropdown.ItemIndicator />
                    </DropdownItem>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>
      </div>
      <div className="border-[0.5px] border-gray-300 rounded-2xl overflow-hidden shadow-sm relative flex flex-col flex-1 min-h-0">
        <div
          className={`flex-1 overflow-y-auto transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}
        >
          <table className="w-full text-left border-collapse">
            <thead className="surface surface--tertiary sticky top-0 z-10">
              <tr>
                <th className="h-10 px-4 border-b-[0.5px] border-gray-200 w-10">
                  <Checkbox
                    isSelected={selectedKeys.size === sortedItems.length && sortedItems.length > 0}
                    isIndeterminate={selectedKeys.size > 0 && selectedKeys.size < sortedItems.length}
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
              {isLoading ? (
                <tr>
                  <td colSpan={headerColumns.length + 1} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="md" />
                      <span className="text-xs text-muted">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={headerColumns.length + 1}
                    className="h-24 text-center text-default-400"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {sortedItems.map((item, index) => (
                    <motion.tr
                      key={item.userID}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.015,
                        layout: { duration: 0.3 },
                      }}
                      className={`hover:bg-default-50/50 border-b-[0.5px] border-gray-200 last:border-b-0 transition-colors ${
                        onRowClick
                          ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                          : ''
                      }`}
                      onClick={() => onRowClick?.(item.userID)}
                    >
                      <td className="py-3 px-4">
                        <Checkbox
                          isSelected={selectedKeys.has(item.userID)}
                          onPress={() => toggleSelection(item.userID)}
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
    </div>
  )
}

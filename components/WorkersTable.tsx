'use client'
import React, { memo, useTransition } from 'react'
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
  TextField,
  Label,
  ChipProps,
  Chip,
  InputGroup,
} from '@heroui/react'
import { SortDescriptor } from '@heroui/table'
import { motion, AnimatePresence } from 'framer-motion'

import { ChevronDownIcon, PlusIcon, SearchIcon, VerticalDotsIcon } from '@/components/icons'
import scrollIntoView from 'scroll-into-view-if-needed'
import { Client, Worker, Team } from '@/types/scheduling'
import { UserStar } from 'lucide-react'

interface WorkersTableProps {
  //  list: Record<string, any>[]
  list: Worker[]
  titel: string
  isLoading: boolean
  initialVisibleColumns?: string[]
  sortDescriptor?: SortDescriptor
  onRowClick?: (id: string) => void
  onAddNew?: () => void
  isShowColumns?: boolean
  teams: Team[]
  className?: string
}

export const columns = [
  { name: 'Worker', uid: 'worker', sortable: true },
  { name: 'Status', uid: 'status', sortable: true },
  { name: 'Team', uid: 'team', sortable: true },
  { name: 'E-Mail', uid: 'email', sortable: true },
  { name: 'Straße', uid: 'strasse', sortable: true },
  { name: 'Hausnummer', uid: 'houseNumber', sortable: true },
  { name: 'PLZ', uid: 'plz', sortable: true },
  { name: 'Ort', uid: 'ort', sortable: true },
]

export const statusOptions = [
  { name: 'Active', uid: '0', value: 0 },
  { name: 'Paused', uid: '1', value: 1 },
  { name: 'Archive', uid: '2', value: 2 },
]
const statusColorMap: Record<string, ChipProps['color']> = {
  active: 'success',
  paused: 'warning',
  archive: 'danger',
}
const INITIAL_VISIBLE_COLUMNS = ['worker', 'status', 'team']

const WorkersTable = function WorkersTable(props: WorkersTableProps) {
  const { isShowColumns = false } = props
  const [filterValue, setFilterValue] = React.useState('')
  const [isPending, startTransition] = useTransition()

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
      column: 'worker',
      direction: 'ascending',
    }
  )
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
    new Set(INITIAL_VISIBLE_COLUMNS)
  )
  const [teamFilter, setTeamFilter] = React.useState<Selection>('all')
  const teamItems = React.useMemo(
    () => props.teams.map(team => ({ name: team.teamName, uid: team.id })),
    [props.teams]
  )
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
          user.email.toLowerCase().includes(filterValue.toLowerCase())
      )
    }

    // Фильтрация по статусу - преобразуем uid в числовые значения
    if (statusFilter !== 'all' && Array.from(statusFilter).length !== statusOptions.length) {
      const selectedStatusValues = Array.from(statusFilter)
        .map(uid => statusOptions.find(s => s.uid === uid)?.value)
        .filter((val): val is number => val !== undefined)

      filteredUsers = filteredUsers.filter(user => selectedStatusValues.includes(user.status))
    }

    // Фильтрация по команде
    if (teamFilter !== 'all' && Array.from(teamFilter).length !== teamItems.length) {
      const selectedTeamIds = Array.from(teamFilter)

      filteredUsers = filteredUsers.filter(user => {
        if (user.team && typeof user.team === 'object' && 'id' in user.team) {
          return selectedTeamIds.includes(user.team.id)
        }
        return false
      })
    }

    return filteredUsers
  }, [list, filterValue, statusFilter, teamFilter, teamItems, hasSearchFilter])
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

  const handleTeamFilterChange = React.useCallback(
    (keys: Selection) => {
      startTransition(() => {
        setTeamFilter(keys)
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
    return [...items].sort((a: Worker, b: Worker) => {
      let first: any
      let second: any

      // Специальная обработка для поля 'worker', которое является комбинацией surname и name
      switch (sortDescriptor.column) {
        case 'worker':
          first = `${a.surname} ${a.name}`.toLowerCase()
          second = `${b.surname} ${b.name}`.toLowerCase()
          break
        case 'team':
          first = a.team?.teamName || ''
          second = b.team?.teamName || ''
          break
        default:
          first = a[sortDescriptor.column as keyof Worker]
          second = b[sortDescriptor.column as keyof Worker]
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

  const renderCell = React.useCallback((user: Worker, columnKey: React.Key) => {
    const cellValue = user[columnKey as keyof Worker]
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
                  <Dropdown.Item key="view">View </Dropdown.Item>
                  <Dropdown.Item key="delete">Delete</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        )
      case 'worker':
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
      case 'team':
        return (
          <Chip size="md" color="accent" className="capitalize">
            {typeof cellValue === 'object' && cellValue !== null && 'teamName' in cellValue
              ? cellValue.teamName
              : 'N/A'}
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
  }, [])

  const topColumns = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex gap-3 justify-end items-center">
          <Dropdown>
            <Button variant="tertiary">
              <ChevronDownIcon className="text-small" />
              Spalten
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
  }, [visibleColumns, columns, setVisibleColumns])

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
                placeholder="Search..."
                value={filterValue}
              />
            </InputGroup>
          </TextField>
          <div className="flex gap-3 w-full sm:w-auto">
            <Dropdown>
              <Button variant="tertiary">
                Status
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
                Team
                <ChevronDownIcon className="text-small" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  disallowEmptySelection
                  aria-label="Team Filter"
                  selectedKeys={teamFilter}
                  selectionMode="multiple"
                  onSelectionChange={handleTeamFilterChange}
                  items={teamItems}
                >
                  {teamItems.map(item => (
                    <DropdownItem key={item.uid} id={item.uid} className="capitalize">
                      {item.name}
                      <Dropdown.ItemIndicator />
                    </DropdownItem>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            <Button variant="primary" className="ml-auto sm:ml-0" onPress={props.onAddNew}>
              Add New
              <PlusIcon />
            </Button>
          </div>
        </div>
      </div>
    )
  }, [filterValue, onSearchChange, statusFilter, teamFilter, teamItems])

  if (!isMounted) {
    return null
  }

  return (
    <div className={`flex flex-col gap-4 h-full ${props.className || ''} select-none`}>
      <div className="flex items-center pl-4 gap-2 shrink-0">
        <UserStar className="w-6 h-6 sm:w-6 sm:h-6  text-primary" />
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">Fachkräfte</h1>
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
                      <span className="text-xs text-muted">herunterladen ...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={headerColumns.length + 1}
                    className="h-24 text-center text-default-400"
                  >
                    Keine Datensätze gefunden
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
    </div>
  )
}

export default React.memo(WorkersTable)

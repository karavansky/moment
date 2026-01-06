'use client'
import React, { memo } from 'react'
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
} from '@heroui/react'
import { SortDescriptor } from '@heroui/table'

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  VerticalDotsIcon,
} from '@/components/icons'
import scrollIntoView from 'scroll-into-view-if-needed'

interface GenericTabelleProps {
  list: Record<string, any>[]
  titel: string
  isLoading: boolean
  columns?: { name: string; uid: string; sortable?: boolean }[]
  initialVisibleColumns?: string[]
  sortDescriptor?: SortDescriptor
  onRowClick?: (id: string) => void
}

export const statusOptions = [
  { name: 'Aktive sysupdates', uid: 'active' },
  { name: 'Keine aktive sysudates', uid: 'keine' },
]

const GenericTabelle = function GenericTabelle(props: GenericTabelleProps) {
  const list = React.useMemo(() => {
    return props.list.map((el, idx) => ({ ...el, _id: (el as any)._id ?? idx + 1 }))
  }, [props.list])

  const [rowsPerPage, setRowsPerPage] = React.useState(20)
  const [page, setPage] = React.useState(1)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>(
    props.sortDescriptor || {
      column: 'id',
      direction: 'ascending',
    }
  )
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
    props.initialVisibleColumns ? new Set(props.initialVisibleColumns) : 'all'
  )

  type TypeList = (typeof list)[0]

  const columns = React.useMemo(
    () =>
      props.columns ||
      (list.length
        ? Object.keys(list[0])
            .sort()
            .map(key => ({ name: key, uid: key, id: key, sortable: false }))
        : []),
    [props.columns, list]
  )

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === 'all') return columns

    return columns.filter(column => Array.from(visibleColumns).includes(column.uid))
  }, [columns, visibleColumns])

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

  const pages = Math.ceil(list.length / rowsPerPage)

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage
    const end = start + rowsPerPage

    return sorted.slice(start, end)
  }, [page, sorted, rowsPerPage])

  const onNextPage = React.useCallback(() => {
    if (page < pages) {
      setPage(page + 1)
    }
  }, [page, pages])

  const onPreviousPage = React.useCallback(() => {
    if (page > 1) {
      setPage(page - 1)
    }
  }, [page])

  const onRowsPerPageChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value))
    setPage(1)
  }, [])

  const onPageChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPage(Number(e.target.value))
  }, [])

  const handleSort = (columnUid: string) => {
    setSortDescriptor(prev => ({
      column: columnUid,
      direction:
        prev.column === columnUid && prev.direction === 'ascending' ? 'descending' : 'ascending',
    }))
  }

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
      setSelectedKeys(new Set(items.map(item => String(item._id))))
    }
  }

  const isDate = (value: any): value is Date => {
    return value instanceof Date
  }

  const renderCell = React.useCallback((user: TypeList, columnKey: React.Key) => {
    const cellValue = user[columnKey as keyof TypeList]
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
      default:
        if (cellValue === null || cellValue === undefined) return null

        if (isDate(cellValue)) {
          return (
            <div className="flex flex-col">
              <p className="text-bold text-small ">{cellValue.toLocaleDateString('de-DE')}</p>
            </div>
          )
        }

        if (typeof cellValue === 'object') {
          const display = cellValue.categoryName || cellValue.name || JSON.stringify(cellValue)
          return (
            <div className="flex flex-col">
              <p className="text-bold text-small ">{display}</p>
            </div>
          )
        }

        const isNumber = typeof cellValue === 'number'
        const formattedValue = isNumber ? cellValue.toLocaleString('de-DE') : cellValue

        return (
          <div className={`flex flex-col ${isNumber ? 'items-end' : ''}`}>
            <p className="text-bold text-small ">{formattedValue}</p>
          </div>
        )
    }
  }, [])

  const topContent = React.useMemo(() => {
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
                  <Dropdown.Item key={column.uid} id={column.name} className="capitalize">
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

  const bottomContent = React.useMemo(() => {
    return (
      <div className="flex justify-end items-center gap-6 px-4 py-2 border-t border-gray-200">
        <div className="flex items-center gap-2 text-small text-default-400">
          Rows per page:
          <select
            className="bg-transparent outline-none text-default-400 font-medium"
            value={rowsPerPage}
            onChange={onRowsPerPageChange}
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div className="text-small text-default-400">
          {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, list.length)} of{' '}
          {list.length}
        </div>

        <div className="flex items-center gap-2 text-small text-default-400">
          <select
            className="bg-transparent outline-none text-default-400 font-medium"
            value={page}
            onChange={onPageChange}
          >
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          of {pages} pages
        </div>

        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            onPress={onPreviousPage}
            isDisabled={page === 1}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            onPress={onNextPage}
            isDisabled={page === pages}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    )
  }, [
    page,
    pages,
    rowsPerPage,
    list.length,
    onNextPage,
    onPreviousPage,
    onRowsPerPageChange,
    onPageChange,
  ])

  if (!isMounted) {
    return null
  }
  return (
    <div className="flex flex-col gap-4">
      {topContent}
      <div className="border-[0.5px] border-gray-300 rounded-2xl overflow-hidden bg-transparent shadow-sm">
        <div className="min-h-105 overflow-auto max-h-[calc(100vh-200px)]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-default-50 sticky top-0 z-10">
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
                    className="h-10 px-4 text-tiny font-bold text-default-500 uppercase border-b-[0.5px] border-gray-200 cursor-pointer hover:text-default-700"
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
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={headerColumns.length + 1}
                    className="h-24 text-center text-default-400"
                  >
                    Keine Datensätze gefunden
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item._id}
                    id={`row-${item._id}`}
                    className={`hover:bg-default-50/50 border-b-[0.5px] border-gray-200 last:border-b-0 transition-colors ${
                      props.onRowClick
                        ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                        : ''
                    }`}
                    onClick={() => props.onRowClick?.(String(item._id))}
                  >
                    <td className="py-3 px-4">
                      <Checkbox
                        isSelected={selectedKeys.has(String(item._id))}
                        onPress={() => toggleSelection(String(item._id))}
                      />
                    </td>
                    {headerColumns.map(column => (
                      <td key={column.uid} className="py-3 px-4">
                        {renderCell(item, column.uid)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {bottomContent}
      </div>
    </div>
  )
}

export default React.memo(GenericTabelle)

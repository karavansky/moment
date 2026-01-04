'use client'

import { useState, useMemo } from 'react'
import {
  Button,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
  Checkbox,
} from '@heroui/react'
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table'
import { Pagination } from '@heroui/pagination'
import { Search, ChevronDown, Mail, MessageSquare, Plus, Upload, Columns3 } from 'lucide-react'

export interface Contact {
  id: string
  email: string
  subscribed: {
    email: boolean
    sms: boolean
  }
  blocklisted: boolean
  landlineNumber?: string
  lastChanged: Date
}

interface ContactsTableProps {
  contacts: Contact[]
  onCreateContact?: () => void
  onImportContacts?: () => void
}

export default function ContactsTable({
  contacts,
  onCreateContact,
  onImportContacts,
}: ContactsTableProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['email', 'subscribed', 'blocklisted', 'landline', 'lastChanged'])
  )

  const columns = [
    { key: 'email', label: 'CONTACT', sortable: true },
    { key: 'subscribed', label: 'SUBSCRIBED', sortable: false },
    { key: 'blocklisted', label: 'BLOCKLISTED', sortable: true },
    { key: 'landline', label: 'LANDLINE_NUMBER', sortable: false },
    { key: 'lastChanged', label: 'LAST CHANGED', sortable: true },
  ]

  // Фильтрация контактов по поиску
  const filteredContacts = useMemo(() => {
    if (!searchValue) return contacts

    return contacts.filter(contact =>
      contact.email.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [contacts, searchValue])

  // Пагинация
  const pages = Math.ceil(filteredContacts.length / rowsPerPage)
  const paginatedContacts = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    const end = start + rowsPerPage
    return filteredContacts.slice(start, end)
  }, [filteredContacts, page, rowsPerPage])

  const handleSelectAll = () => {
    if (selectedKeys.size === paginatedContacts.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(paginatedContacts.map(c => c.id)))
    }
  }

  const handleSelectContact = (id: string) => {
    const newSet = new Set(selectedKeys)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedKeys(newSet)
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-default-500 text-sm">
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onPress={onCreateContact}>
            <Plus className="w-4 h-4" />
            Create a contact
          </Button>
          <Button onPress={onImportContacts}>
            <Upload className="w-4 h-4" />
            Import contacts
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <Dropdown>
          <Button>
            Load a list or a segment
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu aria-label="Load list or segment">
              <Dropdown.Item key="all">All contacts</Dropdown.Item>
              <Dropdown.Item key="subscribed">Subscribed</Dropdown.Item>
              <Dropdown.Item key="unsubscribed">Unsubscribed</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        <Dropdown>
          <Button>
            Add filter
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu aria-label="Add filter">
              <Dropdown.Item key="email">Email</Dropdown.Item>
              <Dropdown.Item key="subscribed">Subscribed</Dropdown.Item>
              <Dropdown.Item key="blocklisted">Blocklisted</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* Search and Column Customization */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Input
          placeholder="Search"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className="w-full sm:w-80"
        />
        <Search className="w-4 h-4 text-default-400" />
        <Dropdown>
          <Button className="text-primary">
            <Columns3 className="w-4 h-4" />
            Customize columns
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu
              aria-label="Customize columns"
              selectionMode="multiple"
              selectedKeys={visibleColumns}
              onSelectionChange={keys => setVisibleColumns(keys as Set<string>)}
            >
              {columns.map(col => (
                <Dropdown.Item key={col.key}>{col.label}</Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* Table */}
      <div className="border border-divider rounded-lg overflow-hidden">
        <Table
          aria-label="Contacts table"
          removeWrapper
          classNames={{
            th: 'bg-default-100 text-default-700 font-semibold',
            td: 'border-b border-divider',
          }}
        >
          <TableHeader columns={columns.filter(c => visibleColumns.has(c.key))}>
            {column => (
              <TableColumn key={column.key}>
                {column.key === 'email' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      isSelected={
                        selectedKeys.size === paginatedContacts.length &&
                        paginatedContacts.length > 0
                      }
                      isIndeterminate={
                        selectedKeys.size > 0 && selectedKeys.size < paginatedContacts.length
                      }
                      onChange={handleSelectAll}
                    />
                    <span>{column.label}</span>
                  </div>
                ) : (
                  column.label
                )}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody items={paginatedContacts}>
            {contact => (
              <TableRow key={contact.id}>
                {columns
                  .filter(c => visibleColumns.has(c.key))
                  .map(column => (
                    <TableCell key={column.key}>
                      {column.key === 'email' ? (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            isSelected={selectedKeys.has(contact.id)}
                            onChange={() => handleSelectContact(contact.id)}
                          />
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline"
                          >
                            {contact.email}
                          </a>
                        </div>
                      ) : column.key === 'subscribed' ? (
                        <div className="flex gap-2">
                          {contact.subscribed.email && (
                            <Chip size="sm" variant="soft">
                              <Mail className="w-3 h-3" />
                              Email
                            </Chip>
                          )}
                          {contact.subscribed.sms && (
                            <Chip size="sm" variant="soft">
                              <MessageSquare className="w-3 h-3" /> SMS
                            </Chip>
                          )}
                        </div>
                      ) : column.key === 'blocklisted' ? (
                        contact.blocklisted ? (
                          <Chip size="sm" color="danger" variant="soft">
                            Yes
                          </Chip>
                        ) : null
                      ) : column.key === 'landline' ? (
                        <span className="text-default-500">{contact.landlineNumber || '-'}</span>
                      ) : column.key === 'lastChanged' ? (
                        <span className="text-default-500">
                          {contact.lastChanged.toLocaleDateString('de-DE')}
                        </span>
                      ) : null}
                    </TableCell>
                  ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-default-500">Rows per page</span>
          <Dropdown>
            <Button size="sm">
              {rowsPerPage}
              <ChevronDown className="w-3 h-3" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                aria-label="Rows per page"
                onAction={key => {
                  setRowsPerPage(Number(key))
                  setPage(1)
                }}
              >
                <Dropdown.Item key="10">10</Dropdown.Item>
                <Dropdown.Item key="20">20</Dropdown.Item>
                <Dropdown.Item key="50">50</Dropdown.Item>
                <Dropdown.Item key="100">100</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
          <span className="text-sm text-default-500">
            {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, filteredContacts.length)}{' '}
            of {filteredContacts.length}
          </span>
        </div>

        <Pagination total={pages} page={page} onChange={setPage} showControls size="sm" />

        <span className="text-sm text-default-500">of {pages} pages</span>
      </div>
    </div>
  )
}

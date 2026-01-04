'use client'

import { useState, useEffect } from 'react'

// Пример типа для Batch
interface Batch {
  id: string
  startDate: string
  totalEggs: number
  status: string
  createdAt: string
  updatedAt: string
}

// Пример использования GraphQL в React компоненте
export function BatchesExample() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query {
              batches {
                id
                startDate
                totalEggs
                status
                createdAt
                updatedAt
              }
            }
          `,
        }),
      })

      const result = await response.json()

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      setBatches(result.data.batches)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const createBatch = async () => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation CreateBatch($input: CreateBatchInput!) {
              createBatch(input: $input) {
                id
                startDate
                totalEggs
                status
              }
            }
          `,
          variables: {
            input: {
              startDate: new Date().toISOString().split('T')[0],
              totalEggs: 100,
            },
          },
        }),
      })

      const result = await response.json()

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      // Обновить список после создания
      fetchBatches()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h2>Batches</h2>
      <button onClick={createBatch}>Create New Batch</button>

      <ul>
        {batches.map(batch => (
          <li key={batch.id}>
            Batch {batch.id} - {batch.totalEggs} eggs - Status: {batch.status}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Пример кастомного хука для GraphQL
export function useGraphQL<T>(query: string, variables?: Record<string, any>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      })

      const result = await response.json()

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [query, JSON.stringify(variables)])

  return { data, loading, error, refetch }
}

// Пример использования хука
export function BatchesWithHook() {
  const { data, loading, error, refetch } = useGraphQL<{ batches: Batch[] }>(`
    query {
      batches {
        id
        startDate
        totalEggs
        status
      }
    }
  `)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h2>Batches (using custom hook)</h2>
      <button onClick={refetch}>Refresh</button>

      <ul>
        {data?.batches.map(batch => (
          <li key={batch.id}>
            Batch {batch.id} - {batch.totalEggs} eggs
          </li>
        ))}
      </ul>
    </div>
  )
}

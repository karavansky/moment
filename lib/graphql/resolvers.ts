// GraphQL Resolvers
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export const resolvers = {
  Query: {
    hello: () => 'Hello from QuailBreeder GraphQL API!',

    batches: async () => {
      try {
        const response = await fetch(`${API_URL}/batches`)
        if (!response.ok) {
          throw new Error(`Failed to fetch batches: ${response.statusText}`)
        }
        return await response.json()
      } catch (error) {
        console.error('Error fetching batches:', error)
        throw error
      }
    },

    batch: async (_: any, { id }: { id: string }) => {
      try {
        const response = await fetch(`${API_URL}/batches/${id}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch batch: ${response.statusText}`)
        }
        return await response.json()
      } catch (error) {
        console.error('Error fetching batch:', error)
        throw error
      }
    },
  },

  Mutation: {
    createBatch: async (_: any, { input }: { input: any }) => {
      try {
        const response = await fetch(`${API_URL}/batches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        })
        if (!response.ok) {
          throw new Error(`Failed to create batch: ${response.statusText}`)
        }
        return await response.json()
      } catch (error) {
        console.error('Error creating batch:', error)
        throw error
      }
    },

    updateBatch: async (_: any, { id, input }: { id: string; input: any }) => {
      try {
        const response = await fetch(`${API_URL}/batches/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        })
        if (!response.ok) {
          throw new Error(`Failed to update batch: ${response.statusText}`)
        }
        return await response.json()
      } catch (error) {
        console.error('Error updating batch:', error)
        throw error
      }
    },

    deleteBatch: async (_: any, { id }: { id: string }) => {
      try {
        const response = await fetch(`${API_URL}/batches/${id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Failed to delete batch: ${response.statusText}`)
        }
        return true
      } catch (error) {
        console.error('Error deleting batch:', error)
        throw error
      }
    },
  },
}

// GraphQL Schema Definition
export const typeDefs = `
  type Query {
    hello: String
    batches: [Batch!]!
    batch(id: ID!): Batch
  }

  type Mutation {
    createBatch(input: CreateBatchInput!): Batch!
    updateBatch(id: ID!, input: UpdateBatchInput!): Batch!
    deleteBatch(id: ID!): Boolean!
  }

  type Batch {
    id: ID!
    startDate: String!
    totalEggs: Int!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  input CreateBatchInput {
    startDate: String!
    totalEggs: Int!
  }

  input UpdateBatchInput {
    startDate: String
    totalEggs: Int
    status: String
  }
`

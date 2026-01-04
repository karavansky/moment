# GraphQL API для QuailBreeder

## Установка

GraphQL API доступен на маршруте `/api/graphql`. Используется [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) для Next.js.

## Playground

Откройте в браузере: `http://localhost:3001/api/graphql`

GraphQL Yoga предоставляет встроенный GraphiQL Playground для тестирования запросов.

## Примеры запросов

### Query: Получить все батчи

```graphql
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
```

### Query: Получить один батч по ID

```graphql
query {
  batch(id: "1") {
    id
    startDate
    totalEggs
    status
  }
}
```

### Mutation: Создать новый батч

```graphql
mutation {
  createBatch(input: { startDate: "2024-12-01", totalEggs: 100 }) {
    id
    startDate
    totalEggs
    status
  }
}
```

### Mutation: Обновить батч

```graphql
mutation {
  updateBatch(id: "1", input: { totalEggs: 150, status: "active" }) {
    id
    totalEggs
    status
  }
}
```

### Mutation: Удалить батч

```graphql
mutation {
  deleteBatch(id: "1")
}
```

## Использование из клиентского кода

### С помощью fetch

```typescript
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
        }
      }
    `,
  }),
})

const { data } = await response.json()
console.log(data.batches)
```

### С помощью cURL

```bash
curl -X POST http://localhost:3001/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ hello }"}'
```

## Структура проекта

```
lib/graphql/
├── schema.ts      # GraphQL type definitions
├── resolvers.ts   # GraphQL resolvers
└── README.md      # Эта документация

app/api/graphql/
└── route.ts       # Next.js API route handler
```

## Расширение API

### Добавление новых типов

1. Обновите `lib/graphql/schema.ts`:

```typescript
export const typeDefs = `
  type Query {
    hello: String
    batches: [Batch!]!
    batch(id: ID!): Batch

    # Новый тип
    incubators: [Incubator!]!
  }

  # Новый тип
  type Incubator {
    id: ID!
    name: String!
    capacity: Int!
  }
`
```

2. Добавьте resolver в `lib/graphql/resolvers.ts`:

```typescript
export const resolvers = {
  Query: {
    // ... существующие resolvers

    incubators: async () => {
      const response = await fetch(`${API_URL}/incubators`)
      return await response.json()
    },
  },
}
```

## Интеграция с Apollo Client (опционально)

Для более продвинутого использования можно установить Apollo Client:

```bash
npm install @apollo/client graphql
```

```typescript
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'

const client = new ApolloClient({
  uri: '/api/graphql',
  cache: new InMemoryCache(),
})

// В вашем компоненте
<ApolloProvider client={client}>
  <YourApp />
</ApolloProvider>
```

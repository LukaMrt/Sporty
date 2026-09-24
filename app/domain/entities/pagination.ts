export type PaginationMeta = {
  total: number
  page: number
  perPage: number
  lastPage: number
}

export type PaginatedResult<T> = {
  data: T[]
  meta: PaginationMeta
}

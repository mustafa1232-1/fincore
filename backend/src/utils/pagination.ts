export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
}

export const normalizePagination = (input: PaginationInput): PaginationResult => {
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 200);
  const page = Math.max(input.page ?? 1, 1);

  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    page,
    pageSize
  };
};

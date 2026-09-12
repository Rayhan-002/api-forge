import type { HttpMethod } from '@/types/request';

export const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: 'text-success',
  POST: 'text-method-post',
  PUT: 'text-info',
  PATCH: 'text-method-patch',
  DELETE: 'text-danger',
  HEAD: 'text-muted-foreground',
  OPTIONS: 'text-muted-foreground',
};

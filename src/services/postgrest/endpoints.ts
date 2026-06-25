import { APPS_API_BASE_URL } from '@/config/config'
import type { IPostgrestFilter, IPostgrestParams } from '@/types/types'


const postgrestFilterArg = (f:IPostgrestFilter) => {
  const operator = f.operator ?? 'eq'
    const valForOperator =
      operator === 'in'
        ? `(${Array.isArray(f.value) ? f.value.join(',') : String(f.value)})`
        : String(f.value)

    return `${f.not ? 'not.' : ''}${operator}.${valForOperator}`
  

}

export const postgrestArgs = <T>(
  params: IPostgrestParams<T>,
  existingArgs?: URLSearchParams
): URLSearchParams => {
  const args = existingArgs || new URLSearchParams();

  (params.filters ?? []).forEach((f) => {
    args.append(String(f.column),postgrestFilterArg(f))
  });
  if(params.orFilters !== undefined && params.orFilters.length > 0) {
    const orFilters = params.orFilters.map((f) => `${String(f.column)}.${postgrestFilterArg(f)}`).join(',')
    args.append('or', `(${orFilters})`)
  }
  if (params.limit !== undefined) {
    args.append('limit', params.limit.toString())
  }
  if (params.offset !== undefined) {
    args.append('offset', params.offset.toString())
  }
  if (params.order !== undefined && params.order.length > 0) {
    args.append('order', params.order.map((o) => `${String(o.column)}.${String(o.dir)}`).join(','))
  }
  if (params.select !== undefined) {
    const select = params.select
      .map((s) => {
        const o = typeof s === 'string' ? { column: s } : s
        return `${o.as ? `${o.as}:` : ''}${String(o.column)}${o.fn !== undefined ? `.${o.fn}()` : `${o.join !== undefined ? `(${o.join.table}${o.join.fields !== undefined ? `(${o.join.fields.join(',')})` : '(*)'})` : ''}`}`
      })
      .join(',')
    args.append('select', select)
  }
  return args
}

export const postgrestRollupArgs = ({
  rollupColumn,
  params,
  existingArgs,
}: {
  rollupColumn: string
  params?: IPostgrestParams
  existingArgs?: URLSearchParams
}): URLSearchParams => {
  const p: IPostgrestParams = {
    ...(params ?? {}),
    select: [
      {
        column: rollupColumn,
        fn: 'count',
      },
      {
        column: rollupColumn,
      },
    ],
  }
  return postgrestArgs(p, existingArgs)
}

export const postgrestUrl = ({
  table,
  params,
  args,
}: {
  table: string
  params?: IPostgrestParams
  args?: URLSearchParams
}): string => {
  const url = new URL(`${APPS_API_BASE_URL}/${table}`)
  if (args) {
    url.search = args.toString()
  } else if (params) {
    const args = postgrestArgs(params, url.searchParams)
    url.search = args.toString()
  }
  return url.toString()
}

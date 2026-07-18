import { APPS_API_BASE_URL } from ***REMOVED***@/config/config***REMOVED***
import type { IPostgrestFilter, IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***


const postgrestFilterArg = (f: IPostgrestFilter) => {
  const operator = f.operator ?? ***REMOVED***eq***REMOVED***
  const valForOperator =
    operator === ***REMOVED***in***REMOVED***
      ? `(${Array.isArray(f.value) ? f.value.join(***REMOVED***,***REMOVED***) : String(f.value)})`
      : String(f.value)

  return `${f.not ? ***REMOVED***not.***REMOVED*** : ***REMOVED******REMOVED***}${operator}.${valForOperator}`


}

export const postgrestArgs = <T>(
  params: IPostgrestParams<T>,
  existingArgs?: URLSearchParams
): URLSearchParams => {
  const args = existingArgs || new URLSearchParams();

  (params.filters ?? []).forEach((f) => {
    args.append(String(f.column), postgrestFilterArg(f))
  });
  if (params.orFilters !== undefined && params.orFilters.length > 0) {
    const orFilters = params.orFilters.map((f) => `${String(f.column)}.${postgrestFilterArg(f)}`).join(***REMOVED***,***REMOVED***)
    args.append(***REMOVED***or***REMOVED***, `(${orFilters})`)
  }
  if (params.limit !== undefined) {
    args.append(***REMOVED***limit***REMOVED***, params.limit.toString())
  }
  if (params.offset !== undefined) {
    args.append(***REMOVED***offset***REMOVED***, params.offset.toString())
  }
  if (params.order !== undefined && params.order.length > 0) {
    args.append(***REMOVED***order***REMOVED***, params.order.map((o) => `${String(o.column)}.${String(o.dir)}`).join(***REMOVED***,***REMOVED***))
  }
  if (params.select !== undefined) {
    const select = params.select
      .map((s) => {
        const o = typeof s === ***REMOVED***string***REMOVED*** ? { column: s } : s
        return `${o.as ? `${o.as}:` : ***REMOVED******REMOVED***}${String(o.column)}${o.fn !== undefined ? `.${o.fn}()` : `${o.join !== undefined ? `(${o.join.table}${o.join.fields !== undefined ? `(${o.join.fields.join(***REMOVED***,***REMOVED***)})` : ***REMOVED***(*)***REMOVED***})` : ***REMOVED******REMOVED***}`}`
      })
      .join(***REMOVED***,***REMOVED***)
    args.append(***REMOVED***select***REMOVED***, select)
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
        fn: ***REMOVED***count***REMOVED***,
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
  queryString,
  args,
}: {
  table: string
  params?: IPostgrestParams
  queryString?: string
  args?: URLSearchParams
}): string => {
  const url = new URL(`${APPS_API_BASE_URL}/${table}`)
  if (args) {
    url.search = args.toString()
  } else if (queryString) {
    url.search = queryString
  } else if (params) {
    const args = postgrestArgs(params, url.searchParams)
    url.search = args.toString()
  }
  return url.toString()
}

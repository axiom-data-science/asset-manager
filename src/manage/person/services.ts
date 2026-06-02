import { fetchListFromPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***
import type { IPerson, IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***

const PERSON_TABLE = ***REMOVED***person***REMOVED***

export const fetchPersons = async ({
  params,
  token,
  signal,
}: {
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
}): Promise<IPerson[]> => {
  const persons = await fetchListFromPostgrest<IPerson>({
    table: PERSON_TABLE,
    params,
    token,
    signal,
  })
  return persons
}

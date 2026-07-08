import { fetchListFromPostgrest, fetchSingleFromPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***
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


export const fetchPerson = async ({
  uuid,
  sub,
  token,
  signal
}: {
  uuid?: string
  sub?: string
  token: string
  signal?: AbortSignal
}): Promise<IPerson | null> => {
  if(!uuid && !sub) {
    throw new Error("Either uuid or sub must be provided to fetchPerson")
  }
  const params: IPostgrestParams = {
    filters: [{
          column: sub ? ***REMOVED***owner_sub***REMOVED*** : ***REMOVED***uuid***REMOVED***,
          operator: ***REMOVED***eq***REMOVED***,
          value: sub ?? uuid ?? ***REMOVED******REMOVED***
        }]
  }
  const person = await fetchSingleFromPostgrest<IPerson>({
    table: PERSON_TABLE,
    params,
    token,
    signal,
  })
  return person
}
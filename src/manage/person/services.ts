import { fetchListFromPostgrest, fetchSingleFromPostgrest } from '@/services/postgrest/services'
import type { IPerson, IPostgrestParams } from '@/types/types'

const PERSON_TABLE = 'person'

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
          column: sub ? 'owner_sub' : 'uuid',
          operator: 'eq',
          value: sub ?? uuid ?? ''
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
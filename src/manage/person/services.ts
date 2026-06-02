import { fetchListFromPostgrest } from '@/services/postgrest/services'
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

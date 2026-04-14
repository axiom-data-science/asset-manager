export interface ISensorStationSearchResponse {
  types: [
    {
      count: number
      id: string
      label: string
    },
  ]
  totalHits: number
  tags: Record<
    string,
    {
      id: null | string
      label: string
      count: number
    }
  >
  results: ISensorStationRecord[]
}

export interface ISensorStationRecord {
  label: string
  id: string
  uuid: string
  start_date_time: string
  end_date_time: string
}

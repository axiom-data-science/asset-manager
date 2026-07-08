import { useAuth } from '@/auth/useAuth'
import { Table, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import type { ReactElement } from 'react'

const PipelineList = (): ReactElement => {
  const auth = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const response = await fetch('https://protobr.srv.axds.co/backend/api/pipelines/', {
        headers: {
          Authorization: `Bearer ${auth.user?.access_token || ''}`,
        },
      })
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json()
    },
  })

  return (
    <>
      <h1 className="text-2xl font-bold mb-4 flex flex-row gap-2">Nina pipelines</h1>
      <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        <div className="flex flex-col gap-4">
          {data &&
            <Table
              data={data}
              columns={[
                {
                  label: 'Name',
                  id: 'name',
                  accessor: (r) => <p className='flex flex-col gap-1'><span>{r.name}</span><span className='text-xs text-slate-400'>{r.slug}</span></p>
                },
                {
                  label: 'Active',
                  id: 'active',
                  accessor: (r) => (r.active ? <Check color='green' /> : <X color='red' />),
                },
                {
                  label: 'Description',
                  id: 'description',
                },
                {
                  label: 'Created at',
                  id: 'created',
                  accessor: (r) => new Date(r.created).toLocaleString(),
                },
                {
                  label: 'Updated at',
                  id: 'edited',
                  accessor: (r) => new Date(r.edited).toLocaleString(),
                }
              ]}
            />
          }

        </div>
      </ViewWithLoader>
    </>
  )
}

export default PipelineList

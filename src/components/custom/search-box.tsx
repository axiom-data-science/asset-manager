import type { IPostgrestParams } from "@/types/types"
import { Input, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import { type UseQueryResult } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useState, type ReactElement } from "react"


type ISearchResultPropts<T> = {
    searchHook: ({ params }: { params: IPostgrestParams }) => UseQueryResult<T[], Error>,
    ResultRow: React.FC<T>,
    columnsToSearch?: string[]
}



const SearchResults = <T extends { uuid: string, label: string },>(
    {
        searchHook,
        search,
        ResultRow,
        columnsToSearch = ['label']
    }: ISearchResultPropts<T> & {
        search: string | null
    }): ReactElement => {
    const { data, isLoading, error, isFetching } = searchHook({
        params: {
            filters: columnsToSearch.map(column => ({
                column,
                operator: 'ilike',
                value: `%${search}%`
            }))
        }
    })
    return <div className='absolute top-13 shadow-md left-0 w-full min-h-10 max-h-50 overflow-auto bg-white z-50'>
        <ViewWithLoader isLoading={isLoading && !isFetching} error={error} data={data}>
            {
                isFetching && (
                    <Loader className='w-4 h-4 absolute right-4 top-2 opacity-50' />
                )
            }
            <>
                {
                    data && (data.length > 0 ? (
                        <>{
                            data.map(item => (
                                <ResultRow key={item.uuid} {...item} />
                            ))
                        }</>

                    ) : <p className='p-4 text-sm text-slate-400'>No results found</p>)
                }
            </>
        </ViewWithLoader>
    </div>

}

const SearchBox = <T extends { uuid: string, label: string },>({
    searchHook,
    placeholder = 'Search...',
    ResultRow
}: ISearchResultPropts<T> & {
    placeholder?: string
}): ReactElement => {
    const [search, setSearch] = useState<string | null>(null)

    return (
        <div className='relative'>
            {
                search && search !== '' && search !== null && (

                    <X className='absolute top-3 right-2 w-6 h-6 text-gray-500 cursor-pointer' onClick={() => {
                        setSearch(null)
                    }} />
                )}
            <Input
                id='user-email'
                testId='user-email'
                type="text"
                value={search ?? ''}
                onChange={(e) => setSearch(e ?? null)}
                placeholder={placeholder}
            />
            {
                search && search !== '' && search !== null && (
                    <SearchResults searchHook={searchHook} search={search ?? ''} ResultRow={ResultRow} />
                )
            }
        </div>
    )

}

export default SearchBox
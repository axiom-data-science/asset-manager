import { useDocumentAndObjectTypeAndObjectTypeConfig } from '@/manage/document/useDocument'
import { ViewWithLoader, Button } from '@axdspub/axiom-ui-utilities'
import type { ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Share } from 'lucide-react'
import Link from '@/manage/components/link'
import ShareDocument from '@/components/custom/share-document'
import WaterLevelDocuments from './water_level_documents'
import CreateWaterLevelDocumentButton from './create_water_level_document_button'

const WaterLevelCreateDocumentSuccess = (): ReactElement => {

    const [searchParams] = useSearchParams()
    const uuid = searchParams.get('uuid')
    const action = searchParams.get('action')
    const { data, isLoading, error } = useDocumentAndObjectTypeAndObjectTypeConfig(uuid)

    if (!uuid) {
        return <div>Invalid document ID</div>
    }

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {data?.document && (
                <div className='flex flex-col gap-10 p-10'>
                    <h1 className="text-2xl font-medium">Water level document {action === 'edit' ? 'updated' : 'created'}</h1>
                    <div className='flex flex-row gap-10'>
                        <div className="flex flex-col gap-10 w-[40%]">
                            <div className="flex flex-wrap gap-4">
                                <Check className="text-green-500" size={24} /> <Link to={`/documents/${uuid}`} className='font-bold'>{data.document.label}</Link> {action === 'edit' ? 'updated' : 'created'}
                                <ShareDocument document={data.document} SelectButton={<Button size='xs' variant='outline'>Share <Share /></Button>} />
                            </div>
                            <CreateWaterLevelDocumentButton />

                        </div>
                        <div>
                            <WaterLevelDocuments Heading={<h2 className="font-semibold">Water level metadata records in progress</h2>} filter={action === 'edit' ? undefined : {
                                column: 'uuid',
                                operator: 'neq',
                                value: uuid
                            }} />
                        </div>
                    </div>
                </div>
            )}
        </ViewWithLoader>
    )
}

export default WaterLevelCreateDocumentSuccess

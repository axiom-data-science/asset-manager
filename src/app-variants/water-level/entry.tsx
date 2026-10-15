import type { ReactElement } from 'react'
import type { CreateDocumentEntryProps } from '@/variants/types'
import WaterLevelDocuments from './water_level_documents'
import CreateWaterLevelDocumentButton from './create_water_level_document_button'




const WaterLevelEntry = ({
    returnToOnSuccess = '/create-document-success',
    documentCreatePath = '/create-document',
}: CreateDocumentEntryProps = {}): ReactElement => {


    return (
        <>
            <h2 className="text-2xl font-bold mb-4">Water Level</h2>


            <div className='flex flex-row gap-4 h-full'>
                <div className='flex flex-col gap-4 w-[40%]'>
                    <CreateWaterLevelDocumentButton returnToOnSuccess={returnToOnSuccess} documentCreatePath={documentCreatePath} />
                </div>
                <div>
                    <WaterLevelDocuments Heading={<h2 className="font-semibold">Water level metadata records in progress</h2>} />
                </div>
            </div>

        </>
    )
}
export default WaterLevelEntry

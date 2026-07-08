
const ProgressBar = ({ progress }: { progress: number }) => {
    return (
        <div className="w-full bg-gray-200 rounded-full">
            <div
                className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-l-full"
                style={{ width: `${progress}%` }}
            >
                {progress}%
            </div>
        </div>
    )
}

const ImportSensorStations = () => {




}



const LoadSensorStations = () => {

}
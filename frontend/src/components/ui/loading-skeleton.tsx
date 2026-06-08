import { Skeleton } from './skeleton';

function WeatherSkeleton() {
    return(
        <div>
            <div>
                <Skeleton/>
                <Skeleton/>
                <div>
                    <Skeleton className="h-8 w-8 rounded-full"/>
                    <Skeleton className="h-4 w-16"/>
                </div>
            </div>
        </div>


    )



}

export default WeatherSkeleton;
import type { ReactElement } from "react";
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from ***REMOVED***@/components/ui/popover***REMOVED***
import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";

const PopoverTest = (): ReactElement => {
    return (
        <div className=***REMOVED***p-20***REMOVED***>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline"><Share /></Button>
                </PopoverTrigger>
                <PopoverContent>
                    <PopoverHeader>
                        <PopoverTitle>Title</PopoverTitle>
                        <PopoverDescription>Description text here.</PopoverDescription>
                    </PopoverHeader>
                </PopoverContent>
            </Popover>

        </div>
    )

}

export default PopoverTest
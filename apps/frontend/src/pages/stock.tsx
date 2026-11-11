import { Navbar } from "@/components/ui/navbar";

export function Stock(){
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            {/* market tabs strip */}
            {/* ticker bar */}

            <div className="grid grid-cols-[1fr_300px_320px] grid-rows-[1fr_200px] gap-2 flex-1">
                <div className="bg-gray-400">A</div>
                <div className="bg-gray-400">B</div>
                <div className="row-span-2 bg-gray-400">C</div>
                <div className="col-span-2 bg-gray-400">D</div>
            </div>
        </div>
    )
}
import { Navbar } from "@/components/ui/navbar"
import { Ticker } from "./Ticker"

export function Home(){
    return (
        <div className="h-screen w-screen flex flex-col">
            <div className="bg-blue-950 text-amber-50">
                <Navbar/>
            </div>
            <div>
                <Ticker/>    
            </div>
            
        </div>
    )
}
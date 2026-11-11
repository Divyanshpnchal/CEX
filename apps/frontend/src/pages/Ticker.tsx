import {  useQuery } from "@tanstack/react-query"
import axios from "axios"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Navigate, useNavigate } from "react-router-dom"
const BACKEND_URL = process.env.BUN_PUBLIC_BACKEND_URL

type StockType = {
  id: number;
  symbol: string;
  name: string;
  exchange: string;
  currentPrice: string;
  previousPrice: string;
  isActive: boolean;
};

type StockProps = Pick<StockType, "symbol" | "exchange" | "currentPrice" | "previousPrice" | "name">;

async function Fetchstock(){
    const response = await axios.get(`${BACKEND_URL}/stock`);
    return response.data ;
}

export function Ticker(){
    

    const {isPending , isError ,  data , error} = useQuery({
        queryKey : ['Stock'],
        queryFn : Fetchstock,
    })

    
    if(isPending){
        return (
            <div>loading...</div>
        )
    }
    if(isError){
        console.error(error)
        return (
            <div>Error : {error.message}</div>
        )
        
    }
    const post = data.map((x:StockType) => <Stock key= {x.id} symbol={x.symbol} exchange={x.exchange} currentPrice={x.currentPrice} previousPrice={x.previousPrice} name={x.name}></Stock>)

    return (
        <div>
            <Table>
                <TableCaption>List of stocks</TableCaption>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[100px]">Symbol</TableHead>
                    <TableHead className="w-[100px]">Name</TableHead>
                    <TableHead>Exchange</TableHead>
                    <TableHead>PreviousPrice</TableHead>
                    <TableHead className="text-right">CurrentPrice</TableHead>   
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {post}
                </TableBody>
            </Table>            
        </div>

    )
}

function Stock({symbol , exchange , currentPrice , previousPrice , name } : StockProps){
    const navigate = useNavigate();
    return (
        <TableRow onClick={()=>navigate("/stock")} >
        <TableCell className="font-medium">{symbol}</TableCell>
        <TableCell className="font-medium">{name}</TableCell>
        <TableCell>{exchange}</TableCell>
        <TableCell>{previousPrice}</TableCell>
        <TableCell className="text-right">{currentPrice}</TableCell>
        </TableRow>

    )
}

            
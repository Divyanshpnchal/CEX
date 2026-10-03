import { Button } from "@/components/ui/button"
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios"
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"


const BACKEND_URL = process.env.BUN_PUBLIC_BACKEND_URL ;


export function Wallet(){
    const [amount , setamount] = useState(0)
    const [Deposit , setDeposit] = useState(false);
    const [Withdraw , setWithdraw] = useState(false);
    const {isPending , isError , data , error , refetch} = useQuery({
        queryKey : ['balance'],
        queryFn : getbalance,
    })
    const mutation = useMutation({
        mutationFn : Depositamount,
        onSuccess : ()=>{
            setamount(0);
            setDeposit(false);
            refetch();
            toast.success("Amount Deposited",{position : "bottom-right"})
        }
    })
    const mutation2 = useMutation({
        mutationFn : Withdrawamount,
        onSuccess : ()=>{
            setamount(0);
            setWithdraw(false);
            console.log("refeching")
            refetch();
        }
    })    
    async function Depositamount(){
        try{
            const x = amount * 100
            const response = await axios.post(`${BACKEND_URL}/deposit` ,{x} )
            return response.data
        }
        catch(err){
            throw err
        }          
    }

    async function Withdrawamount(){
        try{
            
            if(amount > data.balance){
                setWithdraw(false);
                console.log("reached inside for loop")
                toast.error("Not Enough Balance" ,{position : "bottom-right"})
                return;
            }
            const x = amount * 100;
            const response = await axios.post(`${BACKEND_URL}/withdraw` , {x});
            console.log("reached in withdraw function")
            toast.success("Withdraw was successful" , {position : "bottom-right"})
            return response.data

        }
        catch(err){
            throw err
        }
    }

    
    async function getbalance(){
        try{
            const response = await axios.get(`${BACKEND_URL}/balance`,{withCredentials : true})          
            return response.data   
        }
        catch(err){
            throw err
        }   
    }

    if (isPending) {
        return <span>Loading...</span>
    }

    if (isError) {
        return <span>Error: {error.message}</span>
    }
    
    
    return (
        <div className="h-screen w-screen flex justify-center items-center bg-gray-100">
        <div className="bg-white shadow-lg rounded-lg p-6 w-[300px] flex flex-col items-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
            Balance: {data?.balance}
            </h2>

            {Deposit ? (
            <div className="w-full space-y-3">
                <Input
                onInput={(e) => setamount(Number(e.currentTarget.value))}
                placeholder="Enter your amount"
                className="w-full border rounded px-3 py-2"
                />
                <div className="flex justify-between space-x-2">
                <Button className="flex-1" onClick={() => mutation.mutate()}>
                    Add
                </Button>
                <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => setDeposit(false)}
                >
                    Cancel
                </Button>
                </div>
            </div>
            ) : (
            <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => setDeposit(true)}
            >
                Deposit
            </Button>
            )}



            {Withdraw ? (
            <div className="w-full space-y-3">
                <Input
                onInput={(e) => setamount(Number(e.currentTarget.value))}
                placeholder="Enter your amount"
                className="w-full border rounded px-3 py-2"
                />
                <div className="flex justify-between space-x-2">
                <Button className="flex-1" onClick={() => mutation2.mutate()}>
                    Withdraw
                </Button>
                <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => setWithdraw(false)}
                >
                    Cancel
                </Button>
                </div>
            </div>
            ) : (
            <Button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => setWithdraw(true)}
            >
                Withdraw
            </Button>
            )}

        </div>
        </div>

    )
}
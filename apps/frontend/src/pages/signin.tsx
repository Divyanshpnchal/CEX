import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
axios.defaults.withCredentials = true;

const BACKEND_URL = process.env.BUN_PUBLIC_BACKEND_URL ;

export function Signin() {
    const navigate = useNavigate();
    const [usermail , setUsermail] =  useState<null | string>(null);
    const [password , setPassword] =  useState<null | string>(null);
  
    async function signin(username:string , password:string){
        try{
            const response = await axios.post(`${BACKEND_URL}/signin` , {
                usermail : username ,
                password : password
            })

            
            navigate("/Home");



        }
        catch(error){
            console.error(error);
        }
    }
  
  
  
    return (
    <div className="h-screen w-screen flex">
      <div className="flex-1 bg-violet-400 flex items-center justify-center">
        <h1 className="text-3xl font-bold">CEX</h1>
      </div>
      <div className="flex-1 bg-violet-600 flex items-center justify-center">
        <div className=" flex flex-col items-center gap-4 p-6">
            <Input onChange={(e)=>{setUsermail(e.target.value)}}  className="bg-amber-100 w-[400px] focus:bg-amber-200 focus:border-amber-500 focus:outline-none " placeholder="Enter your mail" />
            <Input onChange={(e)=>{setPassword(e.target.value)}} className= "bg-amber-100 focus:bg-amber-200 focus:border-amber-500 focus:outline-none" placeholder="Enter your password" />
            <Button onClick={()=>{signin(usermail ?? "" , password ?? "")}} className="w-full">Signin</Button>
        </div>

      </div>
    </div>
  );
}

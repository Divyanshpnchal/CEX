import express from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

interface MyJwtPayload extends JwtPayload {
  mail: string;
}
const app =  express();
const Secret_key = process.env.JWT_KEY || "defaultkey"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


export async function authmiddleware(req: Request, res: Response, next: NextFunction){
    const token = req.cookies.auth_token ;
    if(!token){
        res.status(405).json({message : "user dont exists please signup first"}) ;
        return ;
    }
    
    try{
        const decoded  = jwt.verify(token , Secret_key ) as MyJwtPayload ;
        const user = await prisma.user.findUnique({
        where: { email: decoded.mail },
        });
        if(!user){
            return res.status(401).json({message : "user dont exists please signup first"})
        }
        req.user = user ;                
        next();
    }
    catch(err){
        return res.status(401).json({ message: "Invalid token" });
    }

}



import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import express from "express";
import jwt from "jsonwebtoken";
import { hashSync, compareSync } from "bcrypt";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authmiddleware } from "./Middleware"




const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3000", credentials: true })); // this says allow request coming from this origin and credential true says allow cookies
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const Secret_key: string = process.env.JWT_KEY || "defaultkey";


app.post("/signup", async (req, res) => {
    const usermail = req.body.usermail;
    const password = req.body.password;

    const name = await prisma.user.findUnique({
        where: {
            email: usermail
        }
    });

    if (name) {
        res.status(401).json({ message: "user already exist " });
        return;
    }

    const hashresult = hashSync(password, 10);

    try {
        await prisma.user.create({
            data: {
                email: usermail,
                password: hashresult,
                balance : {
                    create : {}
                }
            }
        });

        res.status(201).json({ message: "account created " });
    }
    catch (error) {
        res.status(404).json({ message: " something went wrong " });
    }
});

app.post("/signin", async (req, res) => {
    const usermail = req.body.usermail;
    const password = req.body.password;

    const user = await prisma.user.findUnique({
        where: {
            email: usermail,
        }
    });

    if (!user) {
        res.status(401).json({ message: "user not found " });
        return;
    }

    const hashpass = user.password;

    try {
        const result = compareSync(password, hashpass);
        if (!result) {
            res.status(401).json({ message: "password incorrect" });
            return;
        }

        const token = jwt.sign({
            mail: usermail
        }, Secret_key);

        res.cookie("auth_token", token);
        res.json({ message: "Login successful", token });



    }
    catch (error) {
        res.status(401).json({ message: "something went wrong" });
    }
});

app.get("/balance" , authmiddleware ,async (req , res)=>{
    try{
        const user = req.user;
        const balance = await prisma.user.findUnique({
            where : {
                email : user?.email
            },
            select : {
                balance : {
                    select : { amount : true}
                }
            }
        })
        if(!balance){
            res.status(400).json({message :"something went wrong "});
            return;
        }
        
        const amount = (balance?.balance?.amount ?? 0 )/100; 

        res.status(201).json({balance :amount})        
    }
    catch(err){
        console.error(err);
        res.status(500).json({ message: "Internal server error" });        
    }

})



app.post("/deposit" , authmiddleware ,async(req , res)=>{
    const user = req.user ;
    const amount = req.body.x;
    console.log("hii reached deposit")
    if(!user){
        return  res.status(401).json({message : "user not found"});
    }

    try{
        const updated = await prisma.user.update({
            where:{
                email : user?.email
            },
            data : {
                balance : {
                    update : {
                        amount : {
                            increment : amount
                        }
                    }
                }
            },
            select : {
                balance : {
                    select : {
                        amount : true
                    }
                }
            }
        })

        res.status(201).json({balance : updated})


    }
    catch(err){
        console.error(err);
        res.status(500).json({ message: "Internal server error" }); 
    }



})


app.post("/withdraw" , authmiddleware ,async (req , res)=>{
    const user = req.user ;
    const amount = req.body.x;
    console.log("hii reached withdraw")
    if(!user){
        return  res.status(401).json({message : "user not found"});
    }
    try {
        const updated = await prisma.user.update({
            where : {
                email : user?.email
            },
            data : {
                balance : {
                    update : {
                        amount : { decrement : amount}
                    }
                }
            },
            
            select : {
                balance : {
                    select : {amount : true}
                }
            }

        })

        res.status(201).json({balance : updated})


    }catch(err){
        console.error(err);
        res.status(500).json({ message: "Internal server error" }); 
    }
    


})




app.listen(3002, () => { console.log("the backend sever has started at port 3002") });
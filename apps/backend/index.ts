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
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
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
                password: hashresult
            }
        });

        res.status(201).json({ message: "account created " });
    }
    catch (error) {
        res.status(404).json({ message: " something went wrong " });
    }
});

app.post("/signin", async (req, res) => {
    const usermail = req.body.email;
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

app.listen(3002, () => { console.log("the backend sever has started at port 3002") });
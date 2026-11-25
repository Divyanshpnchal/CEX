import Redis from "ioredis";


const redis = new Redis({
    host : process.env.REDIS_HOST ?? "localhost",
    port : Number(process.env.REDIS_PORT ?? 6379) ,
    password : process.env.REDIS_PASSWORD || undefined ,
    maxRetriesPerRequest: 3,
})


redis.on("connect" , ()=>{console.log("redis is on")});
redis.on("error" , (err)=>{console.error("can't connect to redis", err)});


export default redis ;
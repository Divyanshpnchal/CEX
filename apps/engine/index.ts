import redis from "./src/redis";
import { placeOrder, cancelOrder } from "./engine";

const publisher = redis.duplicate(); 
const QUEUE_KEY = "queue:orders";
const RESULT_CHANNEL = "result";

type Order = {
    requestId: string;
    ordertype: "place" | "cancel";
    symbol: string;
    userId: number;
    quantity: number | null;
    price: number | null;
    side: "asks" | "bids" | null;
    orderId: number | null;
};

type Fail = { ok: false; reason: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function reply(requestId: string, result: unknown) {
    await publisher.publish(RESULT_CHANNEL, JSON.stringify({ requestId, result }));
}

function handle(order: Order): unknown {
    if (order.ordertype === "place") {
        if (order.quantity != null && order.price != null && order.side != null) {
            return placeOrder(order.symbol, order.userId, order.quantity, order.price, order.side);
        }
        return { ok: false, reason: "invalid input" } as Fail;


    }
    if (order.ordertype === "cancel") {
        if(order.orderId != null){
        return cancelOrder(order.symbol, order.userId, order.orderId);
        }
        return { ok: false, reason: "invalid input" } as Fail;

    }
    return { ok: false, reason: "unknown type" } as Fail;
}

async function main() {
    console.log("engine started, waiting for orders...");

    while (true) {
        let requestId: string | null = null;
        try {
            const popped = await redis.brpop(QUEUE_KEY, 0);
            if (!popped) continue;

            const [, data] = popped;
            const order: Order = JSON.parse(data);
            requestId = order.requestId;

            const result = handle(order);
            await reply(requestId, result);
        } catch (err) {
            console.error(err);
            if (requestId) {
                try {
                    await reply(requestId, { ok: false, reason: "internal error" } as Fail);
                } catch (e) {
                    console.error("failed to send error reply", e);
                }
            }
            await sleep(1000); 
        }
    }
}

main();
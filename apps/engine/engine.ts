import {z}from "zod";
//symbol:string , userId:number , quantity:number , price:number , side:"asks"|"bids"





const inputSchema = z.object({
    symbol :  z.enum(["AXIS" , "TATA"  ]),
    userId : z.number().int().positive(),
    quantity : z.number().int().positive().max(100000),
    price : z.number().int().positive().max(1000000),
    side : z.enum(["asks" , "bids"])
})

const cancelinputSchema = z.object({
    symbol :  z.enum(["AXIS" , "TATA"  ]),
    userId : z.number().int().positive(),
    orderId : z.number().int().positive()
})

type balanceobject = Record< number ,{totalBalance : number , lockedBalance : number , stocks : Record<string , {total : number , locked : number}> }>



export const balance : balanceobject = {
    1 : {
        totalBalance : 30000 ,
        lockedBalance : 10000,
        stocks : {
            AXIS : {
                total : 10 ,
                locked : 5 
            }  
        }
    }
}

let nextorderId = 1 ;

export type Orders = {
    userId : number ,
    quantity : number ,
    filledQty : number ,
    orderId : number ,
    createdAt : Date 
}

type PriceLevel = {
    totalQty : number ,    
    Orders : Orders[]
}

type book = Record<string , {asks : Record<number , PriceLevel> , bids : Record<number , PriceLevel> }> 

export const orderbook : book = {
    AXIS : {
        asks : {

        },
        bids : {

        }
    }
}


export function addToBook(symbol : string , side : "asks" | "bids" , price : number , order : Orders){
    
    let book = orderbook[symbol];
    if(!book){
        orderbook[symbol] = {
            asks : {},
            bids : {}
        }
        book = orderbook[symbol]
    }
    
    const level = book[side];

    if(!level[price]){
        level[price] = {
            totalQty :  0 ,
            Orders : []
        }
    }
    
    level[price].Orders.push(order)
    level[price].totalQty += order.quantity - order.filledQty



}






export function getBestPrice(symbol: string ) : { bestAsks : number | null , bestBids : number | null} | undefined  {
    const book = orderbook[symbol];
    if(!book){
        return undefined ;
    }

    const asks =  Object.keys(book.asks).map(Number)
    const bids = Object.keys(book.bids).map(Number)
    
    return  {
        bestAsks : asks.length == 0 ? null :Math.min(...asks),
        bestBids : bids.length == 0 ? null : Math.max(...bids)
    }



}


export function canPlaceOrder(userId : number , side : "asks"|"bids" , symbol : string , quantity : number) : boolean{
    const user = balance[userId];
    if(!user)return false ;

    if(side === "bids"){
        if(user.totalBalance - user.lockedBalance >= quantity)return true ;
    }
    else{
        if(!user.stocks[symbol])return false ;
        if(user.stocks[symbol].total - user.stocks[symbol].locked >= quantity)return true ;
    }

    return false ;

}




export function matchBuyOrder(symbol : string , quantity : number , price : number , userId : number):{ ok: true;  orderId: number; status: "filled" | "partial" | "open" | "cancelled"; total: number; filled: number }{
    const orderId = nextorderId ;
    nextorderId++;
    let remaining = quantity;
    let bestask = getBestPrice(symbol)?.bestAsks;
    let selfTrade = false;
    while(remaining > 0 && bestask != null && bestask <= price){
        //get the ask 
        const ask = orderbook[symbol].asks[bestask];
        
        // get the seller order 
        const seller = ask.Orders[0];
        
        // check for self trade
        if(seller.userId == userId){
            selfTrade = true ;
            break;
        }

        // how much trade is gonna happen 
        const trade = Math.min(remaining , seller.quantity - seller.filledQty);
        
        //update the remaining
        remaining -= trade ;
        
        // update the seller filledqty
        seller.filledQty += trade ;
        
        // update the seller balance 
        balance[seller.userId].totalBalance += trade * bestask ;  
        balance[seller.userId].stocks[symbol].locked -= trade;
        balance[seller.userId].stocks[symbol].total -= trade;
        
        //update the buyers balance 
        balance[userId].totalBalance -= trade * bestask ;
        const stock = balance[userId].stocks
        if(!stock[symbol]){
            stock[symbol] = {
                total : 0 ,
                locked : 0 
            }

            stock[symbol].total += trade ;
        }else{
            stock[symbol].total += trade ;
        }


        //update the total quantity of that price 
        ask.totalQty -= trade ;
        
        if(seller.filledQty == seller.quantity){
            // if sellers order is fullfilled then remove it from order array 
            ask.Orders.splice(0 , 1);
        }
        
        if(ask.totalQty == 0){
            // remove the level
            delete orderbook[symbol].asks[bestask]
            
        }

        //update best ask
        bestask = getBestPrice(symbol)?.bestAsks;
    }
    
    if(remaining > 0 && !selfTrade){
        const order : Orders= {
            userId : userId ,
            quantity : quantity ,
            filledQty : quantity - remaining ,
            orderId : orderId ,
            createdAt : new Date             
        }
        addToBook(symbol ,"bids" , price , order);

        //locked the amount
        balance[userId].lockedBalance+= remaining*price;
        return {
            ok : true ,
            orderId : orderId,
            status : quantity==remaining ? "open" :"partial",
            total : quantity,
            filled : quantity - remaining 

        }

    }    
    if(selfTrade ){
        return {
            ok : true ,
            orderId : orderId ,
            status : "cancelled",
            total : quantity ,
            filled :quantity - remaining ,
            
        }        
    }    

    return {
        ok : true ,
        orderId : orderId ,
        status : "filled",
        total : quantity ,
        filled :quantity ,
        
    }


}



export function matchAskOrder(symbol:string , quantity: number , price : number , userId : number ):{ ok: true;  orderId: number; status: "filled" | "partial" | "open" |"cancelled"; total: number; filled: number }{
    const orderId = nextorderId ;
    nextorderId++;
    let remaining = quantity ;
    let bestBids = getBestPrice(symbol)?.bestBids ;
    let selfTrade = false;
    while(remaining > 0 && bestBids != null && bestBids >= price){
        //get the buyers level
        const level = orderbook[symbol].bids[bestBids];
        
        //get the order 
        const buyer = level.Orders[0];

        //check if its not a self trade 
        if(buyer.userId == userId){
            selfTrade = true ;
            break ;
        }

        // trade 
        const trade = Math.min(buyer.quantity - buyer.filledQty , remaining);

        //update the remaining
        remaining -= trade ;

        //update the seller balance and total stock
        balance[userId].totalBalance += trade * bestBids ;
        balance[userId].stocks[symbol].total -= trade ;
        

        //update the buyer balance and stock
        balance[buyer.userId].totalBalance -= trade * bestBids ;
        balance[buyer.userId].lockedBalance -= trade * bestBids ;
        
        const stock = balance[buyer.userId].stocks;
        if(!stock[symbol]){
            stock[symbol]={
                total : 0 ,
                locked : 0 
            }
            stock[symbol].total += trade ;
            
        }else{
            stock[symbol].total += trade ;
        }

        // remove buyer 
        buyer.filledQty += trade ;
        if(buyer.filledQty == buyer.quantity){
            level.Orders.splice(0,1);
        }
        

        //remove level if needed 
        level.totalQty -= trade ;
        if(level.totalQty == 0 ){
            delete orderbook[symbol].bids[bestBids]
        }


        //reset bestbids 
        bestBids = getBestPrice(symbol)?.bestBids ;


    }
    
    if(remaining > 0 && !selfTrade){
        const order : Orders ={
        userId : userId ,
        quantity : quantity ,
        filledQty : quantity - remaining ,
        orderId : orderId ,
        createdAt : new Date             
        }

        addToBook(symbol , "asks" , price , order);

        //lock the remaining 
        balance[userId].stocks[symbol].locked += remaining ;
        return {
            ok : true ,
            orderId : orderId,
            status : quantity==remaining ? "open" :"partial",
            total : quantity,
            filled : quantity - remaining 

        }
    }

    if(selfTrade ){
        return {
            ok : true ,
            orderId : orderId ,
            status : "cancelled",
            total : quantity ,
            filled :quantity - remaining ,
            
        }        
    }

    return {
        ok : true ,
        orderId : orderId ,
        status : "filled",
        total : quantity ,
        filled :quantity ,
        
    }


}


export function placeOrder(symbol:string , userId:number , quantity:number , price:number , side:"asks"|"bids"): { ok: true;  orderId: number; status: "filled" | "partial" | "open"|"cancelled"; total: number; filled: number }|{ ok: false; reason: string }{
    if(!inputSchema.safeParse({symbol : symbol , userId : userId , quantity : quantity ,price : price , side : side }).success)return {
        ok : false ,
        reason : "invalid input"
    }
    
    if(side == "asks"){
        const canplace = canPlaceOrder(userId ,side ,symbol , quantity);
        if(!canplace)return {ok:false , reason : "cant place order"};
        return  matchAskOrder(symbol,quantity,price,userId);
    }else{
        const canplace = canPlaceOrder(userId ,side ,symbol , price * quantity);
        if(!canplace)return {ok:false , reason : "cant place order"};        
        return matchBuyOrder(symbol , quantity , price , userId );
    }



    

}




type CancelResult =
    | { ok: true; orderId: number; cancelledQty: number }
    | { ok: false; reason: string };

type FoundOrder = {
    side: "asks" | "bids";
    price: number;
    level: PriceLevel;
    index: number;
    order: Orders;
};

// only searches, does not care who owns the order
export  function findOrder(symbol: string, orderId: number): FoundOrder | null {
    const book = orderbook[symbol];
    if (!book) return null;                       // symbol with no book: no crash

    for (const side of ["asks", "bids"] as const) {
        for (const [price, level] of Object.entries(book[side])) {
            const index = level.Orders.findIndex(o => o.orderId === orderId);
            if (index !== -1) {
                return { side, price: Number(price), level, index, order: level.Orders[index] };
            }
        }
    }
    return null;
}

export function cancelOrder(symbol: string, userId: number, orderId: number): CancelResult {
    if (!cancelinputSchema.safeParse({ symbol, userId, orderId }).success) {
        return { ok: false, reason: "invalid input" };
    }

    const found = findOrder(symbol, orderId);

    // same message for "does not exist" and "not yours", so nothing leaks
    if (!found || found.order.userId !== userId) {
        return { ok: false, reason: "order not found" };
    }

    const { side, price, level, index, order } = found;
    const remaining = order.quantity - order.filledQty;

    // unlock what was reserved
    if (side === "asks") {
        balance[userId].stocks[symbol].locked -= remaining;
    } else {
        balance[userId].lockedBalance -= remaining * price;
    }

    // remove from the book and fix the level
    level.Orders.splice(index, 1);
    level.totalQty -= remaining;
    if (level.Orders.length === 0) {
        delete orderbook[symbol][side][price];
    }

    return { ok: true, orderId, cancelledQty: remaining };
}


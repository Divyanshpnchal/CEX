type orders = {
    userId : number ,
    quantity : number ,
    filledQty : number ,
    orderId : number ,
    createdAt : Date 
}

type PriceLevel = {
    totalQty : number ,    
    Order : orders[]
}

type book = Record<string , {asks : Record<number , PriceLevel> , bids : Record<number , PriceLevel> }> 

const orderbook : book = {
    AXIS : {
        asks : {

        },
        bids : {

        }
    }
}














// Run with:  bun engine.test.ts      (plain script, not "bun test")
import {
    balance, orderbook,
    addToBook, getBestPrice, canPlaceOrder,
    matchBuyOrder, matchAskOrder, placeOrder, cancelOrder,
} from "./engine";
import type { Orders } from "./engine";

// ====================== helpers ======================
function check(name: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(ok ? "PASS" : "FAIL", "-", name);
    if (!ok) console.log("   expected:", expected, " got:", actual);
}

const R = (r: unknown) => r as any;                       // lets the tests read fields of the result
const snap = () => JSON.stringify([orderbook, balance]);  // whole state as text, to prove "nothing changed"
const A = () => orderbook["AXIS"];

const mk = (id: number): Orders => ({
    userId: 1, quantity: 5, filledQty: 0, orderId: id, createdAt: new Date()
});

const sell = (id: number, qty: number): Orders =>
    ({ userId: 2, quantity: qty, filledQty: 0, orderId: id, createdAt: new Date() });

// every test group starts from a clean state, so the tests do not depend on engine.ts starting data
function clearAll() {
    for (const k of Object.keys(orderbook)) delete orderbook[k];
    orderbook["AXIS"] = { asks: {}, bids: {} };
    for (const k of Object.keys(balance)) delete balance[Number(k)];
}

function setupInitial() {
    clearAll();
    // user 1: 30000 total, 10000 locked (20000 free), AXIS 10 total, 5 locked (5 free)
    balance[1] = { totalBalance: 30000, lockedBalance: 10000, stocks: { AXIS: { total: 10, locked: 5 } } };
}

function resetState() {
    clearAll();
    balance[1] = { totalBalance: 30000, lockedBalance: 0, stocks: {} };   // buyer
    balance[2] = { totalBalance: 0, lockedBalance: 0,
                   stocks: { AXIS: { total: 10, locked: 10 } } };          // seller
}

// user 1 = buyer (waits in the book), user 2 = incoming seller (nothing locked)
function resetSellState() {
    resetState();
    balance[2].stocks["AXIS"].locked = 0;
}

let r: any;
let c: any;
let cr: any;
let before: string;

// ====================== getBestPrice ======================
setupInitial();
check("empty book", getBestPrice("AXIS"), { bestAsks: null, bestBids: null });

addToBook("AXIS", "asks", 300, mk(1));
check("only asks", getBestPrice("AXIS"), { bestAsks: 300, bestBids: null });

addToBook("AXIS", "asks", 305, mk(2));
addToBook("AXIS", "asks", 299, mk(3));
check("lowest ask wins", getBestPrice("AXIS"), { bestAsks: 299, bestBids: null });

addToBook("AXIS", "bids", 290, mk(4));
addToBook("AXIS", "bids", 295, mk(5));
check("highest bid wins", getBestPrice("AXIS"), { bestAsks: 299, bestBids: 295 });

check("symbol not found", getBestPrice("TATA"), undefined);

// ====================== canPlaceOrder ======================
setupInitial();
check("buy, enough money",      canPlaceOrder(1, "bids", "AXIS", 3000),  true);
check("buy, exactly enough",    canPlaceOrder(1, "bids", "AXIS", 20000), true);
check("buy, 1 rupee short",     canPlaceOrder(1, "bids", "AXIS", 20001), false);
check("sell, enough stock",     canPlaceOrder(1, "asks", "AXIS", 5),     true);
check("sell, 1 share short",    canPlaceOrder(1, "asks", "AXIS", 6),     false);
check("sell, symbol not owned", canPlaceOrder(1, "asks", "TATA", 1),     false);
check("buy, user missing",      canPlaceOrder(99, "bids", "AXIS", 100),  false);
check("sell, user missing",     canPlaceOrder(99, "asks", "AXIS", 1),    false);

// ====================== matchBuyOrder ======================
// Test 1: exact match
resetState();
addToBook("AXIS", "asks", 300, sell(100, 5));
matchBuyOrder("AXIS", 5, 300, 1);
check("T1 asks empty",     Object.keys(A().asks), []);
check("T1 buyer money",    balance[1].totalBalance, 28500);
check("T1 buyer stock",    balance[1].stocks["AXIS"], { total: 5, locked: 0 });
check("T1 seller money",   balance[2].totalBalance, 1500);
check("T1 seller stock",   balance[2].stocks["AXIS"], { total: 5, locked: 5 });

// Test 2: seller partly filled
resetState();
addToBook("AXIS", "asks", 300, sell(100, 5));
matchBuyOrder("AXIS", 3, 300, 1);
check("T2 level qty",      A().asks[300]?.totalQty, 2);
check("T2 seller filled",  A().asks[300]?.Orders[0].filledQty, 3);
check("T2 buyer stock",    balance[1].stocks["AXIS"]?.total, 3);
check("T2 seller money",   balance[2].totalBalance, 900);

// Test 3: two price levels
resetState();
addToBook("AXIS", "asks", 299, sell(100, 5));
addToBook("AXIS", "asks", 300, sell(101, 5));
matchBuyOrder("AXIS", 8, 300, 1);
check("T3 levels left",    Object.keys(A().asks), ["300"]);
check("T3 level qty",      A().asks[300]?.totalQty, 2);
check("T3 buyer money",    balance[1].totalBalance, 27605);   // 5*299 + 3*300 = 2395
check("T3 seller money",   balance[2].totalBalance, 2395);
check("T3 buyer stock",    balance[1].stocks["AXIS"]?.total, 8);

// Test 4: no match, whole order goes to bids
resetState();
addToBook("AXIS", "asks", 299, sell(100, 5));
matchBuyOrder("AXIS", 5, 290, 1);
check("T4 ask untouched",  A().asks[299]?.totalQty, 5);
check("T4 bid created",    A().bids[290]?.totalQty, 5);
check("T4 bid owner",      A().bids[290]?.Orders[0].userId, 1);
check("T4 money same",     balance[1].totalBalance, 30000);

// Test 5: partial fill, leftover rests in bids
resetState();
addToBook("AXIS", "asks", 300, sell(100, 4));
matchBuyOrder("AXIS", 10, 300, 1);
check("T5 asks empty",     Object.keys(A().asks), []);
check("T5 bid qty",        A().bids[300]?.totalQty, 6);
check("T5 bid filledQty",  A().bids[300]?.Orders[0].filledQty, 4);
check("T5 buyer stock",    balance[1].stocks["AXIS"]?.total, 4);
check("T5 buyer money",    balance[1].totalBalance, 28800);

// ---------- extra lock checks for matchBuyOrder ----------
resetState();
addToBook("AXIS", "asks", 299, sell(100, 5));
matchBuyOrder("AXIS", 5, 290, 1);
check("B4 buyer money locked", balance[1].lockedBalance, 1450);      // 5 * 290

resetState();
addToBook("AXIS", "asks", 300, sell(100, 4));
matchBuyOrder("AXIS", 10, 300, 1);
check("B5 buyer money locked", balance[1].lockedBalance, 1800);      // 6 left * 300

// ====================== matchAskOrder ======================
// S1: exact match
resetSellState();
matchBuyOrder("AXIS", 5, 300, 1);                 // bid goes in the book, locks money
check("S1 bid locked money", balance[1].lockedBalance, 1500);
matchAskOrder("AXIS", 5, 300, 2);
check("S1 bids empty",     Object.keys(A().bids), []);
check("S1 buyer money",    balance[1].totalBalance, 28500);
check("S1 buyer locked",   balance[1].lockedBalance, 0);
check("S1 buyer stock",    balance[1].stocks["AXIS"], { total: 5, locked: 0 });
check("S1 seller money",   balance[2].totalBalance, 1500);
check("S1 seller stock",   balance[2].stocks["AXIS"], { total: 5, locked: 0 });

// S2: bid partly filled
resetSellState();
matchBuyOrder("AXIS", 5, 300, 1);
matchAskOrder("AXIS", 3, 300, 2);
check("S2 level qty",      A().bids[300]?.totalQty, 2);
check("S2 bid filledQty",  A().bids[300]?.Orders[0].filledQty, 3);
check("S2 buyer money",    balance[1].totalBalance, 29100);
check("S2 buyer locked",   balance[1].lockedBalance, 600);
check("S2 buyer stock",    balance[1].stocks["AXIS"]?.total, 3);
check("S2 seller money",   balance[2].totalBalance, 900);
check("S2 seller stock",   balance[2].stocks["AXIS"], { total: 7, locked: 0 });

// S3: two price levels (best bid 301 trades first)
resetSellState();
matchBuyOrder("AXIS", 5, 301, 1);
matchBuyOrder("AXIS", 5, 300, 1);
matchAskOrder("AXIS", 8, 300, 2);
check("S3 levels left",    Object.keys(A().bids), ["300"]);
check("S3 level qty",      A().bids[300]?.totalQty, 2);
check("S3 seller money",   balance[2].totalBalance, 2405);    // 5*301 + 3*300
check("S3 seller stock",   balance[2].stocks["AXIS"], { total: 2, locked: 0 });
check("S3 buyer money",    balance[1].totalBalance, 27595);
check("S3 buyer locked",   balance[1].lockedBalance, 600);
check("S3 buyer stock",    balance[1].stocks["AXIS"]?.total, 8);

// S4: no match, whole order goes to asks and the stock gets locked
resetSellState();
matchBuyOrder("AXIS", 5, 290, 1);
matchAskOrder("AXIS", 5, 295, 2);
check("S4 bid untouched",  A().bids[290]?.totalQty, 5);
check("S4 ask created",    A().asks[295]?.totalQty, 5);
check("S4 seller stock locked", balance[2].stocks["AXIS"], { total: 10, locked: 5 });
check("S4 seller money untouched", balance[2].lockedBalance, 0);   // catches the lockedBalance bug
check("S4 buyer money",    balance[1].totalBalance, 30000);
check("S4 buyer locked",   balance[1].lockedBalance, 1450);

// S5: partial fill, leftover rests in asks
resetSellState();
matchBuyOrder("AXIS", 4, 300, 1);
matchAskOrder("AXIS", 10, 300, 2);
check("S5 ask qty",        A().asks[300]?.totalQty, 6);
check("S5 ask filledQty",  A().asks[300]?.Orders[0].filledQty, 4);
check("S5 seller money",   balance[2].totalBalance, 1200);
check("S5 seller stock",   balance[2].stocks["AXIS"], { total: 6, locked: 6 });
check("S5 buyer money",    balance[1].totalBalance, 28800);
check("S5 buyer locked",   balance[1].lockedBalance, 0);
check("S5 buyer stock",    balance[1].stocks["AXIS"]?.total, 4);

// ====================== self-trade ======================
// A: user 1 bids, then user 1 asks at the same price
resetSellState();
balance[1].stocks["AXIS"] = { total: 10, locked: 0 };
matchBuyOrder("AXIS", 5, 300, 1);
const selfA = matchAskOrder("AXIS", 5, 300, 1);
check("SA status",        selfA.status, "cancelled");
check("SA filled",        selfA.filled, 0);
check("SA bid untouched", A().bids[300]?.totalQty, 5);
check("SA bid filledQty", A().bids[300]?.Orders[0].filledQty, 0);
check("SA no asks",       Object.keys(A().asks), []);
check("SA user1 money",   [balance[1].totalBalance, balance[1].lockedBalance], [30000, 1500]);
check("SA user1 stock",   balance[1].stocks["AXIS"], { total: 10, locked: 0 });

// B: another user's order trades first, then the loop stops at the user's own order
resetSellState();
balance[1].stocks["AXIS"] = { total: 10, locked: 0 };
balance[2].totalBalance = 30000;
matchBuyOrder("AXIS", 3, 300, 2);            // queue at 300: user 2 first
matchBuyOrder("AXIS", 5, 300, 1);            // then user 1
const selfB = matchAskOrder("AXIS", 8, 300, 1);
check("SB status",        selfB.status, "cancelled");
check("SB filled",        selfB.filled, 3);
check("SB level qty",     A().bids[300]?.totalQty, 5);
check("SB front order",   A().bids[300]?.Orders[0].userId, 1);
check("SB user1",         [balance[1].totalBalance, balance[1].stocks["AXIS"].total], [30900, 7]);
check("SB user2 money",   [balance[2].totalBalance, balance[2].lockedBalance], [29100, 0]);
check("SB user2 stock",   balance[2].stocks["AXIS"], { total: 13, locked: 0 });   // had 10, got 3
check("SB no asks",       Object.keys(A().asks), []);

// C: mirror, user 1 asks, then user 1 bids
resetSellState();
balance[1].stocks["AXIS"] = { total: 10, locked: 0 };
matchAskOrder("AXIS", 5, 300, 1);
const selfC = matchBuyOrder("AXIS", 5, 300, 1);
check("SC status",        selfC.status, "cancelled");
check("SC ask untouched", [A().asks[300]?.totalQty, A().asks[300]?.Orders[0].filledQty], [5, 0]);
check("SC no bids",       Object.keys(A().bids), []);
check("SC user1",         [balance[1].totalBalance, balance[1].lockedBalance], [30000, 0]);
check("SC user1 stock",   balance[1].stocks["AXIS"], { total: 10, locked: 5 });

// ====================== placeOrder ======================
// P1: buy matches an ask
resetState();
addToBook("AXIS", "asks", 300, sell(100, 5));
r = R(placeOrder("AXIS", 1, 5, 300, "bids"));
check("P1 ok/status",     [r.ok, r.status, r.filled], [true, "filled", 5]);
check("P1 has orderId",   typeof r.orderId, "number");
check("P1 buyer money",   balance[1].totalBalance, 28500);

// P2: buy with no match
resetState();
r = R(placeOrder("AXIS", 1, 5, 290, "bids"));
check("P2 status",        [r.status, r.filled], ["open", 0]);
check("P2 locked",        balance[1].lockedBalance, 1450);
check("P2 bid in book",   A().bids[290]?.totalQty, 5);

// P3: partial fill
resetState();
addToBook("AXIS", "asks", 300, sell(100, 4));
r = R(placeOrder("AXIS", 1, 10, 300, "bids"));
check("P3 status",        [r.status, r.filled], ["partial", 4]);
check("P3 locked",        balance[1].lockedBalance, 1800);

// P4: not enough money (5 * 300 = 1500 > 1000; "quantity alone" would have passed)
resetState();
balance[1].totalBalance = 1000;
before = snap();
r = R(placeOrder("AXIS", 1, 5, 300, "bids"));
check("P4 rejected",      r.ok, false);
check("P4 nothing changed", snap(), before);

// P5: not enough stock to sell
resetSellState();
before = snap();
r = R(placeOrder("AXIS", 2, 11, 300, "asks"));
check("P5 rejected",      r.ok, false);
check("P5 nothing changed", snap(), before);

// P6: unknown user
resetState();
before = snap();
r = R(placeOrder("AXIS", 99, 1, 300, "bids"));
check("P6 rejected",      r.ok, false);
check("P6 nothing changed", snap(), before);

// P7: bad input
resetState();
before = snap();
check("P7 qty 0",         R(placeOrder("AXIS", 1, 0, 300, "bids")).ok, false);
check("P7 qty -1",        R(placeOrder("AXIS", 1, -1, 300, "bids")).ok, false);
check("P7 qty too big",   R(placeOrder("AXIS", 1, 100001, 300, "bids")).ok, false);
check("P7 price 1.5",     R(placeOrder("AXIS", 1, 5, 1.5, "bids")).ok, false);
check("P7 price too big", R(placeOrder("AXIS", 1, 5, 1000001, "bids")).ok, false);
check("P7 bad symbol",    R(placeOrder("ZZZ", 1, 5, 300, "bids")).ok, false);
check("P7 nothing changed", snap(), before);
check("P7 no ZZZ market", "ZZZ" in orderbook, false);

// P8: order ids are unique
resetState();
const o1 = R(placeOrder("AXIS", 1, 1, 290, "bids"));
const o2 = R(placeOrder("AXIS", 1, 1, 289, "bids"));
check("P8 ids differ",    o2.orderId === o1.orderId + 1, true);

// P9: self-trade through placeOrder
resetSellState();
balance[2].totalBalance = 5000;
placeOrder("AXIS", 2, 5, 300, "asks");
r = R(placeOrder("AXIS", 2, 5, 300, "bids"));
check("P9 cancelled",     [r.ok, r.status, r.filled], [true, "cancelled", 0]);

// ====================== cancelOrder ======================
// C1: cancel an open bid
resetState();
c = R(placeOrder("AXIS", 1, 5, 290, "bids"));              // locks 1450
cr = R(cancelOrder("AXIS", 1, c.orderId));
check("C1 result",        [cr.ok, cr.cancelledQty], [true, 5]);
check("C1 level gone",    Object.keys(A().bids), []);
check("C1 money",         [balance[1].totalBalance, balance[1].lockedBalance], [30000, 0]);

// C2: cancel an open ask
resetSellState();
c = R(placeOrder("AXIS", 2, 5, 300, "asks"));
check("C2 locked before", balance[2].stocks["AXIS"], { total: 10, locked: 5 });
cr = R(cancelOrder("AXIS", 2, c.orderId));
check("C2 result",        [cr.ok, cr.cancelledQty], [true, 5]);
check("C2 level gone",    Object.keys(A().asks), []);
check("C2 stock",         balance[2].stocks["AXIS"], { total: 10, locked: 0 });

// C3: partly filled bid, only the remaining part is cancelled
resetSellState();
c = R(placeOrder("AXIS", 1, 5, 300, "bids"));               // locks 1500
placeOrder("AXIS", 2, 2, 300, "asks");                      // 2 shares trade at 300
cr = R(cancelOrder("AXIS", 1, c.orderId));
check("C3 cancelledQty",  cr.cancelledQty, 3);
check("C3 level gone",    Object.keys(A().bids), []);
check("C3 buyer",         [balance[1].totalBalance, balance[1].lockedBalance, balance[1].stocks["AXIS"].total], [29400, 0, 2]);

// C4: cancel someone else's order
resetSellState();
c = R(placeOrder("AXIS", 1, 5, 290, "bids"));
before = snap();
cr = R(cancelOrder("AXIS", 2, c.orderId));
check("C4 rejected",      cr.ok, false);
check("C4 same reason as unknown", cr.reason, "order not found");
check("C4 nothing changed", snap(), before);

// C5: unknown order id
resetState();
before = snap();
cr = R(cancelOrder("AXIS", 1, 999999));
check("C5 rejected",      [cr.ok, cr.reason], [false, "order not found"]);
check("C5 nothing changed", snap(), before);

// C6: cancel the same order twice
resetState();
c = R(placeOrder("AXIS", 1, 5, 290, "bids"));
cancelOrder("AXIS", 1, c.orderId);
before = snap();
cr = R(cancelOrder("AXIS", 1, c.orderId));
check("C6 second cancel fails", cr.ok, false);
check("C6 nothing changed", snap(), before);

// C7: cancel an order from the middle of a queue
resetState();
balance[2].totalBalance = 30000;
const qa = R(placeOrder("AXIS", 1, 2, 300, "bids"));
const qb = R(placeOrder("AXIS", 2, 3, 300, "bids"));
const qc = R(placeOrder("AXIS", 1, 4, 300, "bids"));
cancelOrder("AXIS", 2, qb.orderId);
check("C7 level qty",     A().bids[300]?.totalQty, 6);
check("C7 queue order",   A().bids[300]?.Orders.map(o => o.orderId), [qa.orderId, qc.orderId]);
check("C7 user2 unlocked", balance[2].lockedBalance, 0);
check("C7 user1 still locked", balance[1].lockedBalance, 1800);

// C8: cancelling the only order at a level moves the best price
resetSellState();
const a1 = R(placeOrder("AXIS", 2, 5, 299, "asks"));
placeOrder("AXIS", 2, 5, 300, "asks");
cancelOrder("AXIS", 2, a1.orderId);
check("C8 best ask moved", getBestPrice("AXIS")?.bestAsks, 300);
check("C8 stock",         balance[2].stocks["AXIS"], { total: 10, locked: 5 });

// C9: a symbol with no book must not crash
resetState();
before = snap();
cr = R(cancelOrder("TATA", 1, 1));
check("C9 no crash, rejected", cr.ok, false);
check("C9 nothing changed", snap(), before);

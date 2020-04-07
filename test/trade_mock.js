console.log("------- start market -------");

const fs = require('fs');
const request = require("request");


const options = {

    method: 'GET',
    url: 'https://api.upbit.com/v1/ticker',
    qs: { markets: 'KRW-XRP'},

};

let readObj ;

let Last_price = 0;
let Last_vol = 0;

let Initial_KRW_remain = 30000;
let KRW_remain = 30000; // call wallet remain KRW.
//let KRW_invest = 100*100; // fix invest see. part of KRW wallet.

let Holding_vol = 0;
//let Dealing_vol = 0.00001;

let Diff;

let Bought_KRW = 0;
let Bought_price = 0 // from db
let Sell_price = 0;

let real_hold = 0;
let fee = 0;

fs.readFile('bought_price_db_test.json', 'utf8', (err, data) => {

    if (err) console.log(err);

    readObj = JSON.parse(data);

    Bought_price = readObj.table[0].Bought_price;
});


//
const Buy = (_BTC1) => {

    Bought_price = _BTC1;
    // 980000 : 7000 = 1BTC : 7000/980000BTC
    Bought_KRW = KRW_remain;

    readObj.table.unshift({id: Date.now(), Bought_price: Bought_price });
    json = JSON.stringify(readObj);
    fs.writeFile('bought_price_db_test.json', json, 'utf8', (err) => {
        console.log(err)
    });

    real_hold = Math.floor(Bought_KRW/Bought_price*1000)/1000;

    fee = Bought_KRW * 0.0005;
    console.log(` $$ fee : ${fee} `);
    Bought_KRW = Bought_KRW * 0.9995;

    Holding_vol += Math.floor(Bought_KRW/Bought_price*1000)/1000;

    console.log(` --- Buy ${Bought_KRW} * ${Holding_vol} --- `);

    KRW_remain = 0;

    Diff = KRW_remain - Initial_KRW_remain;

    console.log(` ===== remain: ${KRW_remain} | hold: ${Holding_vol} | diff: ${Diff} ====== `);

}


//
const Sell = (_BTC1) => {

    console.log(` +++ Sell ${_BTC1} * ${Holding_vol} +++ `);

    KRW_remain += _BTC1 * Holding_vol - (_BTC1*Holding_vol*0.0005);

    fee = _BTC1*Holding_vol*0.0005;
    console.log(` $$ fee : ${fee}`);

    Diff = KRW_remain - Initial_KRW_remain;

    Holding_vol = 0;

    console.log(` ===== remain: ${KRW_remain} | hold: ${Holding_vol} | diff: ${Diff} ====== `);

}


const test_Sell = (_Present_price) => {

    console.log(` ### check test`)

    console.log(`testing >>> ${Bought_price*Holding_vol*1.001 - _Present_price*0.995*Holding_vol*0.9995}`);
    return Bought_price*Holding_vol*1.001 < _Present_price*0.995*Holding_vol*0.9995 //Here control

}


let cycle = 0;
let BTC1 = 0;
let price_arr = [1,1,1,1];

setInterval( () => {

    request(options, (error, response, body) => {

        if( error )  throw new Error(error);

        let parsed_body = JSON.parse(body);
        let obj_body = parsed_body[0];

        console.log(` Cycle proceeding == ${cycle}`);

        let Present_vol = obj_body.trade_volume;
        let Present_price = obj_body.trade_price;

        if ( Last_price != Present_price && Last_vol != Present_vol ) {

            price_arr.shift();
            price_arr.push(Present_price);

            console.log(` --- event! ---`);
            console.log(Present_price);
            console.log(price_arr)

            Last_price = Present_price;
            Last_vol = Present_vol;

            BTC1 = Present_price;

            if ( Bought_price*0.999 > Present_price || Sell_price*0.99 > Present_price ) { //Here control

                if ( KRW_remain < 1000) {

                    console.log(' !!! remain can\'t afford !!! ');

                } else {

                    Buy(BTC1);

                }

            } else if ( Holding_vol != 0) {

                if ( test_Sell(Present_price) ) {
                    console.log(` ### test passed`)
                    Sell_price = Present_price;

                    Sell(BTC1);

                } else {

                    console.log(` ### this selling not recommended.. `);

                }
            }

        } else {
            console.log(`   ... waiting ...   `)
        }

    })

    cycle++;

}, 600)


process.on('SIGINT', () => {

  process.exit(1);

});

console.log("------- start market -------");

const fs = require('fs');
const request = require('request');
const uuidv4 = require("uuid/v4");
const crypto = require('crypto');
const sign = require('jsonwebtoken').sign;
const queryEncode = require("querystring").encode;

const access_key = 'YOUR_ACCESS_KEY';
const secret_key = 'YOUR_SECRET_KEY';
const server_url = 'https://api.upbit.com';

let Last_price = 0; // api call
let Last_vol = 0; // api call

let Initial_KRW_remain = 420000; // direct recog.
let KRW_remain = 0; // api call
let Holding_vol = 0; // api call
let Diff;

let Bought_KRW = 0;
let Bought_price = 0; // from db
let Sell_price = 0; // from db
let Up_cnt = 0;
let Down_cnt = 0;

let readObj ;
fs.readFile('bought_price_db.json', 'utf8', (err, data) => {

    if (err) console.log(err);

    readObj = JSON.parse(data);

    Bought_price = readObj.table[0].Bought_price;
    Sell_price = readObj.table[0].Sell_price;
});

const payload = {
    access_key: access_key,
    nonce: uuidv4(),
};


const token = sign(payload, secret_key);


const acc_options = {

    method: "GET",
    url: server_url + "/v1/accounts",
    headers: {Authorization: `Bearer ${token}`},

};


const tick_options = {

  	method: 'GET',
	  url: 'https://api.upbit.com/v1/ticker',
	  qs: { markets: 'KRW-XRP'},

};



const Buy = (_CRT1) => {

	Bought_price = Math.floor(_CRT1*1.005); //control

    // write this Bought price to db
    readObj.table.unshift( { id: Date.now(), Bought_price: Bought_price, Sell_price: Sell_price } );
    json = JSON.stringify(readObj); // how to prettify?
    fs.writeFile('bought_price_db.json', json, 'utf8', (err) => {
        console.log(err)
    });

    Bought_KRW = KRW_remain * 0.9995; // fee
    let volume_bidding = Bought_KRW/Bought_price

    console.log(`  --- Buy ${Bought_price} * ${volume_bidding} ---  `);

	const bid_body = {
		market: 'KRW-XRP',
		side: 'bid',
		volume: JSON.stringify(volume_bidding),
		price: JSON.stringify(Bought_price),
		ord_type: 'limit',
	};

	const query = queryEncode(bid_body);

	const hash = crypto.createHash('sha512');
	const queryHash = hash.update(query, 'utf-8').digest('hex');

	const payload = {
		access_key: access_key,
		nonce: uuidv4(),
		query_hash: queryHash,
		query_hash_alg: 'SHA512',
	};

	const token = sign(payload, secret_key);

	const options = {
        method: "POST",
        url: server_url + "/v1/orders",
        headers: {Authorization: `Bearer ${token}`},
        json: bid_body
    }

    request(options, (error, response, body) => {

		//if (error) throw new Error(error);

		console.log(body);

	});

    Up_cnt = 0;
    Down_cnt = 0;

};


const Sell = (_CRT1) => {

    console.log(`  +++ Sell ${_CRT1} * ${Holding_vol} +++  `);

    Sell_price = _CRT1;
    // write this Sell price to db
    readObj.table.unshift( { id: Date.now(), Bought_price: Bought_price, Sell_price: Sell_price } );
    json = JSON.stringify(readObj); // how to prettify?
    fs.writeFile('bought_price_db.json', json, 'utf8', (err) => {
        console.log(err)
    });

    const ask_body = {
        market: 'KRW-XRP',
        side: 'ask',
        volume: JSON.stringify(Holding_vol),
        price: null,
        ord_type: 'market',
    }

    const query = queryEncode(ask_body)

    const hash = crypto.createHash('sha512')
    const queryHash = hash.update(query, 'utf-8').digest('hex')

    const payload = {
        access_key: access_key,
        nonce: uuidv4(),
        query_hash: queryHash,
        query_hash_alg: 'SHA512',
    }

    const token = sign(payload, secret_key)

    const options = {
        method: "POST",
        url: server_url + "/v1/orders",
        headers: {Authorization: `Bearer ${token}`},
        json: ask_body
    }

    request(options, (error, response, body) => {

        //if (error) throw new Error(error)

        console.log(body);

    })

    Up_cnt = 0;
    Down_cnt = 0;

};


const test_Sell = (_Present_price) => {

    console.log(`  ### check test `)

    console.log(`  >>> testing >>> ${Bought_price*Holding_vol*1.01 - _Present_price*0.995*Holding_vol*0.9995}`);
    return Bought_price*Holding_vol*1.01 < _Present_price*0.995*Holding_vol*0.9995 //Here control
    // 0.00051
}


let cycle = 0;
let CRT1 = 0;

// loop : keep going like server
setInterval( () => {

    // request about Wallet : KRW_remain, Crypto remain, etc
    request(acc_options, (error, response, body) => {

        if (error) throw new Error(error)

        let parsed_body = JSON.parse(body);
        let obj_body = parsed_body;

        for (let i in obj_body) {

            if (obj_body[i].currency == 'KRW') {

                KRW_remain = parseFloat(obj_body[i].balance);
                Diff = KRW_remain - Initial_KRW_remain;

            } else if ( obj_body[i].currency == 'XRP') {

                Holding_vol = parseFloat(obj_body[i].balance);

            }

        }

    });

    // request present market price(like reload) but it's not trading price
	request(tick_options, (error, response, body) => {

		if( error )  throw new Error(error);

		let parsed_body = JSON.parse(body);
		let obj_body = parsed_body[0];

		let Present_vol = obj_body.trade_volume;
		let Present_price = obj_body.trade_price;

		if ( Last_price != Present_price && Last_vol != Present_vol ) {

            console.log(` Cycle proceeding == ${cycle}`);
			console.log(`\n --- event! ---`);
			console.log(Present_price);
            console.log(` == remain: ${KRW_remain} | hold: ${Holding_vol} | diff: ${Diff} == `);

            // case : tracking trend
            if ( Last_price !=0 && Last_price < Present_price ) {
                Up_cnt += 1;
                Down_cnt -= 1;
                if (Down_cnt < 0) Down_cnt = 0;
            } else if ( Last_price !=0 && Last_price > Present_price ) {
                Down_cnt += 1;
                Up_cnt -= 1;
                if (Up_cnt < 0) Up_cnt = 0;
            }
            
            if ( Up_cnt>7 && Down_cnt>7 ) {
                Up_cnt -= 5;
                Down_cnt -= 5;
            }

			Last_price = Present_price;
			Last_vol = Present_vol;
			CRT1 = Present_price;

            // case : db error
            if ( Bought_price == 0 ) {
                Bought_price = Present_price;
            }

            console.log(`Up : ${Up_cnt}, Down : ${Down_cnt}`);

            // Buy condition check
			if (Down_cnt > 10 ) {
                // Sell_price*0.99 > Present_price || Top_price*0.98 > Present_price
				if ( KRW_remain < 500 ) {

					console.log(' !!! remain can\'t afford !!! ');

				} else {

					Buy(CRT1);

				}
            // Sell condition check
			} else if ( Holding_vol != 0 && Up_cnt > 8) {

				if ( test_Sell(Present_price) ) {

					console.log(` ### test passed`);

					Sell(CRT1);

				} else {

					console.log(` ### this selling not recommended.. `);

				}
			}
            cycle++;
		}

	})

}, 600);

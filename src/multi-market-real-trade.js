const request = require("request");
const uuidv4 = require("uuid/v4");
const crypto = require('crypto');
const sign = require('jsonwebtoken').sign;
const queryEncode = require("querystring").encode;

console.log(" --------- start market ---------- ");

let account = {
    KRW_remain : 0,
    Holding_vol : [], // holding_vol
}

const access_key = 'YOUR_ACCESS_KEY';
const secret_key = 'YOUR_SECRET_KEY';
const server_url = 'https://api.upbit.com';

const payload = {
    access_key: access_key,
    nonce: uuidv4(),
};

const token = sign(payload, secret_key);

let market_code = [];
let market_code_str = '';
let price_arr = [];
let Last_price = [];
let Last_vol = [];
let up_cnt = [];
let down_cnt = [];

const buy = (code, market, price, diff) => {

    let diffStr = diff.toString();
    if (diffStr.search('5') < 0) {
        diffStr = diffStr.replace(/[2-9]/,"1");
    }
    let bought_price = price + Number(diffStr);
   
    let bought_krw = Math.trunc(account.KRW_remain * 0.9995);
    account.KRW_remain = 0;
    let volume_bidding = bought_krw/bought_price;

    console.log(`  ---- Buy ${market} : ${bought_price} * ${volume_bidding} ----  `);
    if(account.Holding_vol[code].vol == undefined || account.Holding_vol[code].vol == NaN || account.Holding_vol[code].vol == null) {
        account.Holding_vol[code].vol = 0;
    }

    const bid_body = {
		market: '',
		side: 'bid',
		volume: JSON.stringify(volume_bidding),
		price: JSON.stringify(bought_price),
		ord_type: 'limit',
    };
    bid_body.market = market;
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
		if (body.hasOwnProperty('error') != true) {
            account.Holding_vol[code].vol += volume_bidding;
            price_arr[code].up_cnt = up_cnt[code] = 0;
            price_arr[code].down_cnt = down_cnt[code] = 0;
        } 
		console.log(body);
	});

}

const sell = (code, market, price, diff) => {

    let diffStr = diff.toString();
    if (diffStr.search('5') < 0) {
        diffStr = diffStr.replace(/[2-9]/,"1");
    }
    price = price - Number(diffStr);

    //account.KRW_remain += Math.trunc((account.Holding_vol[code] * price) * 0.9995);
    console.log(`  ++++ Sell ${market} : ${account.Holding_vol[code].vol} * ${price} ++++  `);
    
    let volume_bidding = account.Holding_vol[code].vol;
    
    const ask_body = {
        market: '',
        side: 'ask',
        volume: JSON.stringify(volume_bidding),
        price: null,
        ord_type: 'market',
    }
    ask_body.market = market;
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
        if (body.hasOwnProperty('error') != true) {
            account.Holding_vol[code].vol = 0;
            price_arr[code].up_cnt = up_cnt[code] = 0;
            price_arr[code].down_cnt = down_cnt[code] = 0;
        }
        console.log(body);
    })
}

function req_code () {
    let market_options = {
        method: 'GET', 
        url: 'https://api.upbit.com/v1/market/all'
    };

    request(market_options, (error, response, body) => {
        if (error) throw new Error(error);
        let parsed_body = JSON.parse(body);
        let i = 0;
        while(parsed_body[i] != null) {

            let tempStr = parsed_body[i].market;
            let rgx = /BTC-|USDT-/;
            found = tempStr.match(rgx);

            if (found == null) {
                market_code.push(tempStr);
                account.Holding_vol.push({
                   market : tempStr,
                   vol :0,
                })
                market_code_str += `${tempStr},`
            }
            i++;
        }
        market_code_str = market_code_str.replace(/,\s*$/, "");
    });
}

function cycle() {
    setInterval( () => {

        const acc_options = {
            method: "GET",
            url: server_url + "/v1/accounts",
            headers: {Authorization: `Bearer ${token}`},
        };

        request(acc_options, (error, response, body) => {
            if (error) throw new Error(error)
            let parsed_body = JSON.parse(body);
            let obj_body = parsed_body;
            for (let i in obj_body) {
                if (obj_body[i].currency == 'KRW') {
                    account.KRW_remain = parseFloat(obj_body[i].balance);
                } else {
                    for (let n = 0; n<account.Holding_vol.length; n++) {
                        if(account.Holding_vol[n].market.slice(4) == obj_body[i].currency) {
                            account.Holding_vol[n].vol = parseFloat(obj_body[i].balance);
                        }
                    }
                }
            }
        });

        

        let tick_options = { 
            method: 'GET',
            url: 'https://api.upbit.com/v1/ticker',
            qs: { markets: '' } 
        };

        tick_options.qs.markets = market_code_str;

        request(tick_options, (error, response, body) => {
            if (error) throw new Error(error);
            let parsed_body = JSON.parse(body);

            for( let k = 0 ; k < parsed_body.length ; k++) {
                let obj_body = parsed_body[k];
                let Present_vol = obj_body.trade_volume;
                let Present_price = obj_body.trade_price;
                let differ;
                
		        if ( Last_price[k] != Present_price && Last_vol[k] != Present_vol ) {

                    if(up_cnt[k] == undefined || down_cnt[k] == undefined) {
                        up_cnt[k] = 0;
                        down_cnt[k] = 0;
                    }

                    if ( Last_price[k] !=0 && Last_price[k] < Present_price ) {
                        up_cnt[k] += 1;
                        down_cnt[k] -= 1;
                        if (down_cnt[k] < 0) down_cnt[k] = 0;
                    } else if ( Last_price[k] !=0 && Last_price[k] > Present_price ) {
                        down_cnt[k] += 1;
                        up_cnt[k] -= 1;
                        if (up_cnt[k] < 0) up_cnt[k] = 0;
                    }
                    
                    if ( up_cnt[k]>10 && down_cnt[k]>10 ) {
                        up_cnt[k] -= 6;
                        down_cnt[k] -= 6;
                    }

                    differ = Number(Math.round(Math.abs(Present_price - Last_price[k])+'e2')+'e-2');
                    Last_price[k] = Present_price;
                    Last_vol[k] = Present_vol;
                    
                    price_arr[k] = {
                        code : obj_body.market,
                        last_price : Last_price,
                        present_price : Present_price,
                        up_cnt : up_cnt[k],
                        down_cnt : down_cnt[k],
                    }

                    console.log(`${obj_body.market} = price: ${Present_price} / up: ${price_arr[k].up_cnt} down: ${price_arr[k].down_cnt}`);

                    if (price_arr[k].up_cnt - price_arr[k].down_cnt >= 5 &&
                        account.KRW_remain > 1 &&
                        account.KRW_remain > differ) {
                        buy(k, obj_body.market, price_arr[k].present_price, differ);
                    } else if ((price_arr[k].up_cnt - price_arr[k].down_cnt >= 10 || 
                                price_arr[k].down_cnt - price_arr[k].up_cnt >= 10) && 
                                account.Holding_vol[k].vol != null &&
                                account.Holding_vol[k].vol != undefined &&
                                account.Holding_vol[k].vol != 0 ) {
                        sell(k, obj_body.market, price_arr[k].present_price, differ);
                    }
                    /*for (let n = 0; n<price_arr.length; n++) {
                        if(price_arr[n].code == obj_body.market == price_arr[k].code) {
                            
                            break;
                        }
                    }*/
                }
            }

            console.log(`     $remain :  ${account.KRW_remain}  `);

        });

    }, 300)
}

req_code();

setTimeout(cycle, 600);

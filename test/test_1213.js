const request = require("request");

console.log(" --------- start market ---------- ");

let account = {
    KRW_remain : 500000,
    Holding_vol : [], // holding_vol
}

let market_code = [];
let market_code_str = '';
let price_arr = [];
let Last_price = [];
let Last_vol = [];
let up_cnt = [];
let down_cnt = [];

const buy = (code, market, price, diff) => {

    let diffStr = diff.toString();
    diffStr = diffStr.replace(/[2-9]/,"1");
    let bought_price = price + Number(diffStr);
    
    let bought_krw = Math.trunc(account.KRW_remain * 0.9995);
    account.KRW_remain = 0;
    let volume_bidding = bought_krw/bought_price;

    console.log(`  ---- Buy ${market} : ${bought_price} * ${volume_bidding} ----  `);
    console.log(`     $remain :  ${account.KRW_remain}  `);
    if(account.Holding_vol[code] == undefined || account.Holding_vol[code] == NaN || account.Holding_vol[code] ==null) {
        account.Holding_vol[code] = 0;
    }

    account.Holding_vol[code] += volume_bidding;
    price_arr[code].up_cnt = up_cnt[code] = 0;
    price_arr[code].down_cnt = down_cnt[code] = 0;

}

const sell = (code, market, price, diff) => {

    let diffStr = diff.toString();
    diffStr = diffStr.replace(/[2-9]/,"1");
    price = price - Number(diffStr);

    account.KRW_remain += Math.trunc((account.Holding_vol[code] * price) * 0.9995);
    console.log(`  ++++ Sell ${market} : ${account.Holding_vol[code]} * ${price} ++++  `);
    console.log(`     $remain :  ${account.KRW_remain} <<  `);
    account.Holding_vol[code] = 0;

    price_arr[code].up_cnt = up_cnt[code] = 0;
    price_arr[code].down_cnt = down_cnt[code] = 0;
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
                market_code_str += `${tempStr},`
            }
            
            i++;
        }
        market_code_str = market_code_str.replace(/,\s*$/, "");
        //console.log(market_code_str)
    });
}

function cycle() {
    setInterval( () => {

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

                    differ = Math.abs(Present_price - Last_price[k]);
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

                    if (
                        price_arr[k].up_cnt - price_arr[k].down_cnt >= 2 &&
                        account.KRW_remain > 1
                        ) {

                        buy(k, obj_body.market, price_arr[k].present_price, differ);
                        

                    } else if (
                                (price_arr[k].up_cnt - price_arr[k].down_cnt >= 2 || 
                                price_arr[k].down_cnt - price_arr[k].up_cnt >= 2) && 
                                account.Holding_vol[k] != null &&
                                account.Holding_vol[k] != undefined &&
                                account.Holding_vol[k] != 0
                            
                        ) {

                        sell(k, obj_body.market, price_arr[k].present_price, differ);
                        

                    }
                }
            }

        });

    }, 300)
}

req_code();

setTimeout(cycle, 600);

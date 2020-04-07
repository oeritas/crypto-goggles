const request = require("request");

let market_code = [];
let market_code_str = '';

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

function req_price () {
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
            let Present_price = obj_body.trade_price;
            console.log(Present_price)
        }
    });
}

req_code();

setTimeout(req_price, 600);

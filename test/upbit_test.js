let request = require("request");

let options = {

    method: 'GET',
    url: 'https://api.upbit.com/v1/ticker',
    qs: { markets: 'KRW-BTC'},

};

let last_price = 0;
let last_vol = 0;

let cycle = 0;

setInterval( () => {
    request(options, (error, response, body) => {

        if( error )  throw new Error(error);

        let parsed_body = JSON.parse(body);
        let obj_body = parsed_body[0];

        cycle++;
        console.log(cycle)
        let present_vol = obj_body.trade_volume;
        let present_price = obj_body.trade_price;

        if ( last_price != present_price && last_vol != present_vol ) {

            console.log(` --- event! ---`);
            console.log(present_price);

            last_price = present_price;
            last_vol = present_vol;
        }

    })

}, 500)

// async too fast. 서버의 문제인가 async변수의 문제인가

process.on('SIGINT', () => {

  process.exit(1);

});

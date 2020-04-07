console.log("------- start market -------");

// later objection

let price_arr = [];
let initial_remain = 500000;

//let pocket_remain = 1;

let remain = 500000;

//let chance_money = 100*100;

let hold = 0;
let diff;
let day = 0;

let amount = 1;
let buy_price = 300;
let sell_price = 1;

let real_amount = 0;
let Up_cnt = 0;
let Down_cnt = 0;

//
const Buy = (price, amount) => {

    console.log(` --- Buy ${price} * ${amount} --- `);

    buy_price = price;

    remain = remain - price*amount - remain*0.0005;
    hold += amount;
    diff = remain - initial_remain;

    console.log(` ===== remain: ${remain} | hold: ${hold} | diff: ${diff} ====== `);
    Up_cnt = 0;
    Down_cnt = 0;
}


//
const Sell = (_price) => {

    remain += _price * hold - (_price*hold*0.0005);

    diff = remain - initial_remain;

    hold = 0;

    console.log(` ===== remain: ${remain} | hold: ${hold} | diff: ${diff} ====== `);
    Up_cnt = 0;
    Down_cnt = 0;
}


const test_Sell = (_price) => {

    console.log(` ### check test`)

    console.log(`testing >>> ${buy_price*hold*1.001 - _price*0.995*hold*0.9995}`);
    return buy_price*hold*1.001 < _price*0.995*hold*0.9995 //Here control

}


let price = Math.round(Math.random()*(300 - 250) + 250);
let last = price;
//Buy(price, remain*0.95/price);
buy_price = price;


setInterval(() => {

    let seed = 1;

    if ( Math.random() >= 0.5 ) {

        price += seed;

    } else {

        price -= seed;

        if ( price < 0 ) {
            price += 2*seed;
        }
    }

    price_arr.push(price);
    console.log(price);
    //console.log(price_arr);

    console.log(` Days proceeding == ${day}`);
    console.log(` ===== remain: ${remain} | hold: ${hold} | diff: ${diff} ====== `);

    if ( last < price ) {
        Up_cnt += 1;
        Down_cnt -= 1;
        if (Down_cnt < 0) Down_cnt = 0;
    }

    if ( last > price ) {
        Down_cnt += 1;
        Up_cnt -= 1;
        if (Up_cnt < 0) Up_cnt = 0;
    }

    if (Up_cnt>7 && Down_cnt>7) {
        Up_cnt -= 5;
        Down_cnt -= 5;
    }

    console.log(`Up : ${Up_cnt}, Down : ${Down_cnt}`);

    if ( Down_cnt > 7) {

        if (remain < 1000) {

            console.log(` !!! remain can't afford !!!`);

        } else {
            real_amount = Math.floor(remain/price *1000)/1000;
            amount = Math.floor(remain*0.9995/price *1000)/1000;

            //Math.round(num * 100) / 100

            Buy(price, amount);

        }

    } else if ( hold > 0 && Up_cnt > 8 ) {

        if ( test_Sell(price) ) {
            console.log(` ### test passed`)
            sell_price = price;

            console.log(` +++ Sell ${price} * ${hold} +++ `);
            Sell(price);

        } else {

            console.log(` ### this selling not recommended.. `);

        }

    } else {
        console.log(` && waiting.. `)
    }

    day++;

    if (remain > initial_remain*2) {
        console.log(` *** congrat!! *** `);
        process.exit(1);
    }

    last = price;
},300);


process.on('SIGINT', () => {

  process.exit(1);

});

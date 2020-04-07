const request = require('request')
const uuidv4 = require("uuid/v4")
const sign = require('jsonwebtoken').sign

const access_key = 'YOUr_ACCESS_KEY';
const secret_key = 'YOUR_SECRET_KEY';
const server_url = 'https://api.upbit.com';

const payload = {
    access_key: access_key,
    nonce: uuidv4(),
}

const token = sign(payload, secret_key)

const options = {
    method: "GET",
    url: server_url + "/v1/accounts",
    headers: {Authorization: `Bearer ${token}`},
}

request(options, (error, response, body) => {
    //console.log(error)
    //console.log(response)
    if (error) throw new Error(error)
    //console.log(body.includes('error'))
    console.log(body)
})

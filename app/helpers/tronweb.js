require('dotenv').config();
const TronWeb = require('tronweb');

const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_NODE || 'https://api.trongrid.io',
});

module.exports = tronWeb;

"use strict";

const SHOW = "SHOW_PRICE";
const UPDATE = "UPDATE_USD_PRICE";

let fs = require('fs');
let EventEmitter = require('events');

function readJsonFromFile(fileName) {
    let rawData = fs.readFileSync(fileName);
    return JSON.parse(rawData);
}

class CurrencyConverter extends EventEmitter {

    static calculateRates(usdPrices) {
        let rates = {};
        let usdMap = {};

        for (let o of usdPrices) {
            let sym = o['asset_id_quote'];
            let usdRate = parseFloat(o['rate']); // تحويل القيم إلى Float بدقة عالية
            rates[`USD-${sym}`] = usdRate;
            rates[`${sym}-USD`] = 1 / usdRate;
            usdMap[sym] = usdRate;
        }

        let symbols = Object.keys(usdMap);
        for (let from of symbols) {
            for (let to of symbols) {
                if (from !== to) {
                    let tag = `${from}-${to}`;
                    rates[tag] = parseFloat((usdMap[to] / usdMap[from]).toFixed(10)); // الحفاظ على دقة عالية في العمليات الحسابية
                    rates[`${to}-${from}`] = parseFloat((1 / rates[tag]).toFixed(10)); // التحديث العكسي بدقة صحيحة
                }
            }
        }
        return rates;
    }

    constructor(coin2USD) {
        super();
        this.rates = this.constructor.calculateRates(coin2USD.rates);

        this.on(SHOW, (o) => {
            console.log("SHOW event received.");
            console.log(o);
            const { from, to } = o;
            try {
                let rate = this.convert(1, from, to);
                console.log(`1 ${from} is worth ${rate} ${to}`);
            } catch (e) {
                console.error(e.message);
            }
        });

        this.on(UPDATE, (o) => {
            const { sym, usdPrice } = o;
            if (!sym || !usdPrice || usdPrice <= 0) {
                console.error("Invalid update parameters.");
                return;
            }
            console.log(`Updating ${sym} price to ${usdPrice} USD.`);
            this.rates[`USD-${sym}`] = parseFloat(usdPrice);
            this.rates[`${sym}-USD`] = parseFloat((1 / usdPrice).toFixed(10));

            const symbols = Object.keys(this.rates)
                .filter(key => key.startsWith('USD-'))
                .map(key => key.split('-')[1]);

            for (let from of symbols) {
                for (let to of symbols) {
                    if (from !== to) {
                        if (this.rates[`USD-${from}`] && this.rates[`USD-${to}`]) {
                            this.rates[`${from}-${to}`] = parseFloat((this.rates[`USD-${to}`] / this.rates[`USD-${from}`]).toFixed(10));
                            this.rates[`${to}-${from}`] = parseFloat((this.rates[`USD-${from}`] / this.rates[`USD-${to}`]).toFixed(10)); // التصحيح هنا!
                        }
                        
                    }
                }
            }
            console.log("Rates updated successfully.");
            console.log("Updated Rates:", this.rates);
        });
    }

    convert(amount, fromUnits, toUnits) {
        let tag = `${fromUnits}-${toUnits}`;
        let rate = this.rates[tag];
        if (rate === undefined) {
            throw new Error(`Rate for ${tag} not found`);
        }
        return parseFloat((rate * amount).toFixed(10));
    }
}

const PATH = './rates.json';
let cnv = new CurrencyConverter(readJsonFromFile(PATH));

console.log(cnv.rates);
console.log("====================================================================");

function test(amt, from, to) {
    console.log(`${amt} ${from} is worth ${cnv.convert(amt, from, to)} ${to}.`);
}

test(4000, 'ETH', 'BTC');
test(200, 'BTC', 'EOS');
console.log("====================================================================");

cnv.emit(SHOW, { from: "EOS", to: "BTC" });
cnv.emit(SHOW, { from: "EOS", to: "ETH" });
cnv.emit(SHOW, { from: "ETC", to: "ETH" });
cnv.emit(SHOW, { from: "LTC", to: "BTC" });
console.log("====================================================================");

cnv.emit(UPDATE, { sym: "BTC", usdPrice: 50000 });
console.log("====================================================================");

cnv.emit(SHOW, { from: "LTC", to: "BTC" });

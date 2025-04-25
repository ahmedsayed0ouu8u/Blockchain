"use strict";
// required npm install blind-signatures
const blindSignatures = require('blind-signatures');

const { Coin, COIN_RIS_LENGTH, IDENT_STR, BANK_STR } = require('./coin.js');
const utils = require('./utils.js');

// Details about the bank's key.
const BANK_KEY = blindSignatures.keyGeneration({ b: 2048 });
const N = BANK_KEY.keyPair.n.toString();
const E = BANK_KEY.keyPair.e.toString();

/**
 * Function signing the coin on behalf of the bank.
 * 
 * @param blindedCoinHash - the blinded hash of the coin.
 * 
 * @returns the signature of the bank for this coin.
 */
function signCoin(blindedCoinHash) {
  return blindSignatures.sign({
      blinded: blindedCoinHash,
      key: BANK_KEY,
  });
}

/**
 * Parses a string representing a coin, and returns the left/right identity string hashes.
 *
 * @param {string} s - string representation of a coin.
 * 
 * @returns {[[string]]} - two arrays of strings of hashes, commiting the owner's identity.
 */
function parseCoin(s) {
  let [cnst,amt,guid,leftHashes,rightHashes] = s.split('-');
  if (cnst !== BANK_STR) {
    throw new Error(`Invalid identity string: ${cnst} received, but ${BANK_STR} expected`);
  }
  //console.log(`Parsing ${guid}, valued at ${amt} coins.`);
  let lh = leftHashes.split(',');
  let rh = rightHashes.split(',');
  return [lh,rh];
}

/**
 * Procedure for a merchant accepting a token. The merchant randomly selects
 * the left or right halves of the identity string.
 * 
 * @param {Coin} - the coin that a purchaser wants to use.
 * 
 * @returns {[String]} - an array of strings, each holding half of the user's identity.
 */
function acceptCoin(coin) {
  //
  function acceptCoin(coin) {
    // 1) Verify signature validity
    const valid = blindSignatures.verify({
      unblinded: coin.signature,
      message: coin.toString(),
      N: coin.n,
      E: coin.e,
    });
  
    if (!valid) {
      throw new Error("Invalid coin signature.");
    }
  
    // 2) Select left or right randomly
    let isLeft = utils.randInt(2) === 0;
    let selectedHalf = [];
  
    // 3) Verify that the selected half hashes match those in coinString
    let [leftHashes, rightHashes] = parseCoin(coin.toString());
  
    for (let i = 0; i < COIN_RIS_LENGTH; i++) {
      let ris = coin.getRis(isLeft, i); // key or ciphertext
      let hash = utils.hash(ris);
  
      let expected = isLeft ? leftHashes[i] : rightHashes[i];
      if (hash !== expected) {
        throw new Error("Hash mismatch, coin tampered.");
      }
  
      selectedHalf.push(ris);
    }
  
    return selectedHalf;
  }
  
  //
  // 1) Verify that the signature is valid.
  // 2) Gather the elements of the RIS, verifying the hashes.
  // 3) Return the RIS.


}

/**
 * If a token has been double-spent, determine who is the cheater
 * and print the result to the screen.
 * 
 * If the coin purchaser double-spent their coin, their anonymity
 * will be broken, and their idenityt will be revealed.
 * 
 * @param guid - Globablly unique identifier for coin.
 * @param ris1 - Identity string reported by first merchant.
 * @param ris2 - Identity string reported by second merchant.
 */
function determineCheater(guid, ris1, ris2) {
  //
  function determineCheater(guid, ris1, ris2) {
    for (let i = 0; i < COIN_RIS_LENGTH; i++) {
      let part1 = ris1[i];
      let part2 = ris2[i];
  
      let xorBuf = Buffer.alloc(part1.length);
      for (let j = 0; j < part1.length; j++) {
        xorBuf[j] = part1[j] ^ part2[j];
      }
  
      let result = xorBuf.toString();
      if (result.startsWith(IDENT_STR)) {
        console.log(`Double spending detected! Coin creator is: ${result.split(':')[1]}`);
        return;
      }
    }
  
    console.log("RIS identical - Merchant is trying to double report, not the purchaser.");
  }
    //
  // Go through the RIS strings one pair at a time.
  // If the pair XORed begins with IDENT, extract coin creator ID.
  // Otherwise, declare the merchant as the cheater.


}

let coin = new Coin('alice', 20, N, E);

coin.signature = signCoin(coin.blinded);

coin.unblind();


// Merchant 1 accepts the coin.
let ris1 = acceptCoin(coin);


// Merchant 2 accepts the same coin.
let ris2 = acceptCoin(coin);


// The bank realizes that there is an issue and
// identifies Alice as the cheater.
determineCheater(coin.guid, ris1, ris2);

console.log();
// On the other hand, if the RIS strings are the same,
// the merchant is marked as the cheater.
determineCheater(coin.guid, ris1, ris1);

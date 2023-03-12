#!/usr/bin/env node
import crypto from 'node:crypto'

const [,, masterArg, postfixArg] = process.argv
const master = masterArg || 'test'
const postfix = postfixArg || 'example'

const md5 = crypto.createHash('md5').update(master + postfix).digest()
const v1 = md5.toString('base64').replace(/=+$/,'')

const sha = crypto.createHash('sha256').update(master + postfix).digest()
const v2 = sha.toString('base64').replace(/=/g,'.').replace(/\+/g,'-').replace(/\//g,'_')

console.log('Legacy v1 (MD5+Base64 no =):', v1)
console.log('Legacy v2 (SHA256+URL-Base64):', v2)
console.log(`\nInputs -> master:"${master}", postfix:"${postfix}"`)


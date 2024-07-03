import { createHash } from "crypto"
import cuid from 'cuid';
import fs from "fs"

if(!fs.existsSync("db")) fs.mkdirSync("db");
if(!fs.existsSync("db/users.json")) fs.writeFileSync("db/users.json", "{}");

const db = JSON.parse(fs.readFileSync("db/users.json").toString())

function syncDB() {
    fs.writeFileSync("db/users.json", JSON.stringify(db))
}

export function checkAccount(username) {
    return db[username] != undefined
}

export function createAccount(username, password) {
    let hashedPassword = createHash('sha256').update(password).digest('hex');
    db[username] = {
        id: cuid(),
        password: hashedPassword,
        t: Number(new Date()) / 1000
    };
    syncDB();
}

export function checkPassword(username, password) {
    let hashedPassword = createHash('sha256').update(password).digest('hex');
    return db[username]?.password === hashedPassword
}
import { createHash } from "crypto";
import cuid from "cuid";
import fs from "fs";

if (!fs.existsSync("db")) fs.mkdirSync("db");
if (!fs.existsSync("db/users.json")) fs.writeFileSync("db/users.json", "{}");

const db = JSON.parse(fs.readFileSync("db/users.json").toString());

/**
 * Syncs DB to file
 */
function syncDB() {
    fs.writeFileSync("db/users.json", JSON.stringify(db));
}

/**
 * Checks if account exists
 * @param {String} username Username to check
 * @returns {Boolean}
 */
export function checkAccount(username) {
    return db[username] != undefined;
}

/**
 * Create an account
 * @param {String} username The username
 * @param {String} password The password
 */
export function createAccount(username, password, admin = false) {
    let hashedPassword = createHash("sha256").update(password).digest("hex");
    db[username] = {
        admin,
        id: cuid(),
        password: hashedPassword,
        ips: [],
        t: Number(new Date()) / 1000,
    };
    syncDB();
}

/**
 * Log IP address (for IP bans)
 * @param {String} username Username
 * @param {String} ip IP address
 */
export function logIP(username, ip) {
    if (!db[username].ips) db[username].ips = [];
    if (!db[username].ips.includes(ip)) db[username].ips.push(ip);
    syncDB();
}

/**
 * Check if password is correct
 * @param {String} username The username
 * @param {String} password The password
 * @returns {Boolean}
 */
export function checkPassword(username, password) {
    let hashedPassword = createHash("sha256").update(password).digest("hex");
    return db[username]?.password === hashedPassword;
}

/**
 * Get account data
 * @param {String} username The username
 * @returns {Object}
 */
export function getAccountData(username) {
    let returnData = JSON.parse(JSON.stringify(db[username]));
    returnData.password = null;
    return returnData;
}

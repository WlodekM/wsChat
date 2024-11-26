import { createHash } from "node:crypto";
import cuid from "cuid";
import fs from "node:fs";

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
export function checkAccount(username: string) {
    return db[username] != undefined;
}

/**
 * Does a loose check on if the account exists
 */
export function checkAccountLoose(username: string): boolean {
    return Object.keys(db).find(n => n.toLowerCase() == username.toLowerCase()) ? true : false;
}

/**
 * Create an account
 */
export function createAccount(username: string, password: string, admin: boolean = false) {
    const hashedPassword = createHash("sha256").update(password).digest("hex");
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
 */
export function logIP(username: string, ip: string) {
    if (!db[username].ips) db[username].ips = [];
    if (!db[username].ips.includes(ip)) db[username].ips.push(ip);
    syncDB();
}

/**
 * Check if password is correct
 * @returns {Boolean}
 */
export function checkPassword(username: string, password: string) {
    const hashedPassword = createHash("sha256").update(password).digest("hex");
    return db[username]?.password === hashedPassword;
}

/**
 * Get account data
 * @param {String} username The username
 * @returns {User}
 */
export function getAccountData(username: string) {
    const returnData = JSON.parse(JSON.stringify(db[username]));
    returnData.password = null;
    return returnData;
}

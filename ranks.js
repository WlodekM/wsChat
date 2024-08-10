import fs from 'fs';
import path from 'path';
import * as accounts from './accounts.js'
import { commands } from "./commands.js";

export function getRankData(name) {
    if (!/^[^\/\\]*$/g.exec(name)) return null;
    if (!fs.existsSync(path.join('ranks', `${name}.json`))) return null;
    return JSON.parse(fs.readFileSync(path.join('ranks', `${name}.json`)))
}

export function canUserDoCommand(command, username, guest=false) {
    let permissionLevel = 0;
    if (!guest) {
        let accountData = accounts.getAccountData(username);
        if (getRankData(accountData?.admin ? 'admin' : accountData?.rank)) permissionLevel = getRankData(accountData?.admin ? 'admin' : accountData?.rank).level;
    }
    // Banned users can be given a rank with negative permissions so that no commands can be ran
    return permissionLevel >= commands[command]?.level ?? 0
}
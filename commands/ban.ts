import fs from "node:fs";
import { CommandFnArgs } from "../commands.ts"

export default {
    name: "ban",
    aliases: [],
    command: function ({ user, server, args }: CommandFnArgs) {
        if(!user.admin) return user.socket.send("You are not admin");
        if(!server.accounts.checkAccount(args[0])) return user.socket.send("Account not found");
        const theUser = Object.values(server.users).find(a => a.username == args[0]);
        theUser.socket.send('you were kicked because you were banned, L');
        const ipBanList = JSON.parse(String(fs.readFileSync("db/bannedIps.json")));
        ipBanList[theUser.ip] = args[1] ?? 'reason';
        ipBanList['account:'+args[0]] = args[1] ?? 'reason';
        theUser.socket.close(1003, "Kicked");
        fs.writeFileSync('db/bannedIps.json', JSON.stringify(ipBanList));
    },
};

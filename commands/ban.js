import fs from "fs";

export default {
    name: "ban",
    aliases: [],
    command: function ({ user, server, args }) {
        if(!user.admin) return user.socket.send("You are not admin");
        if(!server.accounts.checkAccount(args[0])) return user.socket.send("Account not found");
        let theUser = Object.values(server.users).find(a => a.username == args[0]);
        theUser.socket.send('you were kicked because you were banned, L');
        let ipBanList = JSON.parse(String(fs.readFileSync("db/bannedIps.json")));
        ipBanList[theUser.ip] = args[1] ?? 'reason';
        ipBanList['account:'+args[0]] = args[1] ?? 'reason';
        theUser.socket.close(1003, "Kicked");
        fs.writeFileSync('db/bannedIps.json', JSON.stringify(ipBanList));
    },
};

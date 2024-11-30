import { CommandFnArgs } from "../commands.ts"

export default {
    name: "kick",
    aliases: [],
    command: function ({ user, server, args }: CommandFnArgs) {
        if(!user.admin) return user.socket.send("You are not admin");
        if(!server.accounts.checkAccount(args[0])) return user.socket.send("Account not found");
        const theUser = Object.values(server.users).find(a => a.username == args[0]);
        theUser.socket.send('you were kicked')
        theUser.socket.close(1003, "Kicked");
    },
};

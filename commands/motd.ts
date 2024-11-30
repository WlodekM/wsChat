import { CommandFnArgs } from "../commands.ts"

export default {
    name: "motd",
    aliases: [],
    command: function ({ user, server }: CommandFnArgs) {
        user.socket.send("MOTD: " + server.format(server.config.server.motd));
    },
};

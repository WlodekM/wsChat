export const commands = {
    'join': {
        name: 'join',
        aliases: [],
        command: function({user, channels, args, sendInChannel}) {
            if(args.length < 1) return user.socket.send("Error: You need to specify a channel (example: /join #home).");
            if(!args[0].startsWith("#")) return user.socket.send("Error: Channel not found, run /channels to see a list of channels.");
            if(!channels.includes(args[0].replace("#", ""))) return user.socket.send("Error: Channel not found, run /channels to see a list of channels.");
            sendInChannel(`${user.username} left #${user.channel}.`, user.channel)
            user.channel = args[0].replace("#", "");
            sendInChannel(`${user.username} joined #${user.channel}!`, user.channel)
        }
    },
    'channels': {
        name: 'channels',
        aliases: [],
        command: function({user, channels}) {
            user.socket.send(`Channels:\n${channels.map(ch => ` * #${ch}`).join("\n")}`)
        }
    },
    'nick': {
        name: 'nick',
        aliases: ['nickname', 'name'],
        command: function({user, users, args, sendInChannel}) {
            if(args.length < 1) return user.socket.send("Error: You need to specify a nick (example: /nick WlodekM).");
            if(args[0].length < 3 ) return user.socket.send("Error: Nick too long.");
            if(args[0].length > 20) return user.socket.send("Error: Nick too short.");
            if(Object.values(users).find(usr => usr.username == args[0])) return user.socket.send("Error: Nick already used.");
            sendInChannel(`${user.username} changed their nick to ${args[0]}!`, user.channel)
            user.username = args[0];
        }
    },
    'users': {
        name: 'users',
        aliases: [],
        command: function({user, users, args}) {
            user.socket.send(`Users${args[0] != "global" ? ` in ${user.channel}` : ""}:\n${Object.values(users).filter(usr => (usr.channel == user.channel) || args[0] == "global").map(usr => ` * ${usr.username}`).join("\n")}`)
        }
    },
    'help': {
        name: 'help',
        aliases: ['?'],
        command: function({user, users, args, commands}) {
            user.socket.send(`Commands available:\n${Object.values(commands).map(cmd => `* /${cmd.name} (Aliases: ${(cmd.aliases.join(", ")) || "<None>"})`).join("\n")}`)
        }
    },
}

export function register(cmd, data) {
    commands[cmd] = data
}
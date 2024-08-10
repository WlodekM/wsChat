import fs from "fs";

export const commands = {
    join: {
        name: "join",
        usage: "/join <channel>",
        description: "Join a different channel",
        aliases: [],
        command({ user, server, args, sendInChannel }) {
            if (args.length < 1) return user.socket.send("Error: You need to specify a channel (example: /join #home).");
            if (!args[0].startsWith("#")) return user.socket.send("Error: Channel not found, run /channels to see a list of channels.");
            if (!server.channels.includes(args[0].replace("#", ""))) return user.socket.send("Error: Channel not found, run /channels to see a list of channels.");
            sendInChannel(`${user.name()} left #${user.channel}.`, user.channel);
            user.channel = args[0].replace("#", "");
            server.updateUsers();
            console.info(`${user.name()} went to #${user.channel}`);
            sendInChannel(`${user.name()} joined #${user.channel}!`, user.channel);
        },
    },
    channels: {
        name: "channels",
        usage: "/channels",
        description: "Shows all channels",
        aliases: [],
        command({ user, server }) {
            user.socket.send(`Channels:\n${server.channels.map((ch) => ` * #${ch}`).join("\n")}`);
        },
    },
    nick: {
        name: "nick",
        usage: "/nick <nickname>",
        description: "Change your nickname",
        aliases: ["nickname", "name"],
        command({ user, server, args, sendInChannel }) {
            if (args.length < 1) return user.socket.send("Error: You need to specify a nick (example: /nick WlodekM).");
            if (args[0].length < 3) return user.socket.send("Error: Nick too short.");
            if (args[0].length > 20) return user.socket.send("Error: Nick too long.");
            if (Object.values(server.users).find((usr) => usr.username == args[0])) return user.socket.send("Error: Nick already used.");
            sendInChannel(`${user.name()} changed their nick to ${args[0]}!`, user.channel);
            server.updateUsers();
            user.nickname = args[0];
        },
    },
    about: {
        name: "about",
        usage: "/about",
        description: "Shows info about wsChat",
        aliases: [],
        command({ user, args, sendInChannel }) {
            user.socket.send(`wsChat v${JSON.parse(String(fs.readFileSync("package.json"))).version}\nGithub: https://github.com/WlodekM/wsChat`);
        },
    },
    whois: {
        name: "whois",
        usage: "/whois <username>",
        description: "Shows info about a person",
        aliases: [],
        command({ user, server, args }) {
            if (args.length < 1) return user.socket.send("Please provide username");
            if (!Object.values(server.users).find((usr) => usr.username == args[0])) return user.socket.send("User not found");
            let userFound = Object.values(server.users).find((usr) => usr.username == args[0]);
            userFound.id = Object.keys(server.users).find((usr) => server.users[usr].username == args[0]);
            user.socket.send(`${userFound.username}\nClient: ${userFound.client ?? "<Unknown>"}\nID: ${userFound.id}`);
        },
    },
    users: {
        name: "users",
        usage: "/users",
        description: "Shows all users online",
        aliases: [],
        command({ user, server, args }) {
            user.socket.send(
                `Users${args[0] != "global" ? ` in ${user.channel}` : ""}:\n${Object.values(server.users)
                    .filter((usr) => usr.channel == user.channel || args[0] == "global")
                    .map((usr) => ` * ${usr.name()}`)
                    .join("\n")}`
            );
        },
    },
    help: {
        name: "help",
        usage: "/?",
        description: "Shows all commands",
        aliases: ["?"],
        command({ user, args, commands }) {
            user.socket.send(
                `Commands available:\n${Object.values(commands)
                    .map((cmd) => `* /${cmd.name} (Aliases: ${cmd.aliases.join(", ") || "<None>"})`)
                    .join("\n")}`
            );
        },
    },
    login: {
        name: "login",
        usage: "/login <username> <password>",
        description: "Log into an account",
        aliases: ["signin"],
        command({ server, args, user, sendInChannel }) {
            if (args.length < 2) return user.socket.send(`Usage: /login <username> <password>`);
            if (!server.accounts.checkAccount(args[0])) return user.socket.send(`Account "${args[0]}" not found!`);
            if (!server.accounts.checkPassword(args[0], args[1])) return user.socket.send(`Password incorrect.`);
            if (server.config.saveIP) server.accounts.logIP(args[0], user.ip);
            sendInChannel(`${user.name()} logged in as ${args[0]}!`, user.channel);
            user.username = args[0];
            user.nickname = "";
            user.guest = false;
            user.admin = server.accounts.getAccountData(user.username).admin ?? false;
            server.updateUsers();
        },
    },
    register: {
        name: "register",
        usage: "/register <username> <password>",
        description: "Make a new account",
        aliases: ["signup"],
        command({ server, args, user, sendInChannel }) {
            if (args.length < 2) return user.socket.send(`Usage: /register <username> <password>`);
            if (args[0].length < 3) return user.socket.send(`Username too short!`);
            if (args[0].length > 20) return user.socket.send(`Username too long!`);
            if (args[1].length < 6) return user.socket.send(`Password too short!`);
            if (server.accounts.checkAccountLoose(args[0])) return user.socket.send(`User with username "${args[0]}" already exists!`);
            server.accounts.createAccount(args[0], args[1], args[0] == server.config.owner);
            if (server.config.saveIP) server.accounts.logIP(args[0], user.ip);
            sendInChannel(`${user.name()} logged in as ${args[0]}!`, user.channel);
            user.username = args[0];
            user.nickname = "";
            user.guest = false;
            user.admin = server.accounts.getAccountData(user.username).admin ?? false;
            server.updateUsers();
        },
    },
    pm: {
        name: "pm",
        usage: "/pm <user> [message]",
        description: "Send a private message to a user",
        aliases: [],
        command({ server, args, user, sendInChannel }) {
            if (args.length < 1) return user.socket.send("Please provide username");
            if (!Object.values(server.users).find((usr) => usr.username == args[0])) return user.socket.send("User not found");
            let userFound = Object.values(server.users).find((usr) => usr.username == args[0]);
            userFound.id = Object.keys(server.users).find((usr) => server.users[usr].username == args[0]);
            args.shift();
            userFound.socket.send(`${user.username} -> You : ${args.join(" ")}`);
            user.socket.send(`You -> ${userFound.username} : ${args.join(" ")}`);
        },
    },
};

export function register(cmd, data) {
    commands[cmd] = data;
}

let commandFiles = fs
    .readdirSync("commands")
    .filter((filename) => filename.endsWith(".js"))
    .map((file) => file.replace(/\.js$/gim, ""));
for (let i = 0; i < commandFiles.length; i++) {
    const cmdName = commandFiles[i];
    const cmd = (await import(`./commands/${cmdName}.js`)).default;
    register(cmdName, cmd);
}

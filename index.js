import { WebSocketServer } from "ws";
import cuid from 'cuid';
import { getRandomInt } from "./lib.js"

const channels = ["home", "off-topic"]

const ws = new WebSocketServer({
    port: 9933,
});

const users = {}

function sendInChannel(msg, channel) {
    for (const userID in users) {
        const user = users[userID];
        if(user.channel == channel) user.socket.send(msg)
    }
}

ws.on('connection', (socket, request) => {
    // console.log(request, socket);
    let userID = cuid()
    socket.send("Welcome to WlodekM's wsChat server!")
    let anonID = getRandomInt(0, 99999)
    users[userID] = {
        username: `Anonymous${"0".repeat(5 - anonID.length) + anonID.toString()}`,
        socket: socket,
        joinReq: request,
        t: {
            js: Number(new Date()),
            unix: Math.floor(new Date().getTime() / 1000),
            str: String(new Date())
        },
        channel: 'home'
    }
    sendInChannel(`${users[userID].username} joined #${users[userID].channel}!`, users[userID].channel)
    socket.on('close', function(code, reason) {
        sendInChannel(`${users[userID].username} left.`, users[userID].channel)
        delete users[userID]
    })
    socket.on('message', function (rawData) {
        if(rawData.toString().startsWith("/")) {
            let args = String(rawData).replace("/", "").split(" ");
            let command = args.shift();
            console.log(`${users[userID].username} used /${command}`)
            switch (command) {
                case 'join':
                    if(args.length < 1) return socket.send("Error: You need to specify a channel (example: /join #home).");
                    if(!args[0].startsWith("#")) return socket.send("Error: Channel not found, run /channels to see a list of channels.");
                    if(!channels.includes(args[0].replace("#", ""))) return socket.send("Error: Channel not found, run /channels to see a list of channels.");
                    sendInChannel(`${users[userID].username} left #${users[userID].channel}.`, users[userID].channel)
                    users[userID].channel = args[0].replace("#", "");
                    sendInChannel(`${users[userID].username} joined #${users[userID].channel}!`, users[userID].channel)
                    break;
                case 'channels':
                    socket.send(`Channels:\n${channels.map(ch => ` * #${ch}`).join("\n")}`)
                    break;
                case 'name':
                case 'nickname':
                case 'nick':
                    if(args.length < 1) return socket.send("Error: You need to specify a nick (example: /nick WlodekM).");
                    if(args[0].length < 3 ) return socket.send("Error: Nick too long.");
                    if(args[0].length > 20) return socket.send("Error: Nick too short.");
                    if(Object.values(users).find(usr => usr.username == args[0])) return socket.send("Error: Nick already used.");
                    sendInChannel(`${users[userID].username} changed their nick to ${args[0]}!`, users[userID].channel)
                    users[userID].username = args[0]
                    break;
                case 'users':
                    socket.send(`Users${args[0] != "global" ? ` in ${users[userID].channel}` : ""}:\n${Object.values(users).filter(usr => (usr.channel == users[userID].channel) || args[0] == "global").map(ch => ` * ${ch}`).join("\n")}`)
                    break;
            
                default:
                    socket.send(`Error: Command "${command}" not found!`);
                    break;
            }
            return
        }
        if(rawData.length < 1) return socket.send("Error: message too short!")
        if(rawData.length >= 2000) return socket.send("Error: message too long!")
        sendInChannel(`<${users[userID].username}> ${rawData}`, users[userID].channel)
        console.log(`(#${users[userID].channel}) <${users[userID].username}> ${rawData}`)
    })
})

ws.on('listening', () => {
    console.info("[INFO] Server started")
})

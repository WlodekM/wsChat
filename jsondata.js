/**
 * handles json data
 * @param {Buffer} rawData the raw message data
 * @param {import("./user.js").default} user the user
 * @returns {Boolean}
 */
export default function handleMessage(server, rawData, user) {
    if (rawData.toString().startsWith(":jsonGet")) {
        let params = String(rawData).split(" ");
        params.shift();
        switch (params[0]) {
            case "channels":
                user.socket.send(":json.channels>" + JSON.stringify(server.channels));
                break;
            case "users":
                user.socket.send(
                    ":json.users>" +
                        JSON.stringify(
                            Object.values(server.users).map((usr) => {
                                return {
                                    username: usr.username,
                                    nickname: usr.nickname,
                                    t: usr.t,
                                    channel: user.channel,
                                    displayName: user.name(),
                                };
                            })
                        )
                );
                break;
            case "usersLocal":
                user.socket.send(
                    JSON.stringify(
                        Object.values(server.users)
                            .filter((usr) => usr.channel == user.channel)
                            .map((usr) => {
                                return {
                                    username: usr.username,
                                    nickname: usr.nickname,
                                    t: usr.t,
                                    channel: user.channel,
                                    displayName: user.name(),
                                };
                            })
                    )
                );
                break;

            default:
                user.socket.send(`unknown "${params[0]}"`);
                break;
        }
        return true;
    }
    if (rawData.toString().startsWith(":jsonSubscribe")) {
        let params = String(rawData).split(" ");
        params.shift();
        switch (params[0]) {
            case "users":
                user.subscribedToUsers = true;
                break;

            default:
                user.socket.send(`unknown "${params[0]}"`);
                break;
        }
        return true;
    }
    return false
}
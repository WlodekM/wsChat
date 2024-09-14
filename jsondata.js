export default function handleMessage(rawData, user) {
    if (rawData.toString().startsWith(":jsonGet")) {
        let params = String(rawData).split(" ");
        params.shift();
        switch (params[0]) {
            case "channels":
                socket.send(":json.channels>" + JSON.stringify(this.channels));
                break;
            case "users":
                socket.send(
                    ":json.users>" +
                        JSON.stringify(
                            Object.values(this.users).map((usr) => {
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
                socket.send(
                    JSON.stringify(
                        Object.values(this.users)
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
                socket.send(`unknown "${params[0]}"`);
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
                socket.send(`unknown "${params[0]}"`);
                break;
        }
        return true;
    }
    return false
}
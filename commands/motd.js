export default {
    name: 'motd',
    aliases: [],
    command: function({user, server}) {
        user.socket.send("MOTD: " + server.format(server.config.motd));
    }
}
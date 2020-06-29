const config = require('./config.json');
const express = require('express');
const chalk = require('chalk');
const log = require('loglevel');
const prefix = require('loglevel-plugin-prefix');
const { ChatBadgeVersion } = require('twitch');
const ChatClient = require('twitch-chat-client').default;
const TwitchClient = require('twitch').default;

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const client = TwitchClient.withCredentials(config.clientId, config.oauthToken);
const chatbot = ChatClient.forTwitchClient(client, {
    channels: config.channels
});
let channelData = new Map();

const colors = {
    TRACE: chalk.magenta,
    DEBUG: chalk.cyan,
    INFO: chalk.blue,
    WARN: chalk.yellow,
    ERROR: chalk.red
};

prefix.reg(log);
log.enableAll();

prefix.apply(log, {
    format(level, name, timestamp) {
        return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toUpperCase()](level)}:`;
    },
});

async function main() {
    chatbot.onJoin((channelRaw) => {
        log.info('Joined channel ' + channelRaw);
    });
    chatbot.onPrivmsg((channelRaw, user, message) => {
        let channel = channelRaw.substr(1);
        let counter = channelData.get(channel).counter;
        let lastMilestone = channelData.get(channel).lastMilestone;
        let regex = /[UuOo][Ww][UuOo]/g;
        let match, matches = [];
        if (user !== chatbot.currentNick) {
            if (message.startsWith('!owo') || message.startsWith('!uwu')) {
                chatbot.say(channel, 'OwO Counter: ' + counter);
            } else {
                while ((match = regex.exec(message))) {
                    matches.push(match.index);
                }
                if (matches.length > 0) {
                    counter += matches.length;
                    log.debug(`${chalk.italic(`${chalk.gray(`(${channelRaw})`)}`)} Message from ${user} contains ${matches.length} OwOs. New count: ${counter}`);
                    io.emit('counter-' + channel, counter);
                    let refreshedData = {
                        counter: counter,
                        lastMilestone: lastMilestone
                    }
                    channelData.set(channel, refreshedData);
                }
                let responseMilestone = 0;

                config.milestones.forEach(milestone => {
                    if (counter >= milestone && counter > lastMilestone) {
                        responseMilestone = milestone;
                    }
                });
                if (responseMilestone > 0 && responseMilestone > lastMilestone) {
                    let refreshedData = {
                        counter: counter,
                        lastMilestone: responseMilestone
                    }
                    channelData.set(channel, refreshedData);
                    io.emit('milestone-' + channel, responseMilestone, counter);
                    chatbot.say(channel, 'We have reached ' + responseMilestone + ' OwOs!');
                }
            }
        }
    });
    await chatbot.connect();
}

main().then(() => {
    io.emit('refresh');
    config.channels.forEach(channel => {
        channelData.set(channel, {
            counter: 0,
            lastMilestone: 0
        });
        app.get('/' + channel, function (req, res) {
            res.sendFile(__dirname + '/public/index.html');
        });
        io.on('connection', (socket => {
            socket.emit('counter-' + channel, channelData.get(channel).counter);
        }));
        //chatbot.say(channel, 'Hewwo! OwO/UwU counter is now active! Summon me with !owo or !uwu.');
    });
});

app.use(express.static('public/'));

http.listen(8080);
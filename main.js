const config = require('./config.json');
const express = require('express');
const Database = require('better-sqlite3');
const chalk = require('chalk');
const log = require('loglevel');
const prefix = require('loglevel-plugin-prefix');
const {
    stat
} = require('fs');
const ChatClient = require('twitch-chat-client').default;
const TwitchClient = require('twitch').default;

const db = new Database('data.db');
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
        let data = channelData.get(channel);
        let regex = /[UuOo][Ww][UuOo]/g;
        let match, matches = [];
        if (user !== chatbot.currentNick) {
            if (message.startsWith('!owo') || message.startsWith('!uwu')) {
                if ((message.startsWith('!owo reset') || message.startsWith('!uwu reset')) && user == channel) {
                    resetCounter(channel);
                    io.emit('counter-' + channel, 0, data.lifetime);
                    chatbot.say(channel, 'OwO Counter has been reset!');
                } else {
                    chatbot.say(channel, 'OwO Counter: ' + data.counter);
                }
            } else {
                while ((match = regex.exec(message))) {
                    matches.push(match.index);
                }
                if (matches.length > 0) {
                    data.counter += matches.length;
                    data.lifetime += matches.length;
                    log.debug(`${chalk.italic(`${chalk.gray(`(${channelRaw})`)}`)} Message from ${user} contains ${matches.length} OwOs. New count: ${data.counter}`);
                    io.emit('counter-' + channel, data.counter, data.lifetime);
                    putData(channel, 'counter', data.counter);
                    putData(channel, 'lifetime', data.lifetime);
                    if (data.counter > data.hiScore) {
                        data.hiScore = data.counter;
                        putData(channel, 'hiScore', data.hiScore);
                    }
                    let responseMilestone = 0;

                    config.milestones.forEach(milestone => {
                        if (data.counter >= milestone && data.counter > data.lastMilestone) {
                            responseMilestone = milestone;
                        }
                    });
                    if (responseMilestone > 0 && responseMilestone > data.lastMilestone) {
                        data.lastMilestone = responseMilestone;
                        putData(channel, 'lastMilestone', data.lastMilestone);
                        channelData.set(channel, data);
                        io.emit('milestone-' + channel, responseMilestone, data.counter);
                        chatbot.say(channel, 'We have reached ' + responseMilestone + ' OwOs!');
                    }
                    channelData.set(channel, data);
                }
            }
        }
    });
    await chatbot.connect();
}

main().then(() => {
    io.emit('refresh');
    db.prepare('create table if not exists channels (name text, counter int, lastMilestone int, hiScore int, lifetime int);').run();
    config.channels.forEach(channel => {
        let data = getData(channel);
        if (data === undefined) {
            data = {
                counter: 0,
                lastMilestone: 0,
                hiScore: 0,
                lifetime: 0
            }
            newData(channel);
        }
        channelData.set(channel, data);
        app.get('/' + channel, function (req, res) {
            res.sendFile(__dirname + '/public/index.html');
        });
        io.on('connection', (socket => {
            socket.emit('counter-' + channel, channelData.get(channel).counter, channelData.get(channel).lifetime);
        }));
        //chatbot.say(channel, 'Hewwo! OwO/UwU counter is now active! Summon me with !owo or !uwu.');
    });
});

app.use(express.static('public/'));

http.listen(8080);

function newData(channel) {
    const statement = db.prepare('insert into channels (name, counter, lastMilestone, hiScore, lifetime) values (?, 0, 0, 0, 0);');
    statement.run(channel);
}

function getData(channel) {
    const statement = db.prepare('select * from channels where name = ?');
    return statement.get(channel);
}

function putData(channel, property, value) {
    const statement = db.prepare(`update channels set ${property} = ? where name = ?`);
    statement.run(value, channel);
}

function resetCounter(channel) {
    let data = channelData.get(channel);
    data.counter = 0;
    data.lastMilestone = 0;
    channelData.set(channel, data);
    putData(channel, 'counter', 0);
    putData(channel, 'lastMilestone', 0);
    log.info(`${chalk.italic(`${chalk.gray(`(#${channel})`)}`)} Counter reset`);
}
const config = require('./config.json');
const ChatClient = require('twitch-chat-client').default;
const TwitchClient = require('twitch').default;

const client = TwitchClient.withCredentials(config.clientId, config.oauthToken);
const chatbot = ChatClient.forTwitchClient(client);
let channelData = new Map();
chatbot.onRegister(() => {
    config.channels.forEach(channel => {
        chatbot.join(channel);
    });
});
chatbot.connect().then(() => {
    config.channels.forEach(channel => {
        channelData.set(channel, {
            counter: 0,
            lastMilestone: 0
        });
        chatbot.onPrivmsg((channelRaw, user, message) => {
            let channel = channelRaw.replace('#', '');
            let counter = channelData.get(channel).counter;
            let lastMilestone = channelData.get(channel).lastMilestone;
            let regex = /owo|uwu|OwO|UwU/g;
            let match, matches = [];
            if (user !== 'codathebot') {
                if (message.startsWith('!owo') || message.startsWith('!uwu')) {
                    chatbot.say(channel, 'OwO Counter: ' + counter);
                } else {
                    while ((match = regex.exec(message))) {
                        matches.push(match.index);
                    }
                    if (matches.length > 0) {
                        counter += matches.length;
                        let refreshedData = {
                            counter: counter,
                            lastMilestone: lastMilestone
                        }
                        channelData.set(channel, refreshedData);
                    }
                    let responseMilestone = 0;
                    
                    config.milestones.forEach(milestone => {
                        if (counter > milestone && counter > lastMilestone) {
                            responseMilestone = milestone;
                        }
                    });
                    if (responseMilestone > 0 && responseMilestone > lastMilestone) {
                        let refreshedData = {
                            counter: counter,
                            lastMilestone: responseMilestone
                        }
                        channelData.set(channel, refreshedData);
                        chatbot.say(channel, 'We have reached ' + responseMilestone + ' OwOs!');
                    }
                }
            }
        });
        chatbot.say(channel, 'Hewwo! OwO/UwU counter is now active! Summon me with !owo or !uwu.');
    });
});
/*jshint esnext:true*/
// Note, the above jshint options allow for linting, with the "const" keyword.
// To install jshint, use "npm install -g jshint", then run "jshint chloe-server.js"
const webSocketServer = require('ws').Server;
const wss = new webSocketServer({
    host: process.env.OPENSHIFT_NODEJS_IP || 'localhost',
    port: process.env.OPENSHIFT_NODEJS_PORT || 8001
});

// ezbake security client stuff
var EzSecurity = require("ezbake-security-client");
var EzConfiguration = require('ezbake-configuration');
var ezConfig = new EzConfiguration.EzConfiguration();

// Since the "userInfo.dn" object isn't available anymore, we'll create
// a user specific string by performing MD5 on "userInfo.principal"
var crypto = require("crypto");

// encryption/decryption
var ursa = require('ursa');
var fs = require('fs');
var path = require('path');
var cons = require('ezbake-security-client').Constant;
var sslDir = ezConfig.getString(cons.SSL_DIR_KEY);
var publicKey = ursa.coercePublicKey(fs.readFileSync(path.join(sslDir, cons.PUBLIC_KEY_FILE), "utf8"));
var privateKey = ursa.coercePrivateKey(fs.readFileSync(path.join(sslDir, cons.PRIVATE_KEY_FILE), "utf8"));
var Cryptography = require('./lib/Cryptography');

var ezbakeSecurityClient = new EzSecurity.Client(ezConfig);

// redis stuff
const redis = require('redis');
var redisClient;
try {
    console.log((new Date()) + " Connecting to Redis...");
    redisClient = redis.createClient(ezConfig.properties["redis.port"], ezConfig.properties["redis.host"]);
}
catch (err) {
    console.error((new Date()) + " Error occurred creating Redis client: \n\t" + err +
            "\n" + (new Date()) + " Re-throwing error.");
    throw err;
}

// debug flag to clear the redis keys
var clearRedisKeys = false;
process.argv.forEach(function(val, index, array) {
    if (val === '-c') {
        clearRedisKeys = true;
    }
});

// channels is a hash of websocket ids (keys) and redis channel names (values)
var channels = {};
var RedisSubscriptionSupervisor = require('./lib/RedisSubscriptionSupervisor');
var redisSubscribers = new RedisSubscriptionSupervisor(redisClient, clearRedisKeys);
var connectionID = 1;

function sendSSRs(channel, SSRs) {
    var plainText = JSON.stringify({ SSRs: SSRs });
    redisSubscribers.checkSubscriptions(channel, redisClient, function(hasSubscribers) {
        if (hasSubscribers) {
            // If there exists a redis subscriber (on any chloe instance) publish the message
            console.log((new Date()) + " Publishing SSRs to the Redis queue");
            redisClient.publish(channel, JSON.stringify(Cryptography.encrypt(plainText, publicKey)));
        } else {
            // No clients are subscribed, pass the info to redisSubscribers so that it can publish when someone subscribes
            console.log((new Date()) + " Adding SSRs to the message queue pending subscribers");
            redisSubscribers.queueMessage(channel, JSON.stringify(Cryptography.encrypt(plainText, publicKey)), redisClient);
        }
    });
}

function sendUpdate(userHash, master) {
    // Sends updated user information over the master channel so that globalsearch can update its list
    redisSubscribers.getAllSubscriptionsByUser(userHash, redisClient, function(userInfo) {
        var plainText = JSON.stringify({
            userInfo: userInfo
        });
        redisClient.publish(master, JSON.stringify(Cryptography.encrypt(plainText, publicKey)));
    });
}

function subscribe(ws, myId, ownerId, userName, master, channel, message) {
    // Subscribe to the redis queue
    console.log((new Date()) + ' user %s subscribed to channel %s', myId, channel);
    var redisSubscriber = redis.createClient(ezConfig.properties["redis.port"], ezConfig.properties["redis.host"]);
    var appInfo = { appName: message.app, channel: message.channel, ownerId: ownerId, sharedWith: [] };
    var userInfo = { md5: myId, name: userName };
    redisSubscribers.subscribe(channel, redisSubscriber, userInfo, appInfo, redisClient, function() {
        // Send an update after the subscription has been added
        sendUpdate(myId, master);
    });
    // When a redis queue message is received, pass the message along via websocket
    (function (websocket, myId) {
        redisSubscriber.on("message", function(channel, message) {
            try {
                var decryptedObj = JSON.parse(Cryptography.decrypt(JSON.parse(message), privateKey));

                // In the case of apps sending appData, suppress sending the message to the message's originator
                if (typeof decryptedObj.appData === "undefined" || decryptedObj.from !== myId) {
                    console.log((new Date()) + " Attempting to forward message to WebSocket. \n\t" +
                            "Channel: " + channel + "\n\t" +
                            "Message body: %j", decryptedObj);
                    websocket.send(JSON.stringify(decryptedObj));
                }
            } catch (err) {
                console.error((new Date()) + " Error forwarding message to WebSocket. \n\t" + err);
            }
        });
    })(ws, myId);
    (function (websocketId, redisSubscriber, master, channel, userHash) {
        redisSubscriber.on("ready", function() {
            redisSubscribers.add(websocketId, redisSubscriber, channel, redisClient);
            // Whenever a master channel connects, update all master channels so that their list of available users is updated.
            redisSubscribers.getActiveUserIds(redisClient, function(users) {
                for (var i = 0; i < users.length; i++) {
                    sendUpdate(users[i], "globalsearch" + "_" + users[i] + "_" + "master");
                }
            });
        });
    })(ws.id, redisSubscriber, master, channel, myId);
}

function md5(value) {
    return crypto.createHash('md5').update(value).digest('hex');
}

// Check for orphaned connections every two minutes
setInterval(function() {
    console.log((new Date()) + " Checking for orphaned subscriptions...");
    redisSubscribers.pruneOrphanedSubscriptions(new Date(), redisClient, function(users) {
        for (var i = 0; i < users.length; i++) {
            sendUpdate(users[i], "globalsearch" + "_" + users[i] + "_" + "master");
        }
    });
}, 1000 * 60 * 2);

wss.on('connection', function(ws) {
    console.log((new Date()) + " WebSocket server received connection");

    ws.on('message', function(message) {
        ezbakeSecurityClient.fetchTokenForProxiedUser(this.upgradeReq, function(err, token) {
            if (err) {
                console.error((new Date()) + " EzSecuruity returned an error: \n\t" + err +
                        "\n" + (new Date()) + " Throwing EzSecuruity error.");
                throw err;
            }

            var userInfo = token.tokenPrincipal;

            message = JSON.parse(message);

            var myId = md5(userInfo.principal)
            var ownerId = message.ownerId ? message.ownerId : myId;
            var master = "globalsearch" + "_" + myId + "_" + "master";
            var channel = message.app + "_" + ownerId + "_" + message.channel;

            if (typeof ws.id === "undefined") {
                ws.id = connectionID;
                connectionID++;
                channels[ws.id] = channel;
            }

            if (message.status === "keep-alive") {
                // This is a ping to keep the web socket alive, just update the lastUpdated timestamp
                console.log((new Date()) + " Updating channel " + channel + " timestamp.");
                redisSubscribers.updateLastUpdated(channel, myId, redisClient);
            } else if (message.status === "sharing") {
                redisSubscribers.getUserInfoForUser(message.ownerId, redisClient, function(ownerInfo) {
                    var shareWith = [];
                    for (var i = 0; i < message.users.length; i++) {
                        shareWith.push(message.users[i].id);
                        var userChannel = "globalsearch" + "_" + message.users[i].id + "_" + "master";
                        var plainText = JSON.stringify({ 
                            "channel": message.channel, 
                            "app": message.app, 
                            "status": "sharing",
                            "owner": { id: message.ownerId, name: ownerInfo.name } 
                        });
                        redisClient.publish(userChannel, JSON.stringify(Cryptography.encrypt(plainText, publicKey)));
                    }
                    redisSubscribers.share(message.ownerId, channel, shareWith, redisClient);
                });
            } else if (message.status === "closing") {
                redisSubscribers.unsubscribe(channel, null, myId, redisClient, function() {
                    console.log((new Date()) + ' user ' + myId + ' disconnected from channel ' + channel);

                    // Send a message over the master channel letting the Chloe client know which channel was closed
                    if (channel !== master) {
                        sendUpdate(myId, master);
                    }
                });
            } else if (message.appData) {
                var plainText = JSON.stringify({ appData: message.appData, from: myId });
                redisSubscribers.getSharedUsers(channel, redisClient, function(sharedWith) {
                    if (sharedWith.length > 1) {
                        // If this channel is shared with users, send them this message containing app specific data
                        console.log((new Date()) + " Publishing appData to the Redis queue");
                        redisClient.publish(channel, JSON.stringify(Cryptography.encrypt(plainText, publicKey)));
                    }
                });
            } else if (message.SSRs) {
                if (message.ownerId) {
                    channel = message.app + "_" + ownerId + "_" + message.channel;
                    sendSSRs(channel, message.SSRs);
                } else {
                    sendSSRs(channel, message.SSRs);
                }
            } else {
                if (ownerId === myId) {
                    subscribe(ws, myId, ownerId, userInfo.name, master, channel, message);
                } else {
                    redisSubscribers.isSharedWith(ownerId, channel, myId, redisClient, function(allowed) {
                        if (allowed) {
                            subscribe(ws, myId, ownerId, userInfo.name, master, channel, message);
                        }
                    });
                }
            }
        });
    });

    ws.on('close', function() {
        console.log((new Date()) + " Received close");

        ezbakeSecurityClient.fetchTokenForProxiedUser(this.upgradeReq, function(err, token) {
            if (err) {
                console.error((new Date()) + " EzSecuruity returned an error: \n\t" + err +
                        "\n" + (new Date()) + " Throwing EzSecuruity error.");
                throw err;
            }

            var userInfo = token.tokenPrincipal;
            var myId = md5(userInfo.principal);
            var master = "globalsearch" + "_" + myId + "_" + "master";
            var subscriber = redisSubscribers.get(ws.id);

            redisSubscribers.unsubscribe(channels[ws.id], subscriber, myId, redisClient, function() {
                console.log((new Date()) + ' user ' + myId + ' disconnected from channel ' + channels[ws.id]);

                if (channels[ws.id] !== master) {
                    // Send a message over the master channel letting the Chloe client know which channel was closed
                    sendUpdate(myId, master);
                } else {
                    // Whenever a master channel disconnects, update all master channels so that their list of available users is updated.
                    redisSubscribers.getActiveUserIds(redisClient, function(users) {
                        for (var i = 0; i < users.length; i++) {
                            sendUpdate(users[i], "globalsearch" + "_" + users[i] + "_" + "master");
                        }
                    });
                }
            });
        });
    });
});

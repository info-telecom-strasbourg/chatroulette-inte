const express = require('express');
const app = express();
const path = require("path");
const http = require('http');


var fs = require('fs');

const server = http.createServer({}, app);

const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
const routeName = "/index";
app.use(express.static(__dirname + "/public/"))

/*****************************************************************************/
/*                                Routes                                     */
/*****************************************************************************/

// 1A
app.get("/libellule", (req, res) => {
    res.sendFile(path.join(__dirname + '/client/index0.html'));
});

// 2A et 3A
app.get("/papillon", (req, res) => {
    res.sendFile(path.join(__dirname + '/client/index1.html'));
});


/*****************************************************************************/
/*                               Logique                                     */
/*****************************************************************************/

var queue = [
    [],
    []
];

var waitingQueue = [];

var socketList = [];

var connectedTo = [];

/**
 * Initialise un socket et le met dans la file d'attente
 */
function login(channel) {
    socketList.push(this);
    connectedTo.push([]);
    joinQueue(this, channel);
}

/**
 * Met dans la file d'attente le socket
 * @param socket 
 */
function joinQueue(socket, channel) {
    if (channel < 0 || channel > 1) return;

    socket.channelId = channel;
    queue[channel].push(socket);

    updateQueue();

    console.log("---------------");
    console.log("## Login ##");
    console.log('Number of 1A: ');
    console.log(queue[0].length);
    console.log('Number of 2A-3A: ');
    console.log(queue[1].length);
    console.log('Number of 2A-3A in waiting queue: ');
    console.log(waitingQueue.length);
}

function connectSockets(withAttente) {
    let pair = { s1: null, s2: null };
    if (withAttente) {
        pair.s1 = queue[0].shift();
        pair.s2 = waitingQueue.shift();
    } else {
        pair.s1 = queue[0].shift();
        pair.s2 = queue[1].shift();
    }

    pair.s1.pairedSocket = pair.s2;
    pair.s2.pairedSocket = pair.s1;

    if (!connectedTo[socketList.indexOf(pair.s1)].includes(pair.s2)) {
        connectedTo[socketList.indexOf(pair.s1)].push(pair.s2);
    }
    if (!connectedTo[socketList.indexOf(pair.s2)].includes(pair.s1)) {
        connectedTo[socketList.indexOf(pair.s2)].push(pair.s1);
    }
    console.log('-----socket list length and connectedTo-----');
    console.log(socketList.length);
    console.log(connectedTo.length);
    console.log('-----socket list length for both thing-----');
    console.log(connectedTo[socketList.indexOf(pair.s2)].length);
    console.log(connectedTo[socketList.indexOf(pair.s1)].length);

    pair.s2.emit("peer.init");

    console.log("---------------");
    console.log("## Creating P2P connection ##");
}

function updateQueue() {
    if (queue[0].length > 0 && waitingQueue.length > 0) {
        if (queue[0][0].pairedSocket == waitingQueue[0]) {
            if (queue[1].length > 0) {
                connectSockets(false);
            }
        } else {
            connectSockets(true);
        }
    } else {
        if (queue[1].length > 0 && queue[0].length > 0) {
            if (queue[1][0].pairedSocket == queue[0][0]) {
                let ancienPeer = queue[1].shift();
                waitingQueue.push(ancienPeer);
                setTimeout(() => {
                    updateQueue();
                }, 30000);
            } else {
                connectSockets(false);
            }
        }
    }
}

/**
 * Arrete la conversation entre deux client et 
 * les remet dans la file d'attente
 * @param socket 
 */
function rejoinQueue(channel) {
    joinQueue(this, channel);
}

/**
 * Transmet l'offre au socket appairé
 */
function sendOffer(data) {
    this.pairedSocket.emit('offer.receive', data);
}

/**
 * Transmet la réponse au socket appairé
 */
function sendAnswer(data) {
    this.pairedSocket.emit("answer.receive", data);
}

/**
 * Appelée quand un socket se déconnecte
 */
function disconnect() {
    let isInQueue1 = queue[1].indexOf(this);

    if (isInQueue1 != -1)
        queue[1].splice(isInQueue1, 1);
    else {
        let isInQueue2 = queue[0].indexOf(this);
        if (isInQueue2 != -1)
            queue[0].splice(isInQueue2, 1);
        else {
            let isInAttente = waitingQueue.indexOf(this);
            if (isInAttente != 1) {
                waitingQueue.splice(isInAttente, 1);
            }
        }
    }
    if (this.pairedSocket) {
        this.pairedSocket.emit("peer.destroy");
    }
}

function reroll() {
    this.pairedSocket.emit("peer.destroy");
    this.emit("peer.destroy");
}

io.on('connection', function(socket) {
    socket.on("login", login);
    socket.on("queue.rejoin", rejoinQueue);
    socket.on("offer", sendOffer);
    socket.on("answer", sendAnswer);
    socket.on("reroll", reroll);
    socket.on("disconnect", disconnect);
});


server.listen(port, () => console.log(`Active on port ${port}`));
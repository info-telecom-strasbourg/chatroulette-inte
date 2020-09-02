import express from "express";
import path from "path";
import http from "http";
import sslRedirect from "heroku-ssl-redirect";
import fs from "fs";
import socketio from "socket.io";
import expose from './expose.js';
const { __dirname } = expose;

const app = express();

var config = {};

if (process.env.NODE_ENV === "production") {
    config = {
        key: fs.readFileSync(process.env.SSL_KEY),
        cert: fs.readFileSync(process.env.SSL_CERT),
        requestCert: true,
        rejectUnauthorized: false,
        secure: true,
    };
}

const server = http.createServer(config, app);

const io = socketio(server);
const port = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public/"));
app.use(sslRedirect.default());

const route1 = process.env.ROUTE1 || "/libellule2u54OMXJq8";
const route2 = process.env.ROUTE2 || "/papillonzUUrkgmuBC";

/*****************************************************************************/
/*                                Routes                                     */
/*****************************************************************************/

// 1A
app.get(route1, (req, res) => {
    res.sendFile(path.join(__dirname + "/client/index0.html"));
});

// 2A et 3A
app.get(route2, (req, res) => {
    res.sendFile(path.join(__dirname + "/client/index1.html"));
});

/*****************************************************************************/
/*                               Logique                                     */
/*****************************************************************************/

var queue = [
    [],
    []
];

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
    console.log("Number of 1A: ");
    console.log(queue[0].length);
    console.log("Number of 2A-3A: ");
    console.log(queue[1].length);
    console.log("Connections: ");
    console.log(connectedTo.length);
    for (let i = 0; i < connectedTo.length; i++)
        console.log("User" + i + " : " + connectedTo[i].length);
    console.log("Socket list: ");
    console.log(socketList.length);
}

function connectSockets(ind, ind2) {
    console.log(ind);
    console.log(ind2);
    let pair = {
        s1: queue[0].splice(ind, 1)[0],
        s2: queue[1].splice(ind2, 1)[0]
    }

    pair.s1.pairedSocket = pair.s2;
    pair.s2.pairedSocket = pair.s1;

    if (!connectedTo[socketList.indexOf(pair.s1)].includes(pair.s2)) {
        connectedTo[socketList.indexOf(pair.s1)].push(pair.s2);
    }
    if (!connectedTo[socketList.indexOf(pair.s2)].includes(pair.s1)) {
        connectedTo[socketList.indexOf(pair.s2)].push(pair.s1);
    }
    console.log("-----socket list length and connectedTo-----");
    console.log(socketList.length);
    console.log(connectedTo.length);
    console.log("-----socket list length for both thing-----");
    console.log(connectedTo[socketList.indexOf(pair.s2)].length);
    console.log(connectedTo[socketList.indexOf(pair.s1)].length);

    pair.s2.emit("peer.init");
}

function isInHist(elt, hist) {
    return hist.includes(elt);
}

function updateQueue() {
    for (let i = 0; i < queue[0].length; i++)
        for (let j = 0; j < queue[1].length; j++)
            if (!isInHist(queue[0][i], connectedTo[socketList.indexOf(queue[1][j])])) {
                connectSockets(i, j);
                updateQueue();
                return;
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
    this.pairedSocket.emit("offer.receive", data);
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

    if (isInQueue1 != -1) queue[1].splice(isInQueue1, 1);
    else {
        let isInQueue2 = queue[0].indexOf(this);
        if (isInQueue2 != -1)
            queue[0].splice(isInQueue2, 1);
    }
    if (this.pairedSocket) {
        this.pairedSocket.emit("peer.destroy");
    }
    var indSocket = socketList.indexOf(this);
    socketList.splice(indSocket, 1);
    connectedTo.splice(indSocket, 1);
}

function reroll() {
    this.pairedSocket.emit("peer.destroy");
    this.emit("peer.destroy");
}

io.on("connection", function(socket) {
    socket.on("login", login);
    socket.on("queue.rejoin", rejoinQueue);
    socket.on("offer", sendOffer);
    socket.on("answer", sendAnswer);
    socket.on("reroll", reroll);
    socket.on("disconnect", disconnect);
});

server.listen(port, () => console.log(`Active on port ${port}`));
import express from "express";
import path from "path";
import http from "http";
import sslRedirect from "heroku-ssl-redirect";
import fs from "fs";
import socketio from "socket.io";
import expose from "./expose.js";
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

const route1 = process.env.ROUTE1 || "/libellule";
const route2 = process.env.ROUTE2 || "/papillon";
const max_score = process.env.MAX_SCORE || 100;
const score_step = process.env.SCORE_STEP || 2;
const max_hist = process.env.MAX_HIST || 5;
const update_freq = process.env.UPDATE_FREQ || 2000;

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

var queue = [[], []];

/**
 * Initialise un socket et le met dans la file d'attente
 */
function login(channel) {
    this.history = [];
    this.score = 0;
    this.auth = true;

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

    console.log("---------------");
    console.log(
        "Queue update : 1A (" +
            queue[0].length +
            ") / 2A (" +
            queue[1].length +
            ")"
    );
}

function connectSockets(ind, ind2) {
    console.log("---------------");
    console.log(
        "Queue update : 1A (" +
            queue[0].length +
            ") / 2A (" +
            queue[1].length +
            ")"
    );

    let pair = {
        s1: queue[0].splice(ind, 1)[0],
        s2: queue[1].splice(ind2, 1)[0],
    };

    pair.s1.pairedSocket = pair.s2;
    pair.s2.pairedSocket = pair.s1;

    pair.s1.score = 0;
    pair.s2.score = 0;

    pair.s1.history.unshift(pair.s2.id);
    if (pair.s1.history.length > max_hist) {
        pair.s1.history.pop();
    }

    pair.s2.emit("peer.init");
}

function updateQueue() {
    for (let i = 0; i < queue[0].length; i++) {
        for (let j = 0; j < queue[1].length; j++) {
            if (!queue[0][i].history.includes(queue[1][j].id)) {
                connectSockets(i, j);
                return;
            }
        }

        queue[0][i].score += score_step;
        if (queue[0][i].score > max_score) {
            queue[0][i].history = [];
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
    if (!this.auth) return;
    let isInQueue = queue[this.channelId].indexOf(this);

    if (isInQueue != -1) queue[this.channelId].splice(isInQueue, 1);

    if (this.pairedSocket) {
        this.pairedSocket.emit("peer.destroy");
    }
}

function reroll() {
    if (this.pairedSocket) {
        this.pairedSocket.emit("peer.destroy");
        this.emit("peer.destroy");
    }
}

io.on("connection", function (socket) {
    socket.on("login", login);
    socket.on("queue.rejoin", rejoinQueue);
    socket.on("offer", sendOffer);
    socket.on("answer", sendAnswer);
    socket.on("reroll", reroll);
    socket.on("disconnect", disconnect);
});

function send_queue_len() {
    let len = [queue[0].length, queue[1].length];
    for (let i = 0; i < queue[0].length; i++) {
        queue[0][i].emit("queue.update", len);
    }

    for (let i = 0; i < queue[1].length; i++) {
        queue[1][i].emit("queue.update", len);
    }
}

setInterval(send_queue_len, 5000);

setInterval(updateQueue, update_freq);

server.listen(port, () => console.log(`Active on port ${port}`));

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

const nsp = io.of("/stat");

app.use(express.static(__dirname + "/public/"));
app.use(sslRedirect.default());

const route1 = process.env.ROUTE1 || "*";
const route2 = process.env.ROUTE2 || "/papillon";
const max_score = process.env.MAX_SCORE || 50;
const score_step = process.env.SCORE_STEP || 2;
const max_hist = process.env.MAX_HIST || 5;
const update_freq = process.env.UPDATE_FREQ || 2000;
const TARGET_0 = 0;
const TARGET_1 = 1;
const TARGET_BOTH = 2;

/*****************************************************************************/
/*                                Routes                                     */
/*****************************************************************************/

app.get("/stat", (req, res) => {
    res.sendFile(path.join(__dirname + "/client/stat.html"));
});

// 1A
app.get(route1, (req, res) => {
    res.sendFile(path.join(__dirname + "/client/index0.html"));
});

/*****************************************************************************/
/*                               Logique                                     */
/*****************************************************************************/

var queue = [[], []];
var activeConnection = 0;

/**
 * Initialise un socket et le met dans la file d'attente
 */
function login(target, name) {
    this.history = [];
    this.pseudo = name;
    this.score = 0;
    this.auth = true;
    this.target = target;

    if (target === TARGET_BOTH || target == TARGET_0) {
        joinQueue(this, 1);
        shuffleQueue(0);
    }

    if (target === TARGET_BOTH || target == TARGET_1) {
        joinQueue(this, 0);
        shuffleQueue(1);
    }
}

function shuffleQueue(chan) {
    // On mélange la queue
    for (let i = queue[chan].length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i);
        const temp = queue[chan][i];
        queue[chan][i] = queue[chan][j];
        queue[chan][j] = temp;
    }
}

/**
 * Met dans la file d'attente le socket
 * @param socket
 */
function joinQueue(socket, channel) {
    if (channel < 0 || channel > 1) return;

    socket.channelId = channel;
    queue[channel].push(socket);

    console.log(
        "Queue update : 1A (" +
            queue[0].length +
            ") / 2A (" +
            queue[1].length +
            ")"
    );
    send_queue_len();
    updateStat();
}

function connectSockets(ind, ind2) {
    let pair = {
        s1: queue[0].splice(ind, 1)[0],
        s2: queue[1].splice(ind2, 1)[0],
    };

    if (pair.s1.target === TARGET_BOTH) {
        queue[1].splice(queue[1].indexOf(pair.s1), 1);
    }
    if (pair.s2.target === TARGET_BOTH) {
        queue[0].splice(queue[0].indexOf(pair.s2), 1);
    }

    pair.s1.pairedSocket = pair.s2;
    pair.s2.pairedSocket = pair.s1;

    pair.s1.score = 0;
    pair.s2.score = 0;

    pair.s1.history.unshift(pair.s2.id);
    if (pair.s1.history.length > max_hist) {
        pair.s1.history.pop();
    }

    console.log(
        "Queue update : 1A (" +
            queue[0].length +
            ") / 2A (" +
            queue[1].length +
            ")"
    );

    pair.s2.emit("peer.init");

    activeConnection++;

    updateStat();
    send_queue_len();
}

function updateQueue() {
    for (let i = 0; i < queue[0].length; i++) {
        for (let j = 0; j < queue[1].length; j++) {
            if (queue[0][i].id !== queue[1][j].id) {
                if (!queue[0][i].history.includes(queue[1][j].id)) {
                    connectSockets(i, j);
                    return;
                }
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
function rejoinQueue(socket) {
    if (socket.target === TARGET_BOTH || socket.target == TARGET_0) {
        joinQueue(socket, 1);
        shuffleQueue(0);
    }

    if (socket.target === TARGET_BOTH || socket.target == TARGET_1) {
        joinQueue(socket, 0);
        shuffleQueue(1);
    }
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
        activeConnection--;
        rejoinQueue(this.pairedSocket);
        this.pairedSocket.pairedSocket = null;
    }

    send_queue_len();
    updateStat();
}

function reroll() {
    if (this.pairedSocket) {
        this.pairedSocket.emit("peer.destroy");
        this.pairedSocket.pairedSocket = null;
        rejoinQueue(this.pairedSocket);
        this.pairedSocket = null;
    }
    this.emit("peer.destroy");
    rejoinQueue(this);

    activeConnection--;

    send_queue_len();
    updateStat();
}

io.on("connection", function (socket) {
    socket.on("login", login);
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

function updateStat() {
    let names1 = [],
        names2 = [];
    for (let i = 0; i < queue[0].length; i++) {
        names1.push(queue[0][i].pseudo);
    }

    for (let i = 0; i < queue[1].length; i++) {
        names2.push(queue[1][i].pseudo);
    }
    nsp.emit("queue.update", { channelId: 0, queueMembers: names1 });
    nsp.emit("queue.update", { channelId: 1, queueMembers: names2 });
    nsp.emit("activeConnection", activeConnection);
}

nsp.on("connection", (socket) => {
    updateStat();
});

setInterval(updateQueue, update_freq);

server.listen(port, () => console.log(`Active on port ${port}`));

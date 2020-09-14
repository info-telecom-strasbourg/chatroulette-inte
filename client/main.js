New let Peer = require("simple-peer");
let io = require("socket.io-client");
let socket = io();

let hostVideo = document.querySelector("#host-video");
let remoteVideo = document.querySelector("#remote-video");

let info = true;
let timeBetween2Msg = 700;

// Sert à stocker les variables globales
var client = {
    connected: false,
    peer: null,
    pseudo: "",
};

var lastSendingTime = Date.now();

var myPseudo;

let couleursPseudo = [
    "#B814A2",
    "#b331e8",
    "#142ab8",
    "#31a8e8",
    "#31e89d",
    "#31e834",
    "#206d19",
    "#dcd626",
    "#dc7e26",
    "#dc2626",
];
let myPseudoColor;
let peerPseudoColor;

let emojis = [
    "🤣",
    "🙂",
    "😄",
    "😉",
    "😘",
    "😜",
    "🤔",
    "🙈",
    "👌",
    "👍",
    "😆",
    "😮",
    "😭",
    "😱",
    "😮",
    "🙁",
    "😑",
    "😎",
    "😝",
    "😇",
    "🤩",
    "❤️",
    "😍",
    "💀",
];

function htmlEntities(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

for (let i = 0; i < emojis.length; i++) {
    var messageBlock = "";
    messageBlock += '<button class="emoji_icon">';
    messageBlock += emojis[i];
    messageBlock += "</button>";
    document.getElementById("emojis_keyboard").innerHTML += messageBlock;
}

DEBUG = true;

function debug(str) {
    if (DEBUG) {
        console.log(str);
    }
}

/**
 * Convert emoji in the chat
 */
function addEmojies(str) {
    return String(str)
        .replace(/(^xd|^xD|^XD| xd| xD| XD|:joy:)/g, " 🤣 ")
        .replace(/(^:\)| :\)|:slight_smile:)/g, " 🙂 ")
        .replace(/(^:D| :D|:smile:)/g, " 😄 ")
        .replace(/(^;\)| ;\)|:wink:)/g, " 😉 ")
        .replace(/(^:\*|\s:\*|:kiss:)/g, " 😘 ")
        .replace(/(^;p|^:p|^:P|^;P|\s;p|\s:p|\s:P|\s;P|:hey:)/g, " 😜 ")
        .replace(/(:thinking:|:think:)/g, " 🤔 ")
        .replace(/(:see_no_evil:)/g, " 🙈")
        .replace(/(:ok:)/g, " 👌 ")
        .replace(/(:yes:)/g, " 👍 ")
        .replace(/(^x\)|^X\)|\sx\)|\sX\)|:laughing:)/g, " 😆 ")
        .replace(/(^8O|\s8O|:flushed:)/g, " 😮 ")
        .replace(/(^:_\(|^;-;|\s;-;|\s:_\(|:sob:)/g, " 😭 ")
        .replace(/(^:O|\s:O|:scream:)/g, " 😱 ")
        .replace(/(^:o|\s:o|:open_mouth:)/g, " 😮 ")
        .replace(/(^:\(|\s:\(|:sad:)/g, " 🙁 ")
        .replace(/(^:\||\s:\||:neutral_face:)/g, " 😑 ")
        .replace(/(^B\)|^8\)|\sB\)|\s8\)|:sunglasses:)/g, " 😎 ")
        .replace(/(^xp|^xP|^Xp|^XP|\sxp|\sxP|\sXp|\sXP|:tongue:)/g, " 😝 ")
        .replace(/(^0:\)|^0:D|\s0:\)|\s0:D|:angel:)/g, " 😇 ")
        .replace(/(^\*-\*|\s\*-\*|:star_struck:)/g, " 🤩 ")
        .replace(/(^&lt;3|\s&lt;3|:heart:)/g, " ❤️ ")
        .replace(/(:eye_heart:)/g, " 😍 ")
        .replace(/(^x\(|^X\(|\sx\(|\sX\(|:skull:)/g, " 💀 ");
}

function remEmojis(str) {
    return String(str).replace(
        /(🤣|🙂|😄|😉|😘|😜|🤔|🙈|👌|👍|😆|😮|😭|😱|😮|🙁|😑|😎|😝|😇|🤩|❤️|😍|💀)/g,
        ""
    );
}

document.getElementById("message").addEventListener("input", function () {
    this.value = addEmojies(this.value);
});

navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
        hostVideo.srcObject = stream;
        hostVideo.play();

        /**
         * Convert all "\n" or "\r\n" or "\r" to "<br>" in a string.
         *
         * @param str: the string that will be modified.
         * @return the string without the characters specified and with the <br>
         */
        function nl2br(str) {
            return str.replace(/(\r\n|\r|\n)/g, "<br>");
        }

        /**
         * add a listener to allow "Ctrl + Enter" to send a message in the chat
         */
        document
            .getElementById("message")
            .addEventListener("keydown", function (e) {
                // 13 for enter
                if (!e.ctrlKey && e.keyCode === 13) {
                    e.preventDefault();
                    sendMessage();
                } else if (e.ctrlKey && e.keyCode === 13) document.getElementById("message").value += "\n";
            });

        document
            .getElementById("pseudo")
            .addEventListener("keydown", function (e) {
                if (!e.ctrlKey && e.keyCode === 13) {
                    e.preventDefault();
                    validateLogin();
                }
            });

        // Add a listener to validate the username
        document.getElementById("validate").onclick = validateLogin;

        /**
         * Validate the login formular and emit a signal to the socket
         */
        function validateLogin() {
            var inputPseudo = document.getElementById("pseudo");
            var pseudoError = document.getElementById("pseudo-error");
            myPseudo = nl2br(addEmojies(htmlEntities(inputPseudo.value)));

            if (myPseudo.length < 3) {
                if (!inputPseudo.classList.contains("is-invalid"))
                    inputPseudo.classList.add("is-invalid");
                pseudoError.style.display = "block";
                return;
            }
            document.getElementById("connection").style.display = "none";

            socket.emit("login", channel);

            msgSearch();
        }

        // Add listener for roulette button
        document.getElementById("roulette").onclick = roulette;

        /**
         * Reroll the users
         */
        function roulette() {
            socket.emit("reroll");
        }

        /**
         * Check if the message is just an emoji
         */
        function isJustAnEmoji(message) {
            message = remEmojis(message);
            message = message.replace(/(\s|<br>)/g, "");
            return message == "";
        }

        // Add a listener to send a message in the chat
        document.getElementById("send").onclick = sendMessage;

        /**
         * Send the message in the chat.
         */
        function sendMessage() {
            if (
                client.connected &&
                !info &&
                Date.now() - lastSendingTime > timeBetween2Msg
            ) {
                lastSendingTime = Date.now();
                var inputMsg = document.getElementById("message");
                var message = nl2br(addEmojies(htmlEntities(inputMsg.value)));
                if (message != "") {
                    inputMsg.value = "";
                    var messageBlock = "";
                    messageBlock += '<div class="message msg-left">';
                    messageBlock +=
                        '   <div class="username" style="color:' +
                        couleursPseudo[myPseudoColor] +
                        '">';
                    messageBlock += myPseudo;
                    messageBlock += "</div>";
                    messageBlock += '   <div class="msg-content';
                    if (isJustAnEmoji(message)) messageBlock += "-just-emoji";
                    messageBlock += '">';
                    messageBlock += message;
                    messageBlock += "   </div>";
                    messageBlock += "</div>";
                    document.getElementById("chat").innerHTML += messageBlock;
                    document.getElementById("chat").scrollTop =
                        document.getElementById("chat").scrollHeight -
                        document.getElementById("chat").clientHeight;
                    client.peer.send(message);
                }
            }
        }

        // Add a listener to display emojis
        document.getElementById("emojis").onclick = displayEmojis;

        /**
         * Display emojis
         */
        function displayEmojis() {
            if (
                document.getElementById("emojis_keyboard").style.display ==
                "flex"
            )
                document.getElementById("emojis_keyboard").style.display =
                    "none";
            else
                document.getElementById("emojis_keyboard").style.display =
                    "flex";
        }

        // Add a listener to add an emoji in the textarea
        for (
            let i = 0;
            i < document.getElementsByClassName("emoji_icon").length;
            i++
        ) {
            document.getElementsByClassName("emoji_icon")[
                i
            ].onclick = function () {
                addAnEmoji(
                    document.getElementsByClassName("emoji_icon")[i].innerHTML
                );
            };
        }

        /**
         * Add an emoji in the textarea
         */
        function addAnEmoji(emoji) {
            document.getElementById("message").value += emoji;
            document.getElementById("message").focus();
        }

        document
            .getElementById("message")
            .addEventListener("focus", function () {
                document.getElementById("emojis_keyboard").style.display =
                    "none";
            });

        /**
         * Initialize un objet de type Peer
         *
         * @param initiator bool
         * @return nouvelle instance de Peer
         */
        function createPeer(initiator) {
            let peer = new Peer({
                initiator: initiator,
                trickle: false,
                stream: stream,
            });

            peer.on("stream", (stream) => {
                startVideo(stream);
            });

            peer.on("connect", () => {
                client.peer.send(myPseudo);
            });

            peer.on("data", (data) => {
                if (info) {
                    myPseudoColor = Math.floor(Math.random() * 10);
                    peerPseudoColor = myPseudoColor;
                    while (peerPseudoColor === myPseudoColor)
                        peerPseudoColor = Math.floor(Math.random() * 10);
                    var divChat = document.getElementById("chat");
                    divChat.innerHTML = "";
                    var messageBlock = "";
                    messageBlock += '<div class="info">';
                    messageBlock += "   En connexion avec " + data;
                    messageBlock += "</div>";
                    divChat.innerHTML += messageBlock;
                    client.pseudo = data;
                    info = false;
                    document.getElementById("roulette").style.display = "block";
                } else {
                    var messageBlock = "";
                    messageBlock += '<div class="message">';
                    messageBlock +=
                        '   <div class="username" style="color:' +
                        couleursPseudo[peerPseudoColor] +
                        '">';
                    messageBlock += client.pseudo;
                    messageBlock += "</div>";
                    messageBlock += '   <div class="msg-content';
                    if (isJustAnEmoji(data)) messageBlock += "-just-emoji";
                    messageBlock += '">';
                    messageBlock += data;
                    messageBlock += "   </div>";
                    messageBlock += "</div>";
                    document.getElementById("chat").innerHTML += messageBlock;
                }
                document.getElementById("chat").scrollTop =
                    document.getElementById("chat").scrollHeight -
                    document.getElementById("chat").clientHeight;
            });

            return peer;
        }

        /**
         * Appelée si ce client doit être l'initiateur de la connexion
         */
        function initiatePeer() {
            debug("Init peer");
            client.connected = false;
            let peer = createPeer(true);

            peer.on("signal", function (data) {
                if (!client.connected) {
                    socket.emit("offer", data);
                }
            });

            client.peer = peer;
        }

        /**
         * Appelée si ce client doit attendre une offre
         */
        function receiveOffer(offer) {
            debug("Receive offer");

            let peer = createPeer(false);

            peer.on("signal", (data) => {
                socket.emit("answer", data);
            });

            peer.signal(offer);
            client.peer = peer;
            client.connected = true;
        }

        /**
         * Appelée quand le client reçoit une réponse
         */
        function signalAnswer(answer) {
            debug("Signal answer");

            client.connected = true;
            client.peer.signal(answer);
        }

        /**
         * Affiche le flux vidéo sur la page
         */
        function startVideo(stream) {
            remoteVideo.srcObject = stream;
            remoteVideo.play();
        }

        /**
         * Arrete la video
         */
        function removeVideo() {
            remoteVideo.pause();
            remoteVideo.srcObject = null;
        }

        function msgSearch() {
            var divChat = document.getElementById("chat");
            divChat.innerHTML = "";
            var messageBlock = "";
            messageBlock += '<div class="info">';
            messageBlock += "   En attente d'un utilisateur";
            messageBlock += "</div>";
            divChat.innerHTML += messageBlock;
        }

        /**
         * Met fin à la connexion p2p
         */
        function destroyPeer() {
            debug("destroy");
            removeVideo();
            msgSearch();

            client.connected = false;
            info = true;
            document.getElementById("roulette").style.display = "none";
            if (client.peer) {
                client.peer.destroy();
                socket.emit("queue.rejoin", channel);
            }
        }

        socket.on("peer.init", initiatePeer);
        socket.on("offer.receive", receiveOffer);
        socket.on("answer.receive", signalAnswer);
        socket.on("peer.destroy", destroyPeer);
    })
    .catch(function (err) {
        document.write(
            "Veuillez nous autoriser à utiliser votre caméra et votre microphone si vous souhaitez utiliser ce service."
        );
    });

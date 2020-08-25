let Peer = require('simple-peer');
let io = require("socket.io-client");
let socket = io();

let hostVideo = document.querySelector('#host-video');
let remoteVideo = document.querySelector('#remote-video');

let info = true;



// Sert à stocker les variables globales
var client = {
    connected: false,
    peer: null,
    pseudo: ""
};

var lastSendingTime = Date.now();


var myPseudo;

let couleursPseudo = ["#B814A2", "#b331e8", "#142ab8", "#31a8e8", "#31e89d", "#31e834", "#206d19", "#dcd626", "#dc7e26", "#dc2626"];
let myPseudoColor = Math.floor(Math.random() * 10);
let peerPseudoColor = myPseudoColor;
while (peerPseudoColor === myPseudoColor)
    peerPseudoColor = Math.floor(Math.random() * 10);

DEBUG = true;

function debug(str) {
    if (DEBUG) {
        console.log(str);
    }
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        hostVideo.srcObject = stream;
        hostVideo.play();

        /**
         * Convert all "\n" or "\r\n" or "\r" to "<br>" in a string.
         * 
         * @param str: the string that will be modified.
         * @return the string without the characters specified and with the <br>
         */
        function nl2br(str) {
            return str.replace(/(\r\n|\r|\n)/g, '<br>');
        }

        /**
         * add a listener to allow "Ctrl + Enter" to send a message in the chat
         */
        document.getElementById('message').addEventListener('keydown', function(e) {
            // 13 for enter
            if (!e.ctrlKey && e.keyCode === 13) {
                e.preventDefault();
                sendMessage();
            } else if (e.ctrlKey && e.keyCode === 13)
                document.getElementById('message').value += "\n";
        });

        // Add a listener to validate the username
        document.getElementById('validate').onclick = validateLogin;

        /**
         * Validate the login formular and emit a signal to the socket
         */
        function validateLogin() {
            var inputPseudo = document.getElementById('pseudo');
            var pseudoError = document.getElementById('pseudo-error');
            myPseudo = htmlEntities(inputPseudo.value);
            channel = parseInt(document.getElementById('annee').value);

            if (myPseudo.length < 3) {
                if (!inputPseudo.classList.contains('is-invalid'))
                    inputPseudo.classList.add('is-invalid');
                pseudoError.style.display = "block";
                return;
            }
            document.getElementById('connection').style.display = "none";

            socket.emit('login', channel);

            msgSearch();
        }

        // Add listener for roulette button
        document.getElementById('roulette').onclick = roulette;

        /**
         * Reroll the users
         */
        function roulette() {
            socket.emit('reroll');
        }

        // Add a listener to send a message in the chat
        document.getElementById('send').onclick = sendMessage;

        /**
         * Send the message in the chat.
         */
        function sendMessage() {
            if (client.connected && !info && (Date.now() - lastSendingTime) > 1000) {
                lastSendingTime = Date.now();
                var inputMsg = document.getElementById('message');
                var message = htmlEntities(nl2br(inputMsg.value));
                if (message != "") {
                    inputMsg.value = '';
                    var messageBlock = "";
                    messageBlock += '<div class="message msg-left">';
                    messageBlock += '   <div class="username" style="color:' + couleursPseudo[myPseudoColor] + '">';
                    messageBlock += myPseudo;
                    messageBlock += '</div>';
                    messageBlock += '   <div class="msg-content">';
                    messageBlock += message;
                    messageBlock += '   </div>';
                    messageBlock += '</div>';
                    document.getElementById("chat").innerHTML += messageBlock;
                    document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight - document.getElementById("chat").clientHeight;
                    client.peer.send(message);
                }
            }
        }


        /**
         * Initialize un objet de type Peer
         * 
         * @param initiator bool
         * @return nouvelle instance de Peer
         */
        function createPeer(initiator) {
            let peer = new Peer({ initiator: initiator, trickle: false, stream: stream });

            peer.on('stream', (stream) => {
                startVideo(stream);
            });

            peer.on('data', (data) => {
                if (info) {
                    var divChat = document.getElementById('chat');
                    divChat.innerHTML = "";
                    var messageBlock = "";
                    messageBlock += '<div class="info">';
                    messageBlock += '   En connection avec ' + data;
                    messageBlock += '</div>';
                    divChat.innerHTML += messageBlock;
                    client.pseudo = data;
                    info = false;
                    document.getElementById('roulette').style.display = "block";
                } else {
                    var messageBlock = "";
                    messageBlock += '<div class="message">';
                    messageBlock += '   <div class="username" style="color:' + couleursPseudo[peerPseudoColor] + '">';
                    messageBlock += client.pseudo;
                    messageBlock += '</div>';
                    messageBlock += '   <div class="msg-content">';
                    messageBlock += data;
                    messageBlock += '   </div>';
                    messageBlock += '</div>';
                    document.getElementById("chat").innerHTML += messageBlock;
                }
                document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight - document.getElementById("chat").clientHeight;
            });

            return peer;
        }

        /**
         * Appelée si ce client doit être l'initiateur de la connection
         */
        function initiatePeer() {
            debug("Init peer");
            client.connected = false;
            let peer = createPeer(true);

            peer.on('signal', function(data) {
                if (!client.connected) {
                    socket.emit('offer', data);
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

            peer.on('signal', (data) => {
                socket.emit('answer', data);
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
            setTimeout(() => { client.peer.send(myPseudo) }, 1000);
        }

        /**
         * Arrete la video
         */
        function removeVideo() {
            remoteVideo.pause();
            remoteVideo.srcObject = null;
        }

        function msgSearch() {
            var divChat = document.getElementById('chat');
            divChat.innerHTML = "";
            var messageBlock = "";
            messageBlock += '<div class="info">';
            messageBlock += "   En attente d'un utilisateur";
            messageBlock += '</div>';
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
            document.getElementById('roulette').style.display = "none";
            if (client.peer) {
                client.peer.destroy();
                socket.emit("queue.rejoin", channel);
            }
        }

        socket.on("peer.init", initiatePeer);
        socket.on("offer.receive", receiveOffer);
        socket.on("answer.receive", signalAnswer);
        socket.on("peer.destroy", destroyPeer)
    })
    .catch(function(err) {
        document.write("Veuillez nous autoriser à utiliser votre caméra et votre microphone si vous souhaitez utiliser ce service.");
    });
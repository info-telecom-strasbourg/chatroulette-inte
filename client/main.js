let Peer = require('simple-peer');
let io = require("socket.io-client");
let socket = io();

let hostVideo = document.querySelector('#host-video');
let remoteVideo = document.querySelector('#remote-video');

let info = new Boolean(true);


// Sert à stocker les variables globales
var client = {
    connected: false,
    peer: null,
    pseudo: ""
};

DEBUG = true;

function debug(str) {
    if (DEBUG) {
        console.log(str);
    }
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
        document.getElementById('message').addEventListener('keydown', function (e) {
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
            pseudo = nl2br(inputPseudo.value);
            channel = parseInt(document.getElementById('annee').value);

            if (pseudo.length < 3) {
                if (!inputPseudo.classList.contains('is-invalid'))
                    inputPseudo.classList.add('is-invalid');
                pseudoError.style.display = "block";
                return;
            }

            document.getElementById('connection').style.display = "none";

            socket.emit('login', channel);
        }

        // Add a listener to send a message in the chat
        document.getElementById('send').onclick = sendMessage;

        /**
         * Send the message in the chat.
         */
        function sendMessage() {
            if (client.connected) {
                var inputMsg = document.getElementById('message');
                var message = nl2br(inputMsg.value);
                inputMsg.value = '';
                var messageBlock = "";
                messageBlock += '<div class="message">';
                messageBlock += '   <div class="username">';
                messageBlock += pseudo;
                messageBlock += '</div>';
                messageBlock += '   <div class="msg-content">';
                messageBlock += message;
                messageBlock += '   </div>';
                messageBlock += '</div>';
                document.getElementById("chat").innerHTML += messageBlock;
                client.peer.send(message);
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
                    var messageBlock = "";
                    messageBlock += '<div class="info">';
                    messageBlock += '   Connection avec ' + data;
                    messageBlock += '</div>';
                    document.getElementById("chat").innerHTML += messageBlock;
                    client.pseudo = data;
                    info = false;
                } else {
                    var messageBlock = "";
                    messageBlock += '<div class="message msg-peer">';
                    messageBlock += '   <div class="username">';
                    messageBlock += client.pseudo;
                    messageBlock += '</div>';
                    messageBlock += '   <div class="msg-content">';
                    messageBlock += data;
                    messageBlock += '   </div>';
                    messageBlock += '</div>';
                    document.getElementById("chat").innerHTML += messageBlock;
                }
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

            peer.on('signal', function (data) {
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
            setTimeout(() => { client.peer.send(pseudo); }, 1000);
        }

        /**
         * Appelée quand le client reçoit une réponse
         */
        function signalAnswer(answer) {
            debug("Signal answer");

            client.connected = true;
            client.peer.signal(answer);
            setTimeout(() => { client.peer.send(pseudo); }, 1000);
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
        function removeVideo() { }

        /**
         * Met fin à la connexion p2p
         */
        function destroyPeer() {
            removeVideo();

            client.connected = false;
            if (client.peer) {
                client.peer.destroy();
            }
        }

        socket.on("peer.init", initiatePeer);
        socket.on("offer.receive", receiveOffer);
        socket.on("answer.receive", signalAnswer);
        socket.on("peer.destroy", destroyPeer)
    })
    .catch(function (err) {
        document.write("Veuillez nous autoriser à utiliser votre caméra et votre microphone si vous souhaitez utiliser ce service.");
    });
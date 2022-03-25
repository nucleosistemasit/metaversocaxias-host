var buildUrl = "../docs/Build";
var loaderUrl = buildUrl + "/PALESTRA_METAVERSOCAXIAS_DEV.loader.js";
var config = {
    dataUrl: buildUrl + "/PALESTRA_METAVERSOCAXIAS_DEV.data",
    frameworkUrl: buildUrl + "/PALESTRA_METAVERSOCAXIAS_DEV.framework.js",
    codeUrl: buildUrl + "/PALESTRA_METAVERSOCAXIAS_DEV.wasm",
    streamingAssetsUrl: "StreamingAssets",
    companyName: "Núcleo",
    productName: "Metaverso Caxias",
    productVersion: "0.1",
};

var container = document.querySelector("#unity-container");
var canvas = document.querySelector("#unity-canvas");
var loadingBar = document.querySelector("#unity-loading-bar");
var progressBarFull = document.querySelector("#unity-progress-bar-full");
var fullscreenButton = document.querySelector("#unity-fullscreen-button");
var mobileWarning = document.querySelector("#unity-mobile-warning");

// By default Unity keeps WebGL canvas render target size matched with
// the DOM size of the canvas element (scaled by window.devicePixelRatio)
// Set this to false if you want to decouple this synchronization from
// happening inside the engine, and you would instead like to size up
// the canvas DOM size and WebGL render target sizes yourself.
// config.matchWebGLToCanvasSize = false;

if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    container.className = "unity-mobile";
  // Avoid draining fillrate performance on mobile devices,
  // and default/override low DPI mode on mobile browsers.
    config.devicePixelRatio = 1;
    mobileWarning.style.display = "block";
    setTimeout(() => {
        mobileWarning.style.display = "none";
    }, 5000);
} 
else {
  // canvas.style.width = "960px";
  // canvas.style.height = "600px";
}
loadingBar.style.display = "block";

var gameInstance = null;
var script = document.createElement("script");
var slideIndex = 0;
var hostIndex = -1;
var connectionStatus = "DESCONECTADO";
var connectionCount = 0;
var micStatus = true;
var mediaStream = null;
var audioDeviceId = '';
const socket = io.connect('https://tecnicaspedagogicas.com.br:443');
var producer = null;
var rc = null;
script.src = loaderUrl;
script.onload = () => {
    createUnityInstance(canvas, config, (progress) => {
        progressBarFull.style.width = 100 * progress + "%";
    }).then((unityInstance) => {
        gameInstance = unityInstance;
        loadingBar.style.display = "none";
        document.getElementById("start-connection").disabled = false;
        document.getElementById("previous-slide").disabled = false;
        document.getElementById("next-slide").disabled = false;
        document.getElementById("toggle-mic").disabled = false;
        document.getElementById("palestrante-1").disabled = false;
        document.getElementById("palestrante-2").disabled = false;
        document.getElementById("palestrante-3").disabled = false;
        document.getElementById("palestrante-4").disabled = false;
        document.getElementById("stopTalk").disabled = false;
//           fullscreenButton.onclick = () => {
//             unityInstance.SetFullscreen(1);
//           };
    }).catch((message) => {
        alert(message);
    });
};

socket.request = function request(type, data = {}) {
    return new Promise((resolve, reject) => {
        socket.emit(type, data, (data) => {
            if (data.error) {
                reject(data.error)
            } else {
        resolve(data)
            }
        })
    })
}

function startAudioStream() {
    setTimeout(function() {rc.produce(RoomClient.mediaType.audio, audioDeviceId);}, 5000);
}

var entityMap = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
     "'": '&#39;',
     '`': '&#x60;'
};
function escapeHtml(string) {
    return String(string).replace(/[<>"'`]/g, function(s) {
        return entityMap[s];
    });
}

document.body.appendChild(script);

document.getElementById("start-connection").addEventListener("click", starthost);

var selectedMessageId = null;
function sendReply(element) {
    let id = element.closest('.msg-container').dataset.id;
    console.log(id);
    selectedMessageId = id;
}

async function starthost() {
    document.getElementById("start-connection").disabled = true;
    if (mediaStream == null) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioDeviceId = mediaStream.getAudioTracks()[0].getSettings().deviceId;
    }
    if (rc && rc.isOpen()) {
        console.log('Already connected to a room');
    } 
    else {
        rc = new RoomClient(null, null, null, window.mediasoupClient, socket,
            "metaversosul-nucleo-1", "metaversosul-nucleo-1-host", startAudioStream);
    }

    let authToken = localStorage.getItem('authToken');
    const chatSocket = new ReconnectingWebSocket('ws://127.0.0.1:8000/ws/chat/talk/?token=' + authToken);

    chatSocket.onopen = function(e) {
        document.getElementById("status").innerHTML = "Online";
        document.getElementById("status").classList.add('conn-on');
        document.getElementById("status").classList.remove('conn-off');
        chatSocket.send(JSON.stringify({"command": "connect"}));

    var loopInterval = setInterval(function() {
        chatSocket.send(JSON.stringify({type: 'command', content: slideIndex, name: 'slideSet'}));
        chatSocket.send(JSON.stringify({type: 'command', content: hostIndex, name: 'changeHost'}));
        }, 5000);
    };
    
    function printMessage (data, messageBlock) {
        if (data.content != null && data.content.trim() !== '') {
            let peerNode = document.createElement('div');
            let messageReply = '';
            if (data.reply_to != null) {
                messageReply = '<span class="reply-chat">' +
                                        '<strong class="s-reply-chat">' + 
                                            data.reply_to.username +
                                        '</strong>' +
                                        data.reply_to.content +
                                    '</span>';
            }
            peerNode.dataset.id = data.id;
            if (data.is_admin) {
                peerNode.classList.add('mod-msg')
            }
            peerNode.classList.add('msg-container');
            let messageMenu = '<span id="messageMenu" class="msg-menu">' +
                                    '<span id="replyMenu-' + data.id + '" class="menu-reply" onclick="sendReply(this)">⬅</span>' +      
                                    '<span id="reactionMenu-' + data.id + '" class="menu-reactions" onclick="sendReaction()">' +
                                    '<span class="reaction" onclick="toggleReaction()">👍</span>' +
                                    '<span class="reaction" onclick="toggleReaction()">👏</span>' +
                                    '<span class="reaction" onclick="toggleReaction()">❤</span>' +
                                    '<span class="reaction" onclick="toggleReaction()">🙌</span>' +
                                    '<span class="reaction" onclick="toggleReaction()">😮</span>' +
                                    '<span class="reaction" onclick="toggleReaction()">🤣</span>' +
                                    '</span>' +
                                '</span>';
            let reactionNode = '';
            if (data.reaction_1 > 0) {
                reactionNode += '<span class="reaction">👍 ' + data.reaction_1 + '</span>';
            }
            if (data.reaction_2 > 0) {
                reactionNode += '<span class="reaction">👏 ' + data.reaction_2 + '</span>';
            }
            if (data.reaction_3 > 0) {
                reactionNode += '<span class="reaction">❤ ' + data.reaction_3 + '</span>';
            }
            if (data.reaction_4 > 0) {
                reactionNode += '<span class="reaction">🙌 ' + data.reaction_4 + '</span>';
            }
            if (data.reaction_5 > 0) {
                reactionNode += '<span class="reaction">😮 ' + data.reaction_5 + '</span>';
            }
            if (data.reaction_6 > 0) {
                reactionNode += '<span class="reaction">🤣 ' + data.reaction_6 + '</span>';
            }
            
            peerNode.innerHTML = '<p class="p-messaged-chat"><strong class="s-messaged-chat">' + 
                                    escapeHtml(data.username) + 
                                    '</strong> ' + 
                                    messageReply +
                                    linkifyHtml(escapeHtml(data.content), {target: '_blank'}) + 
                                    '<span class="msg-reactions">' +
                                    reactionNode +                                        
                                    '</span>' +
                                    messageMenu +
                                    '</p>' +
                                  '</span>';
            messageBlock.appendChild(peerNode);
            document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
        }
    }
    
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log('data', data);
              // Palestrante recebe pacote
    if (data.type == 'chat_message') {
        let messageBlock = document.getElementById('chat');
        printMessage(data, messageBlock);
    }
    else if (data.type == 'chat_history'){
        let messageBlock = document.createElement('div');
        messageBlock.classList.add("message-block");
        document.getElementById('chat').prepend(messageBlock);
        for (message of data.messages) {
            printMessage(message, messageBlock);
        }
    }
    else if (data.type == 'command') {
    }
    else if (data.type == 'chat_connection') {
        connectionCount++;
        document.getElementById('conexoes').innerHTML = connectionCount;
        let peerNode = document.createElement('p');
        peerNode.className = "p-entered-chat";
        peerNode.innerHTML = '<strong class="s-entered-chat">' + escapeHtml(data.username) + '</strong> entrou na sala.';
        document.getElementById('chat').appendChild(peerNode);
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    }
    else if (data.type == 'disconnection') {
        connectionCount--;
        document.getElementById('conexoes').innerHTML = connectionCount;
        let peerNode = document.createElement('p');
        peerNode.className = "p-exited-chat";
        peerNode.innerHTML = '<strong class="s-exited-chat">' + escapeHtml(data.name) + '</strong> saiu da sala.';
        document.getElementById('chat').appendChild(peerNode);
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
        }
    };

    chatSocket.onclose = function(e) {
        console.log('host disconnected');
    };        

    document.getElementById('toggle-mic').addEventListener("click", function() {
        if (micStatus == true) {
        // Disable mic
            micStatus = false;
            document.getElementById("toggle-mic").innerHTML = "Desligado";
            document.getElementById("toggle-mic").classList.add('mic-off');
            document.getElementById("toggle-mic").classList.remove('mic-on');
            mediaStream.getAudioTracks()[0].enabled = false;
            rc.closeProducer(RoomClient.mediaType.audio);
    }
        else {
        // Enable mic
            micStatus = true;
            document.getElementById("toggle-mic").innerHTML = "Ligado";
            document.getElementById("toggle-mic").classList.add('mic-on');
            document.getElementById("toggle-mic").classList.remove('mic-off');
            mediaStream.getAudioTracks()[0].enabled = true;
            rc.produce(RoomClient.mediaType.audio, audioDeviceId);
    }
    });

    const sendButton = document.getElementById("send-message");

    sendButton.addEventListener("click", function() {
        // Send message
        let messageTextarea = document.getElementById('message-content');
        let messageContent = messageTextarea.value;

        if (messageContent != null && messageContent.trim() !== '') {
            let messageData = {"command": "chat", "content": messageContent};
            if (selectedMessageId != null) {
                messageData.reply_to = selectedMessageId;
            }
            chatSocket.send(JSON.stringify(messageData));

            // Print message
            // let peerNode = document.createElement('p');
            // peerNode.className = "p-messaged-chat";
            // peerNode.innerHTML = '<strong class="s-messaged-chat">Palestrante</strong> ' + linkifyHtml(escapeHtml(messageContent), {target: '_blank'});
            // document.getElementById('chat').appendChild(peerNode);
            // document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;

            // Clear textarea
            messageTextarea.value = '';
            selectedMessageId = null;
        }            
    });

    document.getElementById('message-content').addEventListener('keyup', function(e) {
        if (e.keyCode == 13) {
        sendButton.click();
    }
    });
  
    const previousButton = document.getElementById("previous-slide");
    const nextButton = document.getElementById("next-slide");

    previousButton.addEventListener("click", function() {
    // Host envia "voltar slide"
        chatSocket.send(JSON.stringify({type: 'command', content: 'previous'}));
        gameInstance.SendMessage('ScriptHandler', 'SlideChange', 'previous');
    if (slideIndex > 0){
      slideIndex--;
    }
    });
  
    nextButton.addEventListener("click", function() {
    // Host envia "avançar slide"
        chatSocket.send(JSON.stringify({type: 'command', content: 'next'}));
        gameInstance.SendMessage('ScriptHandler', 'SlideChange', 'next');
        slideIndex++;
    });

    const palestrante1 = document.getElementById("palestrante-1");
    const palestrante2 = document.getElementById("palestrante-2");
    const palestrante3 = document.getElementById("palestrante-3");
    const palestrante4 = document.getElementById("palestrante-4");
    const stopTalk = document.getElementById("stopTalk");

    palestrante1.addEventListener("click", function() {
        hostIndex = 0;
        chatSocket.send(JSON.stringify({type: 'command', content: 0, name: 'changeHost'}));
        gameInstance.SendMessage('ScriptHandler', 'WhichPalestranteWillTalk', 0);      
    });

    palestrante2.addEventListener("click", function() {
        hostIndex = 1;
        chatSocket.send(JSON.stringify({type: 'command', content: 1, name: 'changeHost'}));
        gameInstance.SendMessage('ScriptHandler', 'WhichPalestranteWillTalk', 1);      
    });

    palestrante3.addEventListener("click", function() {
        hostIndex = 2;
        chatSocket.send(JSON.stringify({type: 'command', content: 2, name: 'changeHost'}));
        gameInstance.SendMessage('ScriptHandler', 'WhichPalestranteWillTalk', 2);      
    });

    palestrante4.addEventListener("click", function() {
        hostIndex = 3;
        chatSocket.send(JSON.stringify({type: 'command', content: 3, name: 'changeHost'}));
        gameInstance.SendMessage('ScriptHandler', 'WhichPalestranteWillTalk', 3);      
    });

    stopTalk.addEventListener("click", function() {
        hostIndex = -1;
        chatSocket.send(JSON.stringify({type: 'command', content: -1, name: 'changeHost'}));
        gameInstance.SendMessage('ScriptHandler', 'WhichPalestranteWillTalk', -1);      
    });
}
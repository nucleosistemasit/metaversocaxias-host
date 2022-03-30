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
var current_page = 1;
var chatSocket = null;
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

function sendReply(element) {
    let reply_preview = document.getElementById("replyPreview");
    let reply_chat = document.getElementById("replyChat");
    let reply_s_chat = document.getElementById("sReplyChat");

    let id = element.closest('.msg-container').dataset.id;
    let content = element.closest('.p-messaged-chat').querySelector('.msg-content').textContent;
    let name = element.closest('.p-messaged-chat').querySelector('.s-messaged-chat').textContent;

    reply_preview.classList.remove("reply-off");
    reply_chat.innerHTML = content;
    reply_s_chat.innerHTML = name;
    reply_preview.dataset.id = id;
}

function closeReply() {
    document.getElementById("replyPreview").dataset.id = "";
    document.getElementById("replyPreview").classList.add("reply-off");
}

function loadNextPage(event) {
    let chatContainer = document.getElementById("chat");
    if (event.target.scrollTop == 0) {
        chatContainer.removeEventListener("scroll", loadNextPage);
        chatSocket.send(JSON.stringify({"command": "next_page", page_number: current_page}));
    }
}

function setInfiniteScroll() {
    let chatContainer = document.getElementById("chat");
    chatContainer.removeEventListener("scroll", loadNextPage);
    chatContainer.addEventListener("scroll", loadNextPage);
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
    chatSocket = new ReconnectingWebSocket('ws://127.0.0.1:8000/ws/chat/talk/?token=' + authToken);

    chatSocket.onopen = function(e) {
        document.getElementById("status").innerHTML = "Online";
        document.getElementById("status").classList.add('conn-on');
        document.getElementById("status").classList.remove('conn-off');
        chatSocket.send(JSON.stringify({"command": "connect"}));

    var loopInterval = setInterval(function() {
        chatSocket.send(JSON.stringify({"command": "control", content: slideIndex, name: 'slideSet'}));
        chatSocket.send(JSON.stringify({"command": "control", content: hostIndex, name: 'changeHost'}));
        }, 5000);
    };

    function printMessage (data, messageBlock, scrollToBottom) {
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
                                    '<span class="msg-content">' + linkifyHtml(escapeHtml(data.content), {target: '_blank'}) + '</span>' +
                                    '<span class="msg-reactions">' +
                                    reactionNode +                                        
                                    '</span>' +
                                    messageMenu +
                                    '</p>' +
                                  '</span>';
            messageBlock.appendChild(peerNode);
            if (scrollToBottom) {
                if (data.from_me) {
                    document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
                }
            }
            else {
                let messageBlockHeight = messageBlock.clientHeight;
                document.getElementById('chat').scrollTop = messageBlockHeight;
            }
        }
    }
    
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log('data', data);
              // Palestrante recebe pacote
    if (data.type == 'chat_message') {
        let messageBlock = document.getElementById('chat');
        printMessage(data, messageBlock, true);
    }
    else if (data.type == 'chat_history'){
        let messageBlock = document.createElement('div');
        messageBlock.classList.add("message-block");
        document.getElementById('chat').prepend(messageBlock);
        for (message of data.messages) {
            printMessage(message, messageBlock, false);
        }
        current_page++;
        if (data.has_next_page) {
            setInfiniteScroll();
        }
    }
    else if (data.type == 'chat_control') {
        if (data.name != null && data.name == 'slideChange'){
            gameInstance.SendMessage('ScriptHandler', 'SlideChange', data.content);
        }
        else if (data.name != null && data.name == 'changeHost'){
            gameInstance.SendMessage('ScriptHandler', 'WhichPalestranteWillTalk', data.content);
        }
        else if (data.name != null && data.name == 'slideSet'){
            gameInstance.SendMessage('ScriptHandler', 'SlideSet', data.content);
        }
    }
    else if (data.type == 'chat_start') {
        if (data.username != null) {
            document.getElementById("host-name").textContent = data.username;
        }
        if (data.profile_picture != null) {
            document.getElementById("host-picture").src = data.profile_picture;
        }
        if (data.permissions.includes('chat.can_control_presentation_slides')) {
            document.getElementById("slide-header").style.display = '';
            document.getElementById("previous-slide").style.display = '';
            document.getElementById("next-slide").style.display = '';
        }
        if (data.permissions.includes('chat.can_control_microphone')) {
            document.getElementById("mic-header").style.display = '';
            document.getElementById("toggle-mic").style.display = '';
        }
        if (data.permissions.includes('chat.can_export_talk_to_csv')) {
            document.getElementById("animation-header").style.display = '';
            document.getElementById("palestrante-1").style.display = '';
            document.getElementById("palestrante-2").style.display = '';
            document.getElementById("palestrante-3").style.display = '';
            document.getElementById("palestrante-4").style.display = '';
            document.getElementById("stop-talk").style.display = '';
        }
        if (data.permissions.includes('chat.can_export_exhibition_to_csv')) {
            document.getElementById("export-header").style.display = '';
            document.getElementById("download-csv").style.display = '';
        }
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
    else if (data.type == 'chat_disconnection') {
        connectionCount--;
        document.getElementById('conexoes').innerHTML = connectionCount;
        let peerNode = document.createElement('p');
        peerNode.className = "p-exited-chat";
        peerNode.innerHTML = '<strong class="s-exited-chat">' + escapeHtml(data.username) + '</strong> saiu da sala.';
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
            if (document.getElementById("replyPreview").dataset.id != "") {
                messageData.reply_to = document.getElementById("replyPreview").dataset.id;
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
            closeReply();
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
        chatSocket.send(JSON.stringify({"command": "control", content: 'previous', name: 'slideChange'}));
    });
  
    nextButton.addEventListener("click", function() {
    // Host envia "avançar slide"
        chatSocket.send(JSON.stringify({"command": "control", content: 'next', name: 'slideChange'}));
        slideIndex++;
    });

    const palestrante1 = document.getElementById("palestrante-1");
    const palestrante2 = document.getElementById("palestrante-2");
    const palestrante3 = document.getElementById("palestrante-3");
    const palestrante4 = document.getElementById("palestrante-4");
    const stopTalk = document.getElementById("stopTalk");

    palestrante1.addEventListener("click", function() {
        hostIndex = 0;
        chatSocket.send(JSON.stringify({"command": "control", content: 0, name: 'changeHost'}));
    });

    palestrante2.addEventListener("click", function() {
        hostIndex = 1;
        chatSocket.send(JSON.stringify({"command": "control", content: 1, name: 'changeHost'}));
    });

    palestrante3.addEventListener("click", function() {
        hostIndex = 2;
        chatSocket.send(JSON.stringify({"command": "control", content: 2, name: 'changeHost'}));
    });

    palestrante4.addEventListener("click", function() {
        hostIndex = 3;
        chatSocket.send(JSON.stringify({"command": "control", content: 3, name: 'changeHost'}));
    });

    stopTalk.addEventListener("click", function() {
        hostIndex = -1;
        chatSocket.send(JSON.stringify({"command": "control", content: -1, name: 'changeHost'}));
    });
}
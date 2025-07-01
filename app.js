// Simple Video Chat WebRTC App
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isCaller = false;

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ]
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCameraBtn = document.getElementById('startCamera');
const createCallBtn = document.getElementById('createCall');
const joinCallBtn = document.getElementById('joinCall');
const hangUpBtn = document.getElementById('hangUp');
const signalingData = document.getElementById('signalingData');
const remoteData = document.getElementById('remoteData');
const submitRemoteDataBtn = document.getElementById('submitRemoteData');
const statusDiv = document.getElementById('status');

function setStatus(msg) {
    statusDiv.textContent = msg;
}

startCameraBtn.onclick = async () => {
    startCameraBtn.disabled = true;
    setStatus('Accessing camera...');
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        createCallBtn.disabled = false;
        joinCallBtn.disabled = false;
        setStatus('Camera started. Ready to create or join a call.');
    } catch (e) {
        setStatus('Error accessing camera: ' + e.message);
        startCameraBtn.disabled = false;
    }
};

createCallBtn.onclick = async () => {
    isCaller = true;
    createCallBtn.disabled = true;
    joinCallBtn.disabled = true;
    hangUpBtn.disabled = false;
    setStatus('Creating call...');
    await startPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    signalingData.value = JSON.stringify(peerConnection.localDescription);
    signalingData.readOnly = false;
    submitRemoteDataBtn.disabled = false;
    setStatus('Share the offer with your peer.');
};

joinCallBtn.onclick = async () => {
    isCaller = false;
    createCallBtn.disabled = true;
    joinCallBtn.disabled = true;
    hangUpBtn.disabled = false;
    setStatus('Paste the offer from the caller and submit.');
    submitRemoteDataBtn.disabled = false;
};

submitRemoteDataBtn.onclick = async () => {
    try {
        const data = JSON.parse(remoteData.value);
        if (!peerConnection) await startPeerConnection();
        if (data.type === 'offer') {
            setStatus('Received offer. Creating answer...');
            await peerConnection.setRemoteDescription(data);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            signalingData.value = JSON.stringify(peerConnection.localDescription);
            signalingData.readOnly = false;
            setStatus('Share the answer with the caller.');
        } else if (data.type === 'answer') {
            setStatus('Received answer. Connecting...');
            await peerConnection.setRemoteDescription(data);
        } else if (data.candidate) {
            setStatus('Received ICE candidate. Adding...');
            await peerConnection.addIceCandidate(data);
        }
    } catch (e) {
        setStatus('Invalid signaling data: ' + e.message);
    }
};

hangUpBtn.onclick = () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject = null;
    }
    hangUpBtn.disabled = true;
    createCallBtn.disabled = !startCameraBtn.disabled;
    joinCallBtn.disabled = !startCameraBtn.disabled;
    signalingData.value = '';
    remoteData.value = '';
    submitRemoteDataBtn.disabled = true;
    setStatus('Call ended.');
};

async function startPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    // Add local tracks
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // When remote track arrives
    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
    };

    // ICE candidate handling
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            signalingData.value = JSON.stringify(event.candidate);
            signalingData.readOnly = false;
            setStatus('New ICE candidate. Share with peer.');
        }
    };

    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
            setStatus('Connected!');
        } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
            setStatus('Disconnected.');
        }
    };
}

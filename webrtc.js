
window.pc = null
window.dc = null
window.audio = null
window.blocks = []

function initWebrtc(audioElement) {
  audio = audioElement
  createPeerConnection()
  dc = pc.createDataChannel('chat')
  dc.onmessage = (e) => {
    handleMessage(e.data)
  }
  negotiate()
}

function createPeerConnection() {
  let config = {
    sdpSemantics: 'unified-plan',
    iceServers: [{urls: ['stun:stun.l.google.com:19302']}]
  }

  pc = new RTCPeerConnection(config)
  pc.addEventListener('track', (e) => {
    if (e.track.kind == 'audio') {
      audio.srcObject = e.streams[0]
      audio.play()
    }
  })

  pc.addTransceiver('audio', {direction: 'recvonly'})
}

function negotiate() {
  pc.createOffer().then((offer) => {
    offer.sdp = offer.sdp?.replace("useinbandfec=1", "useinbandfec=1; stereo=1; maxaveragebitrate=510000")
    return pc.setLocalDescription(offer);
  }).then( () => {
    return new Promise((resolve) => {
      if (pc.iceGatheringState == 'complete') {
        resolve()
      } else {
        checkState = () => {
          if (pc.iceGatheringState == 'complete') {
            pc.removeEventListener('icegaterhingstatechange', checkState)
            resolve()
          }
        }
        pc.addEventListener('icegatheringstatechange', checkState)
      }
    })
  }).then(() => {
    offer = pc.localDescription
    return fetch('https://devmixer.mix.audio/offer', {
    // return fetch('http://localhost:8000/offer', {
      body: JSON.stringify({
        sdp: offer?.sdp,
        type: offer?.type
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    })
  }).then((response) => {
    return response.json()
  }).then((answer) => {
    console.log(answer)
    return pc.setRemoteDescription(answer)
  })
}

function handleMessage(message) {
  if (message.substr(0, 4) == 'json') {
    data = JSON.parse(message.substr(5))
    if (data['data']) {
      if (data['data']['blocks']) {
        blocks = JSON.parse(data['data']['blocks'])
        console.log('block updated')
        window.blockUpdated = true
      }
    }
  }
}

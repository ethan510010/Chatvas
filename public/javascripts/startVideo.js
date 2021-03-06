// video 區塊
const videoDisplayDiv = document.querySelector('.videoPopup');

const launchVideoBtn = document.querySelector('.launchVideo');
launchVideoBtn.addEventListener('click', async function () {
  videoDisplayDiv.style.display = 'block';
})

// 啟動視訊按鈕 (因為拔掉開啟螢幕按鈕，這邊先註解掉)
// const startVideoBtn = document.querySelector('.video_button_area .call');
// startVideoBtn.addEventListener('click', function () {
//   // 正在看遠端影片按下 startVideo 會跳 alert
//   if (roomPlayingVideoRecords[currentSelectedRoom.roomId]) {
//     showCustomAlert('The remote video is playing. Please hang up the call before');
//     return;
//   }
//   startVideo();
// })

// 處理 stream
// 播放者是否仍在播放中
let isPlayingLocalVideo = false;
// 接收者是否正在看影片中
let isWatchingRemoteVideo = false;
// get the video and display it with permission
async function startVideo() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCustomAlert('getUserMedia is not supported');
    return;
  } else {
    const constraints = {
      video: true
    }
    try {
      // 獲取螢幕
      const videoStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      // 獲取聲音
      const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      let tracks = [...videoStream.getTracks(), ...audioStream.getAudioTracks()];
      const assembleStream = new MediaStream(tracks);
      gotMediaStream(assembleStream);
    } catch (error) {
      handleError(error);
    }
  }
}

function handleError(err) {
  // showCustomAlert(err.message);
  console.log('getUserMedia error:', err); 
}

function gotMediaStream(stream) {
  
  recStream(stream, 'localVideo');
  window.localstream = stream;
}

function recStream(stream, elemid) {
  const mainAreaTag = document.querySelector('.videoPopup .main_area');
  const originalLocalVideoTag = document.getElementById('localVideo');
  const originalRemoteVideoTag = document.getElementById('remoteVideo');
  switch (elemid) {
    case 'localVideo':
      if (originalRemoteVideoTag) {
        mainAreaTag.removeChild(originalRemoteVideoTag);
      }
      mainAreaTag.removeChild(originalLocalVideoTag);
      const newVideoTag = document.createElement('video');
      newVideoTag.setAttribute('id', 'localVideo');
      newVideoTag.style.height = 'calc(100% - 60px)';
      newVideoTag.srcObject = stream;
      newVideoTag.autoplay = true;
      newVideoTag.playsinline = true;
      mainAreaTag.prepend(newVideoTag);
      // 代表廣播者已經開啟視訊了
      isPlayingLocalVideo = true;
      // socket.emit('theRoomIsPlaying', theRoomIsPlaying);
      break;
    case 'remoteVideo':
      if (originalLocalVideoTag) {
        mainAreaTag.removeChild(originalLocalVideoTag);
      }
      mainAreaTag.removeChild(originalRemoteVideoTag);
      const newRemoteVideoTag = document.createElement('video');
      newRemoteVideoTag.setAttribute('id', 'remoteVideo');
      newRemoteVideoTag.style.height = 'calc(100% - 60px)';
      newRemoteVideoTag.srcObject = stream;
      newRemoteVideoTag.autoplay = true;
      newRemoteVideoTag.playsinline = true;
      mainAreaTag.prepend(newRemoteVideoTag);
      isWatchingRemoteVideo = true;
      break;
  }
  window.peer_stream = stream;
}
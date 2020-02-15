// video 區塊
const videoDisplayDiv = document.querySelector('.videoPopup');

const launchVideoBtn = document.querySelector('.lower_section .launchVideo');
launchVideoBtn.addEventListener('click', async function () {
  videoDisplayDiv.style.display = 'block';
})

// 啟動視訊按鈕
const startVideoBtn = document.querySelector('.video_button_area .call');
startVideoBtn.addEventListener('click', function () {
  // 正在看遠端影片按下 startVideo 會跳 alert
  if (isWatchingRemoteVideo) {
    showCustomAlert('The remote video is playing. Please hang up the call before');
    return;
  }
  startVideo();
})

// get the video and display it with permission
function startVideo() {
  if (!navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia) {
    showCustomAlert('getUserMedia is not supported');
    return;
  } else {
    const constraints = {
      video: true,
      audio: {
        echocancellation: true,
      }
    }
    // 獲取本機視訊
    navigator.mediaDevices.getDisplayMedia(constraints)
      .then(gotMediaStream)
      .catch(handleError);
  }
}

function handleError(err) {
  console.log('getUserMedia error:', err);
}

function gotMediaStream(stream) {
  window.localstream = stream;
  recStream(stream, 'localVideo');
}
// 處理 stream
// 播放者是否仍在播放中
let isPlayingLocalVideo = false;
// 接收者是否正在看影片中
let isWatchingRemoteVideo = false;

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
      newVideoTag.style.height = 'calc(100% - 40px)';
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
      newRemoteVideoTag.style.height = 'calc(100% - 40px)';
      newRemoteVideoTag.srcObject = stream;
      newRemoteVideoTag.autoplay = true;
      newRemoteVideoTag.playsinline = true;
      mainAreaTag.prepend(newRemoteVideoTag);
      isWatchingRemoteVideo = true;
      break;
  }
  window.peer_stream = stream;
}
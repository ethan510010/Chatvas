// 切換語言
const selectLanguageTag = document.querySelector('#user_basic select');
// 取得 query String
function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

const userId = getParameterByName('userId', window.location);

selectLanguageTag.addEventListener('change', function () {
  if (userId) {
    fetch('/language/userPreferedLanguage', {
      body: JSON.stringify({
        userId: userId,
        selectedLanguage: selectLanguageTag.value
      }),
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      method: 'PUT',
    })
    .then(response => response.json())
    .catch(error => console.log(error))
    .then((validResponse) => {
      if (validResponse.data === 'success') {
        console.log('用戶現在更新的語言', selectLanguageTag.value)
      }
    })
  }
})
// 進入房間
const enterChatRoomBtn = document.querySelector('#user_basic .enter_button');
enterChatRoomBtn.addEventListener('click', function(e) {
  window.location = '/chatPage.html'
})

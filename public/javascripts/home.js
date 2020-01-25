let showSignupArea = false;
const notMemberTag = document.querySelector('#not_member_hint');
notMemberTag.addEventListener('click', function(event) {
  const signupInfoArea = document.querySelector('.signup_info');
  const displayValue = showSignupArea === true ? 'none' : 'block';
  signupInfoArea.style.display = displayValue;

  const signInArea = document.querySelector('.sign_in_area');
  
  const signInHidden = showSignupArea === true ? 'block' : 'none';
  signInArea.style.display = signInHidden;

  showSignupArea = !showSignupArea
})

// email 正則驗證
function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// 註冊事件
const signupUserNameInputTag = document.querySelector('.enter_username input');
const signupUserEmailTag = document.querySelector('.enter_email_for_signup input');
const signupUserPasswordTag = document.querySelector('.enter_password_for_signup input');
const signupBtn = document.querySelector('.signup_btn');

signupBtn.addEventListener('click', (e) => {
  if (validateEmail(signupUserEmailTag.value)) {
    fetch('/users/signup', {
      method: 'POST',
      body: JSON.stringify({
        username: signupUserNameInputTag.value,
        email: signupUserEmailTag.value,
        password: signupUserPasswordTag.value
      }),
      headers: new Headers({
        'Content-Type': 'application/json',
      })
    })
    .then((res) => res.json())
    .catch((error) => console.log(error))
    .then((response) => {
      console.log(response)
      if (typeof(response.data) === 'string') {
        alert('The email has already been registered.')
      } else {
        // 註冊成功進到主聊天界面
        document.cookie = `access_token=${response.data.accessToken}`;
        window.location = '/chatPage.html'
      }
    })
  } else {
    alert('You have the wrong email format');
  }
})

// 一般登入
const signinUserEmailTag = document.querySelector('.enter_email input');
const signinUserPasswordTag = document.querySelector('.enter_password input');
const signinBtn = document.querySelector('.sign_in_button');
console.log(signinUserEmailTag, signinUserPasswordTag)
signinBtn.addEventListener('click', function(event) {
  fetch('/users/signin', { 
    method: 'POST',
    body: JSON.stringify({
      email: signinUserEmailTag.value,
      password: signinUserPasswordTag.value,
      signinway: 'native'
    }),
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  })
  .then((res) => res.json())
  .catch((err) => console.log(err))
  .then((response) => {
    console.log(response)
    if (typeof(response.data) === 'string') {
      alert('請確定帳號密碼輸入正確')
    } else {
      // 登入成功，切換到主頁
      console.log('登入成功')
      console.log(response.data.accessToken)
      document.cookie = `access_token=${response.data.accessToken}`;
      window.location = '/chatPage.html'
    }
  })
})

// FB 登入
// 前端 Fb 登入拿 Token
const fbLoginBtn = document.querySelector('.facebook_login_area');
fbLoginBtn.addEventListener('click', function (e) {
  FB.getLoginStatus((response) => {
    statusChangeCallback(response);
  });
})

function statusChangeCallback(response) {
  if (response.status === 'connected') {
    // user登入了
    const { accessToken } = response.authResponse;
    fetchUserInfo(accessToken);
  } else {
    FB.login((fbResponse) => {
      // 拿到accessToken，提供給後端
      statusChangeCallback(fbResponse);
    }, { scope: 'public_profile,email' });
  }
}

// 前端打我們自己的後端 api
function fetchUserInfo(accessToken) {
  // 打我們自己的api
  fetch('/users/signin', {
    method: 'POST',
    body: JSON.stringify({
      signinway: 'facebook',
      thirdPartyAuthToken: accessToken
    }),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  })
    .then((response) => response.json())
    .catch((error) => console.log(error))
    .then((info) => {
      // 前端設定cookie
      document.cookie = `access_token=${info.data.accessToken}`;
      // 切換到主頁
      window.location = '/chatPage.html';
    });
}
var inputEmail = document.getElementById('inputEmail')
var inputPassword = document.getElementById('inputPassword')

/* function buttonSignUpClick() {
    var email = document.getElementById('inputEmail').value
    var password = document.getElementById('inputPassword').value

    firebase.auth().createUserWithEmailAndPassword(email, password).then(function () {
      alert('User created!!!')
    }).catch(function (error) {
      if (error != null) {
        alert(error.message)
        return
      }
    })
  }) */

function buttonSignInClick() {
  firebase.auth().signInWithEmailAndPassword(inputEmail.value, inputPassword.value).then(function () {
    localStorage.setItem("email", inputEmail.value)
    localStorage.setItem("password", inputPassword.value)
    document.location.href = "pagePersonsList.html"
  }).catch(function (error) {
    if (error != null) {
      alert(error.message)
      return
    }
  })
}

function pageLoaded() {
  inputEmail.value = localStorage.getItem('email')
}
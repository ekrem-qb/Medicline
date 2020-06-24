var inputEmail = document.getElementById('inputEmail')
var inputPassword = document.getElementById('inputPassword')

/* function buttonSignUpClick() {
    var email = document.getElementById('inputEmail').materialComponent.value
    var password = document.getElementById('inputPassword').materialComponent.value

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
  firebase.auth().signInWithEmailAndPassword(inputEmail.materialComponent.value, inputPassword.materialComponent.value).then(function () {
    localStorage.setItem("email", inputEmail.materialComponent.value)
    localStorage.setItem("password", inputPassword.materialComponent.value)
    document.location.href = "pageKasesList.html"
  }).catch(function (error) {
    if (error != null) {
      alert(error.message)
      return
    }
  })
}

function pageLoaded() {
  inputEmail.materialComponent.value = localStorage.getItem('email')
}
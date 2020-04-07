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
  var email = document.getElementById('inputEmail').value
  var password = document.getElementById('inputPassword').value

  firebase.auth().signInWithEmailAndPassword(email, password).then(function () {
    localStorage.setItem("email", email)
    localStorage.setItem("password", password)
    document.location.href = "pagePersonsList.html"
  }).catch(function (error) {
    if (error != null) {
      alert(error.message)
      return
    }
  })
}
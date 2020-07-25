const inputEmail = document.querySelector("input#email")
const inputPassword = document.querySelector("input#password")
const buttonPasswordVisibility = document.querySelector("button#passwordVisibility")
const iconPasswordVisibility = document.querySelector("button#passwordVisibility>.mdi")

function pageLoaded() {
  if (localStorage.getItem('email') != null) {
    inputEmail.materialComponent.value = localStorage.getItem('email')
  }
}

/* function signUp() {
    firebase.auth().createUserWithEmailAndPassword(email, password).then(function () {
      alert("User created!!!")
    }).catch(function (error) {
      if (error != null) {
        alert(error.message)
        return
      }
    })
  }) */

function signIn() {
  firebase.auth().signInWithEmailAndPassword(inputEmail.materialComponent.value, inputPassword.materialComponent.value).then(function () {
    localStorage.setItem("email", inputEmail.materialComponent.value)
    localStorage.setItem("password", inputPassword.materialComponent.value)
    document.location.href = "index.html"
  }).catch(function (error) {
    if (error != null) {
      alert(error.message)
      return
    }
  })
}

buttonPasswordVisibility.onclick = function () {
  if (inputPassword.type == "password") {
    inputPassword.type = "text"
    iconPasswordVisibility.classList.add("mdi-eye-outline")
    iconPasswordVisibility.classList.remove("mdi-eye-off-outline")
  }
  else {
    inputPassword.type = "password"
    iconPasswordVisibility.classList.remove("mdi-eye-outline")
    iconPasswordVisibility.classList.add("mdi-eye-off-outline")
  }
}
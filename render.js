var signUpBtn = document.getElementById('signUpBtn')
var signInBtn = document.getElementById('signInBtn')

signUpBtn.addEventListener('click', function () {
    var loginField = document.getElementById('login').value
    var passwordField = document.getElementById('password').value

    firebase.auth().createUserWithEmailAndPassword(loginField, passwordField).catch(function (error) {
        if (error != null) {
            console.log(error.message)
            return;
        }
        alert("User Created!!!")
    })
})

signInBtn.addEventListener('click', function () {
    var loginField = document.getElementById('login').value
    var passwordField = document.getElementById('password').value
})
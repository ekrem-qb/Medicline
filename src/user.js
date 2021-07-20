const inputUsername = document.querySelector('input#username')
const inputNameSurname = document.querySelector('input#nameSurname')
const inputPassword = document.querySelector('input#password')
const buttonPasswordVisibility = document.querySelector('button#passwordVisibility')
const iconPasswordVisibility = buttonPasswordVisibility.querySelector('.mdi')
const buttonSave = document.querySelector('button#save')
const iconSave = buttonSave.querySelector('.mdi')

buttonPasswordVisibility.onclick = () => {
    if (inputPassword.type == 'password') {
        inputPassword.type = 'text'
        iconPasswordVisibility.classList.add('mdi-eye-outline')
        iconPasswordVisibility.classList.remove('mdi-eye-off-outline')
    }
    else {
        inputPassword.type = 'password'
        iconPasswordVisibility.classList.remove('mdi-eye-outline')
        iconPasswordVisibility.classList.add('mdi-eye-off-outline')
    }
}

inputNameSurname.onchange = () => inputNameSurname.value = inputNameSurname.value.trim()

inputPassword.materialComponent.useNativeValidation = false
inputPassword.oninput = () => {
    inputPassword.value = inputPassword.value.replace(' ', '')
    if (inputPassword.value.length >= 6 || inputPassword.value.length == 0) {
        inputPassword.materialComponent.valid = true
    }
    else {
        inputPassword.materialComponent.valid = false
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        inputUsername.materialComponent.value = user.email.replace(emailSuffix, '')
        if (user.displayName) {
            inputNameSurname.materialComponent.value = user.displayName
        }
        inputNameSurname.materialComponent.disabled = false
        buttonSave.disabled = false
    } else {
    }
})

function updatePassword() {
    if (inputPassword.value != '' && inputPassword.materialComponent.valid) {
        iconSave.classList.remove('mdi-content-save')
        iconSave.classList.add('mdi-loading', 'mdi-spin')

        firebase.auth().currentUser.updatePassword(inputPassword.value).then(() => {
            // firebase.auth().signOut()
            firebase.auth().signInWithEmailAndPassword(inputUsername.value + emailSuffix, inputPassword.value).then(() => {
                console.log('Signed In')
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                console.error(error)
            })
        }).catch((error) => {
            console.error("Error updating Password: ", error)
        })
    }
    else {
        ipcRenderer.send('window-action', 'exit')
    }
}

buttonSave.onclick = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (inputNameSurname.value != firebase.auth().currentUser.displayName && !(inputNameSurname.value == '' && firebase.auth().currentUser.displayName == null)) {
        iconSave.classList.remove('mdi-content-save')
        iconSave.classList.add('mdi-loading', 'mdi-spin')

        firebase.auth().currentUser.updateProfile({ displayName: inputNameSurname.value }).then(() => {
            ipcRenderer.send('user-name-change', inputNameSurname.value)
            updatePassword()
        }).catch((error) => {
            console.error("Error updating Name Surname: ", error)
        })
    }
    else {
        updatePassword()
    }
}

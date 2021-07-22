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

inputUsername.oninput = () => {
    inputUsername.value = inputUsername.value.replace(' ', '')
    inputUsername.materialComponent.valid = inputUsername.value != ''
}

inputNameSurname.onchange = () => inputNameSurname.value = inputNameSurname.value.trim()

inputUsername.materialComponent.useNativeValidation = false
inputPassword.materialComponent.useNativeValidation = false

let currentUser

if (location.hash != '') {
    inputPassword.oninput = () => {
        inputPassword.value = inputPassword.value.replace(' ', '')
        if (inputPassword.value.length >= 6 || inputPassword.value.length == 0) {
            inputPassword.materialComponent.valid = true
        }
        else {
            inputPassword.materialComponent.valid = false
        }
    }

    admin.auth().getUser(location.hash.replace('#', '')).then(user => {
        currentUser = user
        inputUsername.materialComponent.value = user.email.replace(emailSuffix, '')
        if (user.displayName) {
            inputNameSurname.materialComponent.value = user.displayName
        }
        inputNameSurname.materialComponent.disabled = false
        buttonSave.disabled = false
    }).catch(error => {
        console.error("Error getting user: ", error)
    })

    buttonSave.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()

        let data = {}

        if (inputNameSurname.value != currentUser.displayName && !(inputNameSurname.value == '' && currentUser.displayName == null)) {
            data.displayName = inputNameSurname.value
        }

        if (inputPassword.value != '' && inputPassword.materialComponent.valid) {
            data.password = inputPassword.value
        }

        if (Object.entries(data).length > 0) {
            iconSave.classList.remove('mdi-content-save')
            iconSave.classList.add('mdi-loading', 'mdi-spin')
        }

        admin.auth().updateUser(currentUser.uid, data).then(() => {
            ipcRenderer.send('user-update', currentUser.uid, data)
            ipcRenderer.send('window-action', 'exit')
        }).catch(error => {
            console.error("Error updating user", error)
        })
    }
}
else {
    inputUsername.materialComponent.disabled = false
    inputNameSurname.materialComponent.disabled = false
    inputUsername.required = true
    inputPassword.required = true
    buttonSave.disabled = false

    inputPassword.oninput = () => {
        inputPassword.value = inputPassword.value.replace(' ', '')
        inputPassword.materialComponent.valid = inputPassword.value.length >= 6
    }

    buttonSave.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()

        let data = {}

        if (inputUsername.value != '') {
            data.email = inputUsername.value + emailSuffix
        }
        else {
            inputUsername.materialComponent.valid = false
        }

        if (inputNameSurname.value != '') {
            data.displayName = inputNameSurname.value
        }

        if (inputPassword.value != '' && inputPassword.materialComponent.valid) {
            data.password = inputPassword.value
        }
        else {
            inputPassword.materialComponent.valid = false
        }

        if (data.email != undefined && data.password != undefined) {
            iconSave.classList.remove('mdi-content-save')
            iconSave.classList.add('mdi-loading', 'mdi-spin')

            admin.auth().createUser(data).then(user => {
                admin.auth().setCustomUserClaims(user.uid, { admin: false }).then(() => {
                    ipcRenderer.send('user-add')
                    ipcRenderer.send('window-action', 'exit')
                }).catch(error => {
                    console.error("Error setting custom user claims: ", error)
                })
            }).catch(error => {
                if (error.code == 'auth/email-already-exists') {
                    alert(translate('USER_EXISTS'))
                    inputUsername.materialComponent.valid = false
                    iconSave.classList.add('mdi-content-save')
                    iconSave.classList.remove('mdi-loading', 'mdi-spin')
                }
                else {
                    console.error("Error creating user", error)
                }
            })
        }
    }
}
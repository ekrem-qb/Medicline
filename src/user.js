const inputUsername = document.querySelector('input#username')
const inputName = document.querySelector('input#name')
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

inputName.onchange = () => inputName.value = inputName.value.trim()

inputUsername.materialComponent.useNativeValidation = false
inputPassword.materialComponent.useNativeValidation = false

if (location.hash != '') {
    const selectedUserID = location.hash.replace('#', '')

    inputPassword.oninput = () => {
        inputPassword.value = inputPassword.value.replace(' ', '')
        if (inputPassword.value.length >= 6 || inputPassword.value.length == 0) {
            inputPassword.materialComponent.valid = true
        }
        else {
            inputPassword.materialComponent.valid = false
        }
    }

    const stopQuery = allUsers.doc(selectedUserID).onSnapshot(
        user => {
            stopQuery()
            document.title = user.get('username')
            inputUsername.materialComponent.value = user.get('username')
            if (user.get('name')) {
                inputName.materialComponent.value = user.get('name')
            }
            inputName.materialComponent.disabled = false
            buttonSave.disabled = false
        },
        error => {
            console.error('Error getting user: ', error)
        }
    )

    buttonSave.onclick = event => {
        event.preventDefault()
        event.stopPropagation()

        iconSave.classList.remove('mdi-content-save')
        iconSave.classList.add('mdi-loading', 'mdi-spin')

        allUsers.doc(selectedUserID).set({
            username: inputUsername.value,
            name: inputName.value
        }).then(() => {
            if (inputPassword.value != '') {
                admin.auth().updateUser(selectedUserID, {
                    password: inputPassword.value
                }).then(() => {
                    if (firebase.auth().currentUser.uid == selectedUserID) {
                        firebase.auth().signOut()
                        firebase.auth().signInWithEmailAndPassword(firebase.auth().currentUser.email, inputPassword.value).then(() => {
                            ipcRenderer.send('window-action', 'exit')
                        }).catch(error => {
                            console.error('Error sign in: ', error)
                        })
                    }
                    else {
                        ipcRenderer.send('window-action', 'exit')
                    }
                }).catch(error => {
                    console.error('Error updating user', error)
                })
            }
            else {
                ipcRenderer.send('window-action', 'exit')
            }
        }).catch(error => {
            console.error('Error updating user', error)
        })
    }
}
else {
    inputUsername.materialComponent.disabled = false
    inputName.materialComponent.disabled = false
    inputUsername.required = true
    inputPassword.required = true
    buttonSave.disabled = false

    inputPassword.oninput = () => {
        inputPassword.value = inputPassword.value.replace(' ', '')
        inputPassword.materialComponent.valid = inputPassword.value.length >= 6
    }

    inputUsername.focus()

    buttonSave.onclick = event => {
        event.preventDefault()
        event.stopPropagation()

        let data = {}

        if (inputUsername.value == '') {
            inputUsername.materialComponent.valid = false
        }
        else {
            data.username = inputUsername.value
        }

        data.name = inputName.value

        if (inputPassword.value == '') {
            inputPassword.materialComponent.valid = false
        }

        if ((inputUsername.value + emailSuffix) != '' && inputPassword.value != '') {
            iconSave.classList.remove('mdi-content-save')
            iconSave.classList.add('mdi-loading', 'mdi-spin')

            admin.auth().createUser({ email: (inputUsername.value + emailSuffix), password: inputPassword.value }).then(user => {
                allUsers.doc(user.uid).set(data).then(() => {
                    ipcRenderer.send('window-action', 'exit')
                }).catch(error => {
                    console.error('Error creating user', error)
                })
            }).catch(error => {
                if (error.code == 'auth/email-already-exists') {
                    alert(translate('USER_EXISTS'))
                    inputUsername.materialComponent.valid = false
                    iconSave.classList.add('mdi-content-save')
                    iconSave.classList.remove('mdi-loading', 'mdi-spin')
                }
                else {
                    console.error('Error creating user', error)
                }
            })
        }
    }
}
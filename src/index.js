const buttonDrawer = document.getElementById('buttonDrawer')
const buttonDrawerIcon = buttonDrawer.querySelector('.mdi')

buttonDrawer.onclick = () => {
    buttonDrawerIcon.classList.toggle('mdi-menu')
    buttonDrawerIcon.classList.toggle('mdi-rotate-180')
    buttonDrawerIcon.classList.toggle('mdi-arrow-left')
    drawer.materialComponent.open = !drawer.materialComponent.open
}

const drawer = document.querySelector('.mdc-drawer')
const list = drawer.querySelector('.mdc-deprecated-list')

list.onclick = () => {

}

const displayName = drawer.querySelector('.mdc-drawer__title')
const email = drawer.querySelector('.mdc-drawer__subtitle')

drawer.materialComponent.listen('MDCDrawer:closed', () => {
    buttonDrawerIcon.classList.add('mdi-menu')
    buttonDrawerIcon.classList.add('mdi-rotate-180')
    buttonDrawerIcon.classList.remove('mdi-arrow-left')
})
drawer.materialComponent.listen('MDCDrawer:opened', () => {
    buttonDrawerIcon.classList.remove('mdi-menu')
    buttonDrawerIcon.classList.remove('mdi-rotate-180')
    buttonDrawerIcon.classList.add('mdi-arrow-left')
})

const editProfileOption = document.getElementById('editProfile')
editProfileOption.onmousedown = event => {
    if (event.button == 0) {
        event.preventDefault()
        event.stopPropagation()

        ipcRenderer.send('new-window', 'user', firebase.auth().currentUser.uid)
    }
}

const signOutOption = document.getElementById('signOut')
signOutOption.onmousedown = event => {
    if (event.button == 0) {
        event.preventDefault()
        event.stopPropagation()

        firebase.auth().signOut()
    }
}

//#region Login

const dialogLogin = document.getElementById('dialogLogin')
dialogLogin.materialComponent.scrimClickAction = ''
dialogLogin.materialComponent.escapeKeyAction = ''

const inputUsername = dialogLogin.querySelector('input#username')
const inputPassword = dialogLogin.querySelector('input#password')
const buttonPasswordVisibility = dialogLogin.querySelector('button#passwordVisibility')
const iconPasswordVisibility = buttonPasswordVisibility.querySelector('.mdi')
const buttonSignIn = dialogLogin.querySelector('button#signIn')
const iconSignIn = buttonSignIn.querySelector('.mdi')

function signIn() {
    const signInIconClass = iconSignIn.classList.item(iconSignIn.classList.length - 1)
    iconSignIn.classList.remove(signInIconClass)
    iconSignIn.classList.add('mdi-loading', 'mdi-spin')

    firebase.auth().signInWithEmailAndPassword(inputUsername.materialComponent.value + emailSuffix, inputPassword.materialComponent.value)
        .then(() => {
            iconSignIn.classList.add(signInIconClass)
            iconSignIn.classList.remove('mdi-loading', 'mdi-spin')
            inputUsername.materialComponent.value = ''
            inputPassword.materialComponent.value = ''
            if (inputPassword.type != 'password') {
                buttonPasswordVisibility.click()
            }
        }).catch(error => {
            if (error != null) {
                iconSignIn.classList.remove('mdi-loading', 'mdi-spin')
                iconSignIn.classList.add(signInIconClass)
                alert(error.message)
                return
            }
        })
}
buttonSignIn.onclick = signIn

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

ipcRenderer.on('user-update', (event, uid, data) => {
    if (firebase.auth().currentUser.uid == uid) {
        if (data.displayName != '') {
            if (data.displayName) {
                displayName.textContent = data.displayName
                email.textContent = firebase.auth().currentUser.email.replace(emailSuffix, '')
            }
        }
        else {
            displayName.textContent = firebase.auth().currentUser.email.replace(emailSuffix, '')
            email.textContent = ''
        }

        if (data.password != undefined) {
            firebase.auth().signOut()
            firebase.auth().signInWithEmailAndPassword(firebase.auth().currentUser.email, data.password).then(() => {
                dialogLogin.materialComponent.close()
            }).catch(error => {
                console.error("Error sign in: ", error)
            })
        }
    }
})

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        dialogLogin.materialComponent.close()
        if (user.displayName != null) {
            displayName.textContent = user.displayName
            email.textContent = user.email.replace(emailSuffix, '')
        }
        else {
            displayName.textContent = user.email.replace(emailSuffix, '')
        }
    }
    else {
        dialogLogin.materialComponent.open()
    }
})

//#endregion

const webview = document.querySelector('webview')

webview.addEventListener('dom-ready', () => {
    drawer.materialComponent.open = false
})

ipcRenderer.on('user-update', (event, uid, data) => {
    webview.send('user-update', uid, data)
})

ipcRenderer.on('user-add', event => {
    webview.send('user-add')
})

const casesOption = document.getElementById('cases')
casesOption.onmousedown = event => {
    if (event.button == 0) {
        webview.src = 'caseList.html'
    }
}

const usersOption = document.getElementById('users')
usersOption.onmousedown = event => {
    if (event.button == 0) {
        webview.src = 'userList.html'
    }
}

webview.addEventListener('dom-ready', () => {
    if (webview.src.includes('userList.html')) {
        webview.send('current-user', firebase.auth().currentUser.uid)
    }
})

const hotelsOption = document.getElementById('hotels')
hotelsOption.onmousedown = event => {
    if (event.button == 0) {
        webview.src = 'addressList.html'
    }
}

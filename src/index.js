const buttonDrawer = document.getElementById('buttonDrawer')
const buttonDrawerIcon = buttonDrawer.querySelector('.mdi')

buttonDrawer.onclick = () => {
    buttonDrawerIcon.classList.toggle('mdi-menu')
    buttonDrawerIcon.classList.toggle('mdi-rotate-180')
    buttonDrawerIcon.classList.toggle('mdi-arrow-left')
    drawer.materialComponent.open = !drawer.materialComponent.open
}

const drawer = document.querySelector('.mdc-drawer')

drawer.materialComponent.listen('MDCDrawer:closed', () => {
    buttonDrawerIcon.classList.add('mdi-menu')
    buttonDrawerIcon.classList.add('mdi-rotate-180')
    buttonDrawerIcon.classList.remove('mdi-arrow-left')
})
drawer.materialComponent.listen('MDCDrawer:opened', () => {
    buttonDrawerIcon.classList.remove('mdi-menu')
    buttonDrawerIcon.classList.remove('mdi-rotate-180')
    buttonDrawerIcon.classList.add('mdi-arrow-left')

    drawer.materialComponent.list.listElements[drawer.materialComponent.list.selectedIndex].focus()
})

const editProfileOption = document.getElementById('editProfile')
editProfileOption.onclick = event => {
    if (event.button == 0) {
        event.preventDefault()
        event.stopPropagation()

        ipcRenderer.send('new-window', 'user', firebase.auth().currentUser.uid)
    }
}

const signOutOption = document.getElementById('signOut')
signOutOption.onclick = event => {
    if (event.button == 0) {
        event.preventDefault()
        event.stopPropagation()

        firebase.auth().signOut()
    }
}

drawer.materialComponent.list.listElements.forEach((listItem, index) => {
    listItem.onmousedown = event => {
        if (event.button == 0) {
            webview.hidden = false
            webview.src = listItem.id + 'List.html'
            drawer.materialComponent.list.selectedIndex = index
        }
    }
})

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

//#endregion

const textName = drawer.querySelector('.mdc-drawer__title')
const textUsername = drawer.querySelector('.mdc-drawer__subtitle')
let stopUserQuery = () => { }

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        dialogLogin.materialComponent.close()
        stopUserQuery = allUsers.doc(user.uid).onSnapshot(
            snapshot => {
                if (snapshot.get('name')) {
                    textName.textContent = snapshot.get('name')
                    textUsername.textContent = snapshot.get('username')
                }
                else {
                    textName.textContent = snapshot.get('username')
                    textUsername.textContent = ''
                }
            },
            error => {
                console.error('Error getting user profile: ' + error)
            }
        )
        loadPermissions()
    }
    else {
        stopUserQuery()
        stopPermissionsQuery()
        dialogLogin.materialComponent.open()
    }
})

let stopPermissionsQuery = () => { }

function loadPermissions() {
    drawer.materialComponent.list.listElements.forEach(listItem => {
        listItem.classList.add('mdc-deprecated-list-item--disabled')
    })
    stopPermissionsQuery()
    stopPermissionsQuery = allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').onSnapshot(
        snapshot => {
            snapshot.docs.forEach(permission => {
                const listItem = drawer.materialComponent.list.root.children[permission.id]
                if (listItem != undefined) {
                    if (permission.get('view')) {
                        listItem.classList.remove('mdc-deprecated-list-item--disabled')
                    }
                    else {
                        listItem.classList.add('mdc-deprecated-list-item--disabled')
                    }
                }
            })
            const activeButDisabledTab = drawer.materialComponent.list.root.querySelector('.mdc-deprecated-list-item--activated.mdc-deprecated-list-item--disabled')
            if (activeButDisabledTab) {
                const availableTab = drawer.materialComponent.list.root.querySelector('.mdc-deprecated-list-item:not(.mdc-deprecated-list-item--disabled)')
                if (availableTab) {
                    if (!webview.src.includes(availableTab.id + 'List.html')) {
                        webview.hidden = false
                        webview.src = availableTab.id + 'List.html'
                        drawer.materialComponent.list.selectedIndex = drawer.materialComponent.list.listElements.indexOf(drawer.materialComponent.list.root.querySelector('.mdc-deprecated-list-item:not(.mdc-deprecated-list-item--disabled)'))
                    }
                }
                else {
                    webview.hidden = true
                }
            }
        },
        error => {
            console.error('Error getting permissions: ' + error)
        }
    )
}

const webview = document.querySelector('webview')

webview.addEventListener('dom-ready', () => {
    drawer.materialComponent.open = false
})
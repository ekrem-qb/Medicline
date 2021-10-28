const buttonDrawer = document.getElementById('buttonDrawer')
const buttonDrawerIcon = buttonDrawer.getElementsByClassName('iconify')

buttonDrawer.onclick = () => {
    if (drawer.materialComponent.open) {
        buttonDrawerIcon[0].setAttribute('data-icon', 'ic:round-menu')
    }
    else {
        buttonDrawerIcon[0].setAttribute('data-icon', 'ic:round-arrow-back')
    }
    drawer.materialComponent.open = !drawer.materialComponent.open
}

const drawer = document.querySelector('.mdc-drawer')

drawer.materialComponent.listen('MDCDrawer:closed', () => {
    buttonDrawerIcon[0].setAttribute('data-icon', 'ic:round-menu')
})
drawer.materialComponent.listen('MDCDrawer:opened', () => {
    buttonDrawerIcon[0].setAttribute('data-icon', 'ic:round-arrow-back')

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
const buttonPasswordVisibilityIcon = buttonPasswordVisibility.getElementsByClassName('iconify')
const buttonSignIn = dialogLogin.querySelector('button#signIn')
const iconSignIn = buttonSignIn.getElementsByClassName('iconify')

function signIn() {
    iconSignIn[0].setAttribute('data-icon', 'eos-icons:loading')

    firebase.auth().signInWithEmailAndPassword(inputUsername.materialComponent.value + emailSuffix, inputPassword.materialComponent.value)
        .then(() => {
            iconSignIn[0].setAttribute('data-icon', 'ic:round-login')
            inputUsername.materialComponent.value = ''
            inputPassword.materialComponent.value = ''
            if (inputPassword.type != 'password') {
                buttonPasswordVisibility.click()
            }
        }).catch(error => {
            if (error != null) {
                iconSignIn[0].setAttribute('data-icon', 'ic:round-login')
                alert(error.message)
                return
            }
        })
}
buttonSignIn.onclick = signIn

buttonPasswordVisibility.onclick = () => {
    if (inputPassword.type == 'password') {
        inputPassword.type = 'text'
        buttonPasswordVisibilityIcon[0].setAttribute('data-icon', 'ic:outline-visibility')
    }
    else {
        inputPassword.type = 'password'
        buttonPasswordVisibilityIcon[0].setAttribute('data-icon', 'ic:outline-visibility-off')
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
            snapshot.forEach(permission => {
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
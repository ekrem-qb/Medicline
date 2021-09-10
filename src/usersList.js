const buttonRefresh = document.querySelector('button#refresh')
const buttonRefreshIcon = buttonRefresh.querySelector('.mdi')
buttonRefresh.onclick = () => {
    buttonRefreshIcon.classList.remove('mdi-refresh')
    buttonRefreshIcon.classList.add('mdi-loading', 'mdi-spin')

    listUsers()
}

const usersList = document.getElementById('usersList')
const listItemTemplate = document.getElementById('listItemTemplate')
let selectedUserUID, currentUserUID

ipcRenderer.on('current-user', (event, uid) => {
    admin.auth().getUser(uid).then(user => {
        if (user.customClaims.admin) {
            currentUserUID = uid
            listUsers()
        }
    }).catch(error => {
        console.error("Error getting user: ", error)
    })
})

function listUsers() {
    if (currentUserUID) {
        admin.auth().listUsers().then(
            snapshot => {
                usersList.innerHTML = ''
                snapshot.users.forEach(
                    user => {
                        buttonRefreshIcon.classList.add('mdi-refresh')
                        buttonRefreshIcon.classList.remove('mdi-loading', 'mdi-spin')

                        if (user.uid != currentUserUID) {
                            const listItem = listItemTemplate.content.firstElementChild.cloneNode(true)
                            listItem.id = user.uid

                            const textPrimary = listItem.querySelector('b')
                            const textSecondary = listItem.querySelector('.text-secondary')

                            if (user.displayName) {
                                textPrimary.textContent = user.displayName
                                textSecondary.textContent = user.email.replace(emailSuffix, '')
                            }
                            else {
                                textPrimary.textContent = user.email.replace(emailSuffix, '')
                                textSecondary.hidden = true
                            }

                            const buttonEdit = listItem.querySelector('button#edit')
                            buttonEdit.onclick = () => ipcRenderer.send('new-window', 'user', user.uid)

                            const buttonDelete = listItem.querySelector('button#delete')
                            buttonDelete.onclick = () => {
                                selectedUserUID = user.uid
                                dialogDeleteUser.materialComponent.open()
                            }

                            listItem.querySelectorAll('.mdc-icon-button').forEach(rippleElement => {
                                rippleElement.materialRipple = new MDCRipple(rippleElement)
                                rippleElement.materialRipple.unbounded = true
                            })

                            usersList.appendChild(listItem)
                        }
                    }
                )
            }
        )
    }
}

ipcRenderer.on('user-add', event => {
    listUsers()
})

ipcRenderer.on('user-update', (event, uid, data) => {
    if (data.displayName != undefined) {
        let listItem = document.getElementById(uid)

        if (listItem) {
            let bigText = listItem.querySelector('b')
            let smallText = listItem.querySelector('small')

            if (data.displayName != '') {
                bigText.textContent = data.displayName
                smallText.hidden = false
            }
            else {
                bigText.textContent = smallText.textContent
                smallText.hidden = true
            }
        }
    }
})

const dialogDeleteUser = document.querySelector("#dialogDeleteUser")
dialogDeleteUser.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        admin.auth().deleteUser(selectedUserUID).then(() => {
            document.getElementById(selectedUserUID).remove()
        }).catch(error => {
            console.error("Error deleting user: ", error)
        })
    }
})
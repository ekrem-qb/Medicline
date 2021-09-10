const usersList = document.getElementById('usersList')
const listItemTemplate = document.getElementById('listItemTemplate')
let selectedUserID, stopCurrentQuery = () => { }

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        listUsers()
    }
    else {
        stopCurrentQuery()
    }
})

function listUsers() {
    stopCurrentQuery()
    stopCurrentQuery = allUsers.onSnapshot(
        snapshot => {
            usersList.innerHTML = ''
            snapshot.forEach(
                user => {
                    if (user.id != firebase.auth().currentUser.uid) {
                        const listItem = listItemTemplate.content.firstElementChild.cloneNode(true)
                        listItem.id = user.id

                        const textPrimary = listItem.querySelector('b')
                        const textSecondary = listItem.querySelector('.text-secondary')

                        if (user.get('name')) {
                            textPrimary.textContent = user.get('name')
                            textSecondary.textContent = user.get('username')
                        }
                        else {
                            textPrimary.textContent = user.get('username')
                            textSecondary.hidden = true
                        }

                        const buttonEdit = listItem.querySelector('button#edit')
                        buttonEdit.onclick = () => ipcRenderer.send('new-window', 'user', user.id)

                        const buttonDelete = listItem.querySelector('button#delete')
                        buttonDelete.onclick = () => {
                            selectedUserID = user.id
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

const dialogDeleteUser = document.querySelector("#dialogDeleteUser")
dialogDeleteUser.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        admin.auth().deleteUser(selectedUserID).then(() => {
            allUsers.doc(selectedUserID).delete().then(() => {
            }).catch(error => {
                console.error("Error deleting user: ", error)
            })
        }).catch(error => {
            console.error("Error deleting user: ", error)
        })
    }
})
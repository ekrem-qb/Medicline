const usersList = document.getElementById('usersList')
const listItemTemplate = document.getElementById('listItemTemplate')
let selectedUserID, stopCurrentQuery = () => { }

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        listUsers()
    }
    else {
        stopCurrentQuery()
        stopPermissionsQuery()
    }
})

function listUsers() {
    stopCurrentQuery()
    stopCurrentQuery = allUsers.orderBy('name', 'asc').onSnapshot(
        snapshot => {
            usersList.innerHTML = ''
            snapshot.forEach(
                user => {
                    if (user.id != firebase.auth().currentUser.uid) {
                        const listItem = listItemTemplate.content.firstElementChild.cloneNode(true)
                        listItem.id = user.id
                        listItem.onclick = event => {
                            if (event.target.parentElement != buttonEdit && event.target.parentElement != buttonDelete) {
                                const activeItem = usersList.querySelector('.list-group-item.active')
                                if (activeItem) {
                                    activeItem.classList.remove('active')
                                }
                                selectedUserID = listItem.id
                                listItem.classList.add('active')
                                listPermissions()
                            }
                        }
                        new MDCRipple(listItem)

                        const textPrimary = listItem.querySelector('b')
                        const textSecondary = listItem.querySelector('small')

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
            usersList.children[0].click()
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

const permissionsList = document.getElementById('permissionsList')

for (const listItem of permissionsList.children) {
    listItem.expandIcon = listItem.querySelector('.dropdown-icon')
    listItem.subList = listItem.children[1]
    listItem.children[0].onclick = () => {
        listItem.expandIcon.classList.toggle('mdi-rotate-180')
        listItem.subList.classList.toggle('collapsed')
    }
    for (const subListItem of listItem.subList.children) {
        subListItem.toggle = subListItem.querySelector('input[type=checkbox]')
        subListItem.onclick = () => {
            subListItem.toggle.checked = !subListItem.toggle.checked
            let data = {}
            data[subListItem.id] = subListItem.toggle.checked
            allUsers.doc(selectedUserID).collection('permissions').doc(listItem.id).update(data).then(() => {
            }).catch(error => {
                if (error.code == 'not-found') {
                    allUsers.doc(selectedUserID).collection('permissions').doc(listItem.id).set(data).then(() => {
                    }).catch(error => {
                        console.error("Error toggle permission: ", error)
                    })
                }
                else {
                    console.error("Error toggle permission: ", error)
                }
            })
        }
    }
}

let stopPermissionsQuery = () => { }

function listPermissions() {
    stopPermissionsQuery()
    permissionsList.querySelectorAll('input[type=checkbox]:checked').forEach(toggle => {
        toggle.checked = false
    })
    stopPermissionsQuery = allUsers.doc(selectedUserID).collection('permissions').onSnapshot(snapshot => {
        console.log(snapshot)
        snapshot.docs.forEach(permission => {
            const listItem = permissionsList.children[permission.id]
            for (const subListItem of listItem.subList.children) {
                const toggle = permission.data()[subListItem.id]
                if (toggle != undefined) {
                    subListItem.toggle.checked = toggle
                }
            }
        })
    })
}
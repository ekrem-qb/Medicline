const buttonCreate = document.querySelector('button#create')
buttonCreate.onclick = () => ipcRenderer.send('new-window', 'user')

const usersList = document.getElementById('usersList')
const listItemTemplate = document.getElementById('listItemTemplate')
let selectedUserID, stopCurrentQuery = () => { }

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        listUsers()
        loadPermissions()
    }
    else {
        stopPermissionsQuery()
        stopCurrentQuery()
        stopSelectedUserPermissionsQuery()
        stopFilteredCasesQueries()
    }
})

let stopPermissionsQuery = () => { }
let haveEditPermission = false

function toggleEditMode(editIsAllowed) {
    buttonCreate.disabled = !editIsAllowed
    for (const listItem of permissionsList.children) {
        for (const subListItem of listItem.subList.children) {
            subListItem.classList.toggle('disabled', !editIsAllowed)
            subListItem.toggle.disabled = !editIsAllowed
        }
    }
    for (const iconButton of usersList.getElementsByClassName('mdc-icon-button')) {
        iconButton.disabled = !editIsAllowed
    }
    haveEditPermission = editIsAllowed
}

function loadPermissions() {
    toggleEditMode(false)

    stopPermissionsQuery()
    stopPermissionsQuery = allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').doc('users').onSnapshot(
        snapshot => {
            toggleEditMode(snapshot.get('edit'))
        },
        error => {
            console.error('Error getting permissions: ' + error)
        }
    )
}

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
                                loadSelectedUserPermissions()
                            }
                        }
                        new MDCRipple(listItem)
                        usersList.appendChild(listItem)

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

                        const buttonEdit = listItem.children['edit']
                        buttonEdit.onclick = () => ipcRenderer.send('new-window', 'user', user.id)
                        buttonEdit.disabled = !haveEditPermission

                        const buttonDelete = listItem.children['delete']
                        buttonDelete.onclick = () => {
                            selectedUserID = user.id
                            const casesFilteredByCreateUser = allCases.where('createUser', '==', allUsers.doc(selectedUserID))

                            stopFilteredCasesQueries()
                            filteredCasesQueries.push(
                                casesFilteredByCreateUser.onSnapshot(
                                    snapshot => {
                                        let casesFoundByCreateUser = []
                                        snapshot.forEach(foundCase => {
                                            casesFoundByCreateUser.push(foundCase.id)
                                        })

                                        const casesFilteredByUpdateUser = allCases.where('updateUser', '==', allUsers.doc(selectedUserID))

                                        filteredCasesQueries.push(
                                            casesFilteredByUpdateUser.onSnapshot(
                                                snapshot => {
                                                    let casesFoundByUpdateUser = []
                                                    snapshot.forEach(foundCase => {
                                                        if (!casesFoundByCreateUser.includes(foundCase.id)) {
                                                            casesFoundByUpdateUser.push(foundCase.id)
                                                        }
                                                    })

                                                    const foundCases = casesFoundByCreateUser.concat(casesFoundByUpdateUser)
                                                    let prefix

                                                    foundCasesLinks.innerHTML = ''

                                                    if (foundCases.length > 0) {
                                                        iconDialogDeleteUser.classList.remove('mdi-help-circle-outline')
                                                        iconDialogDeleteUser.classList.add('mdi-alert')

                                                        prefix = 'CANT_DELETE#THIS_'
                                                        textDialogDeleteUser.classList.remove('mb-0')
                                                        textDialogDeleteUser.classList.add('mb-2')

                                                        for (let i = 0; i < foundCases.length; i++) {
                                                            const link = document.createElement('a')
                                                            link.href = '#'
                                                            link.innerText = '#' + foundCases[i]
                                                            link.id = foundCases[i]
                                                            link.onclick = () => ipcRenderer.send('new-window', 'case', link.id)
                                                            foundCasesLinks.appendChild(link)

                                                            if (i < foundCases.length - 1) {
                                                                const comma = document.createElement('b')
                                                                comma.innerText = ' , '
                                                                foundCasesLinks.appendChild(comma)
                                                            }
                                                        }
                                                        dialogDeleteUser.materialComponent.buttons[1].disabled = true
                                                    }
                                                    else {
                                                        iconDialogDeleteUser.classList.add('mdi-help-circle-outline')
                                                        iconDialogDeleteUser.classList.remove('mdi-alert')

                                                        prefix = 'ASK_DELETE#THIS_'
                                                        textDialogDeleteUser.classList.add('mb-0')
                                                        textDialogDeleteUser.classList.remove('mb-2')

                                                        dialogDeleteUser.materialComponent.buttons[1].disabled = false
                                                    }
                                                    textDialogDeleteUser.innerText = translate(prefix + 'user'.toUpperCase())

                                                    dialogDeleteUser.materialComponent.open()
                                                },
                                                error => {
                                                    console.error("Error getting filtered cases: " + error)
                                                }
                                            )
                                        )
                                    },
                                    error => {
                                        console.error("Error getting filtered cases: " + error)
                                    }
                                )
                            )
                        }
                        buttonDelete.disabled = !haveEditPermission

                        listItem.querySelectorAll('.mdc-icon-button').forEach(rippleElement => {
                            rippleElement.materialRipple = new MDCRipple(rippleElement)
                            rippleElement.materialRipple.unbounded = true
                        })
                    }
                }
            )
            if (usersList.children[selectedUserID]) {
                usersList.children[selectedUserID].click()
            }
            else {
                selectedUserID = usersList.children[0].id
                usersList.children[0].click()
            }
        },
        error => {
            console.error('Error getting users: ' + error)
        }
    )
}

let filteredCasesQueries = []
function stopFilteredCasesQueries() {
    filteredCasesQueries.forEach(stopQuery => stopQuery())
    filteredCasesQueries = []
}

const dialogDeleteUser = document.getElementById("dialogDeleteUser")
const iconDialogDeleteUser = dialogDeleteUser.querySelector('.mdi')
const textDialogDeleteUser = dialogDeleteUser.querySelector('p')
const foundCasesLinks = dialogDeleteUser.querySelector('span')

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

let stopSelectedUserPermissionsQuery = () => { }

function loadSelectedUserPermissions() {
    stopSelectedUserPermissionsQuery()
    permissionsList.querySelectorAll('input[type=checkbox]:checked').forEach(toggle => {
        toggle.checked = false
    })
    stopSelectedUserPermissionsQuery = allUsers.doc(selectedUserID).collection('permissions').onSnapshot(
        snapshot => {
            console.log(snapshot)
            snapshot.forEach(permission => {
                const listItem = permissionsList.children[permission.id]
                if (listItem != undefined) {
                    for (const subListItem of listItem.subList.children) {
                        const toggle = permission.data()[subListItem.id]
                        if (toggle != undefined) {
                            subListItem.toggle.checked = toggle
                        }
                    }
                }
            })
        },
        error => {
            console.error('Error getting permissions: ' + error)
        }
    )
}
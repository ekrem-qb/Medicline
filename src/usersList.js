const buttonCreate = document.querySelector('button#create')
buttonCreate.onclick = () => ipcRenderer.send('new-window', 'user')

const usersList = document.getElementById('usersList')
usersList.overlay = document.getElementById('usersListOverlay')
usersList.overlay.icon = usersList.overlay.querySelector('.mdi')
usersList.overlay.text = usersList.overlay.querySelector('h3')
const listItemTemplate = document.getElementById('listItemTemplate')
let selectedUser, stopCurrentQuery = () => { }

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
    usersList.innerHTML = ''
    stopCurrentQuery = allUsers.orderBy('name', 'asc').onSnapshot(
        snapshot => {
            console.log(snapshot.docChanges())
            snapshot.docChanges().forEach(
                change => {
                    if (change.doc.id != firebase.auth().currentUser.uid) {
                        switch (change.type) {
                            case 'added':
                                const listItem = listItemTemplate.content.firstElementChild.cloneNode(true)
                                listItem.id = change.doc.id
                                listItem.onclick = event => {
                                    if (event.target.parentElement != buttonEdit && event.target.parentElement != buttonDelete) {
                                        const activeItem = usersList.querySelector('.list-group-item.active')
                                        if (activeItem) {
                                            activeItem.classList.remove('active')
                                        }
                                        selectedUser = listItem
                                        listItem.classList.add('active')
                                        loadSelectedUserPermissions()
                                    }
                                }
                                new MDCRipple(listItem)
                                usersList.appendChild(listItem)

                                const label = listItem.querySelector('b')
                                const subLabel = listItem.querySelector('small')
                                listItem.label = label
                                listItem.subLabel = subLabel

                                if (change.doc.get('name')) {
                                    label.textContent = change.doc.get('name')
                                    subLabel.textContent = change.doc.get('username')
                                    subLabel.hidden = false
                                }
                                else {
                                    label.textContent = change.doc.get('username')
                                    subLabel.hidden = true
                                }

                                const buttonEdit = listItem.children['edit']
                                buttonEdit.onclick = () => ipcRenderer.send('new-window', 'user', change.doc.id)
                                buttonEdit.disabled = !haveEditPermission

                                const buttonDelete = listItem.children['delete']
                                buttonDelete.onclick = () => {
                                    selectedUser = listItem
                                    const casesFilteredByCreateUser = allCases.where('createUser', '==', allUsers.doc(selectedUser.id))

                                    stopFilteredCasesQueries()
                                    filteredCasesQueries.push(
                                        casesFilteredByCreateUser.onSnapshot(
                                            snapshot => {
                                                let casesFoundByCreateUser = []
                                                snapshot.forEach(foundCase => {
                                                    casesFoundByCreateUser.push(foundCase.id)
                                                })

                                                const casesFilteredByUpdateUser = allCases.where('updateUser', '==', allUsers.doc(selectedUser.id))

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

                                if (change.newIndex == usersList.childElementCount) {
                                    usersList.appendChild(listItem)
                                }
                                else {
                                    usersList.insertBefore(listItem, usersList.children[change.newIndex])
                                }
                                break
                            case 'modified':
                                if (change.doc.get('name')) {
                                    usersList.children[change.doc.id].label.textContent = change.doc.get('name')
                                    usersList.children[change.doc.id].subLabel.textContent = change.doc.get('username')
                                    usersList.children[change.doc.id].subLabel.hidden = false
                                }
                                else {
                                    usersList.children[change.doc.id].label.textContent = change.doc.get('username')
                                    usersList.children[change.doc.id].subLabel.hidden = true
                                }

                                if (change.newIndex == usersList.childElementCount) {
                                    usersList.appendChild(usersList.children[change.doc.id])
                                }
                                else {
                                    const removedChild = usersList.removeChild(usersList.children[change.doc.id])
                                    usersList.insertBefore(removedChild, usersList.children[change.newIndex])
                                }
                                break
                            case 'removed':
                                if (selectedUser == usersList.children[change.doc.id]) {
                                    selectedUser = undefined
                                }
                                usersList.children[change.doc.id].remove()
                                break
                        }
                    }
                }
            )
            if (usersList.childElementCount > 0) {
                if (!selectedUser) {
                    usersList.children[0].click()
                }
                setListOverlayState(usersList.overlay, 'hide')
            } else {
                setListOverlayState(usersList.overlay, 'empty')
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
        admin.auth().deleteUser(selectedUser.id).then(() => {
            allUsers.doc(selectedUser.id).delete().then(() => {
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

        const collapsedListIcon = permissionsList.querySelector('.dropdown-icon:not(.mdi-rotate-180)')
        if (!collapsedListIcon) {
            permissionsHeader.expandIcon.classList.add('mdi-rotate-180')
        }

        const notCollapsedListIcon = permissionsList.querySelector('.dropdown-icon.mdi-rotate-180')
        if (!notCollapsedListIcon) {
            permissionsHeader.expandIcon.classList.remove('mdi-rotate-180')
        }
    }
    for (const subListItem of listItem.subList.children) {
        subListItem.toggle = subListItem.querySelector('input[type=checkbox]')
        subListItem.onclick = () => {
            subListItem.toggle.checked = !subListItem.toggle.checked
            let data = {}
            data[subListItem.id] = subListItem.toggle.checked
            allUsers.doc(selectedUser.id).collection('permissions').doc(listItem.id).update(data).then(() => {
            }).catch(error => {
                if (error.code == 'not-found') {
                    allUsers.doc(selectedUser.id).collection('permissions').doc(listItem.id).set(data).then(() => {
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
const permissionsHeader = document.getElementById('permissionsHeader')
permissionsHeader.expandIcon = permissionsHeader.querySelector('.dropdown-icon')
permissionsHeader.onclick = () => {
    for (const listItem of permissionsList.children) {
        listItem.expandIcon.classList.toggle('mdi-rotate-180', !permissionsHeader.expandIcon.classList.contains('mdi-rotate-180'))
        listItem.subList.classList.toggle('collapsed', permissionsHeader.expandIcon.classList.contains('mdi-rotate-180'))
    }
    permissionsHeader.expandIcon.classList.toggle('mdi-rotate-180')
}

let stopSelectedUserPermissionsQuery = () => { }

function loadSelectedUserPermissions() {
    stopSelectedUserPermissionsQuery()
    permissionsList.querySelectorAll('input[type=checkbox]:checked').forEach(toggle => {
        toggle.checked = false
    })
    stopSelectedUserPermissionsQuery = allUsers.doc(selectedUser.id).collection('permissions').onSnapshot(
        snapshot => {
            console.log(snapshot.docChanges())
            snapshot.docChanges().forEach(change => {
                if (change.type == 'added' || change.type == 'modified') {
                    const listItem = permissionsList.children[change.doc.id]
                    if (listItem != undefined) {
                        for (const subListItem of listItem.subList.children) {
                            const toggle = change.doc.data()[subListItem.id]
                            if (toggle != undefined) {
                                subListItem.toggle.checked = toggle
                            }
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

function setListOverlayState(overlay, state) {
    switch (state) {
        case 'loading':
            overlay.classList.remove('hide')
            overlay.classList.remove('show-headers')
            overlay.icon.classList.add('mdi-loading', 'mdi-spin')
            overlay.icon.classList.remove('mdi-emoticon-sad-outline', 'mdi-archive-arrow-up-outline')
            overlay.text.hidden = true
            break
        case 'empty':
            overlay.classList.remove('hide')
            overlay.classList.remove('show-headers')
            overlay.icon.classList.add('mdi-emoticon-sad-outline')
            overlay.icon.classList.remove('mdi-loading', 'mdi-spin', 'mdi-archive-arrow-up-outline')
            overlay.text.hidden = false
            overlay.text.innerText = translate(overlay.id.replace('ListOverlay', '').toUpperCase()) + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            overlay.classList.add('hide')
            break
    }
}
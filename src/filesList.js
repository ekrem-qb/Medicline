const buttonCreateFile = document.querySelector('button#createFile')

const filesList = document.getElementById('filesList')
filesList.overlay = document.getElementById('filesListOverlay')
filesList.overlay.icon = filesList.overlay.getElementsByClassName('iconify')
filesList.overlay.text = filesList.overlay.querySelector('h3')
const filesListItemTemplate = document.getElementById('filesListItemTemplate')
let stopFilesQuery = () => { }
let fileOwnersQueries = []

function listFiles() {
    fileOwnersQueries.forEach(fileOwnerQuery => fileOwnerQuery())
    fileOwnersQueries = []
    if (selectedCase) {
        filesList.innerHTML = ''
        stopFilesQuery = selectedCase.collection('files').orderBy('name', 'asc').onSnapshot(
            snapshot => {
                console.log(snapshot.docChanges())
                snapshot.docChanges().forEach(
                    change => {
                        switch (change.type) {
                            case 'added':
                                const listItem = filesListItemTemplate.content.firstElementChild.cloneNode(true)
                                listItem.id = change.doc.ref.path

                                listItem.label = listItem.querySelector('#label')
                                listItem.label.textContent = change.doc.get('name')

                                listItem.user = listItem.querySelector('#user')

                                listItem.userPath = change.doc.get('createUser')
                                if (change.doc.get('updateUser')) {
                                    listItem.userPath = change.doc.get('updateUser')
                                }
                                fileOwnersQueries.push(
                                    listItem.stopUserQuery = listItem.userPath.onSnapshot(
                                        snapshot => {
                                            if (snapshot.get('name')) {
                                                listItem.user.textContent = snapshot.get('name')
                                            }
                                            else {
                                                listItem.user.textContent = snapshot.get('username')
                                            }
                                        },
                                        error => {
                                            console.error('Error getting user profile: ' + error)
                                        }
                                    )
                                )

                                listItem.date = listItem.querySelector('#date')
                                if (change.doc.get('updateDate')) {
                                    listItem.date.textContent = new Date(change.doc.get('updateDate').seconds * 1000).toLocaleDateString()
                                    listItem.date.title = new Date(change.doc.get('updateDate').seconds * 1000).toLocaleTimeString()
                                }
                                else {
                                    console.log(change.doc.get('createDate'))
                                    listItem.date.textContent = new Date(change.doc.get('createDate').seconds * 1000).toLocaleDateString()
                                    listItem.date.title = new Date(change.doc.get('createDate').seconds * 1000).toLocaleTimeString()
                                }

                                const buttonDelete = listItem.children['delete']
                                buttonDelete.onclick = () => {
                                    deleteFilePath = listItem.id
                                    dialogDeleteFile.materialComponent.open()
                                }
                                buttonDelete.materialRipple = new MDCRipple(buttonDelete)
                                buttonDelete.materialRipple.unbounded = true

                                listItem.deleteButton = buttonDelete

                                if (change.newIndex == filesList.childElementCount) {
                                    filesList.appendChild(listItem)
                                } else {
                                    filesList.insertBefore(listItem, filesList.children[change.newIndex])
                                }
                                break
                            case 'modified':
                                filesList.children[change.doc.ref.path].label.textContent = change.doc.get('name')

                                filesList.children[change.doc.ref.path].stopUserQuery()
                                delete fileOwnersQueries[fileOwnersQueries.indexOf(filesList.children[change.doc.ref.path].stopUserQuery)]
                                filesList.children[change.doc.ref.path].userPath = change.doc.get('createUser')
                                if (change.doc.get('updateUser')) {
                                    filesList.children[change.doc.ref.path].userPath = change.doc.get('updateUser')
                                }
                                fileOwnersQueries.push(
                                    filesList.children[change.doc.ref.path].stopUserQuery = filesList.children[change.doc.ref.path].userPath.onSnapshot(
                                        snapshot => {
                                            if (snapshot.get('name')) {
                                                filesList.children[change.doc.ref.path].user.textContent = snapshot.get('name')
                                            }
                                            else {
                                                filesList.children[change.doc.ref.path].user.textContent = snapshot.get('username')
                                            }
                                        },
                                        error => {
                                            console.error('Error getting user profile: ' + error)
                                        }
                                    )
                                )

                                filesList.children[change.doc.ref.path].date = filesList.children[change.doc.ref.path].querySelector('#date')
                                if (change.doc.get('updateDate')) {
                                    filesList.children[change.doc.ref.path].date.textContent = new Date(change.doc.get('updateDate').seconds * 1000).toLocaleDateString()
                                    filesList.children[change.doc.ref.path].date.title = new Date(change.doc.get('updateDate').seconds * 1000).toLocaleTimeString()
                                }
                                else {
                                    filesList.children[change.doc.ref.path].date.textContent = new Date(change.doc.get('createDate').seconds * 1000).toLocaleDateString()
                                    filesList.children[change.doc.ref.path].date.title = new Date(change.doc.get('createDate').seconds * 1000).toLocaleTimeString()
                                }

                                if (change.newIndex == filesList.childElementCount) {
                                    filesList.appendChild(filesList.children[change.doc.ref.path])
                                } else {
                                    const removedChild = filesList.removeChild(filesList.children[change.doc.ref.path])
                                    filesList.insertBefore(removedChild, filesList.children[change.newIndex])
                                }
                                break
                            case 'removed':
                                filesList.children[change.doc.ref.path].remove()
                                break
                        }
                    }
                )
                if (filesList.childElementCount > 0) {
                    setListOverlayState(filesList.overlay, 'hide')
                } else {
                    setListOverlayState(filesList.overlay, 'empty')
                }
            },
            error => {
                console.error('Error getting ' + collection + ': ' + error)
            }
        )
    }
    else {
        setListOverlayState(filesList.overlay, 'empty')
    }
}

firebase.auth().onAuthStateChanged(user => {
    stopFilesQuery()
    if (user) {
        listFiles()
    }
})

let deleteFilePath
const dialogDeleteFile = document.getElementById('dialogDeleteFile')

dialogDeleteFile.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        db.doc(deleteFilePath).delete().then(() => {

        }).catch(error => {
            console.error('Error removing file: ', error)
        })
    }
})

function setListOverlayState(overlay, state) {
    switch (state) {
        case 'loading':
            overlay.classList.remove('hide')
            overlay.classList.remove('show-headers')
            overlay.icon[0].setAttribute('data-icon', 'eos-icons:loading')
            overlay.text.hidden = true
            break
        case 'empty':
            overlay.classList.remove('hide')
            overlay.classList.remove('show-headers')
            overlay.icon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            overlay.text.hidden = false
            overlay.text.innerText = translate(overlay.id.replace('ListOverlay', '').toUpperCase()) + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            overlay.classList.add('hide')
            break
    }
}
let selectedCaseID
let selectedFileID

const inputName = document.querySelector('input#name')
inputName.oninput = () => {
    inputName.materialComponent.valid = inputName.value.trim() != ''
    if (inputName.value.trim() != '') {
        document.title = inputName.value
    }
    else {
        document.title = translate('NEW#FILE')
    }
}
inputName.onchange = () => inputName.value = inputName.value.trim()

const createField = document.getElementById('createField')
const inputCreateUser = createField.querySelector('input#createUser')
const inputCreateDate = createField.querySelector('input#createDate')

const updateField = document.getElementById('updateField')
const inputUpdateUser = updateField.querySelector('input#updateUser')
const inputUpdateDate = updateField.querySelector('input#updateDate')

const buttonSave = document.querySelector('button#save')
const iconSave = buttonSave.getElementsByClassName('iconify')

buttonSave.onclick = event => {
    event.preventDefault()
    event.stopPropagation()

    if (inputName.value != '') {
        iconSave[0].setAttribute('data-icon', 'eos-icons:loading')

        if (location.hash != '') {
            allCases.doc(selectedCaseID).collection('files').doc(selectedFileID).update({
                name: inputName.value,
                updateUser: allUsers.doc(firebase.auth().currentUser.uid),
                updateDate: firebase.firestore.Timestamp.now()
            }).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                iconSave[0].setAttribute('data-icon', 'ic:round-save')
                console.error('Error updating file: ', error)
            })
        }
        else {
            allCases.doc(selectedCaseID).collection('files').add({
                name: inputName.value,
                createUser: allUsers.doc(firebase.auth().currentUser.uid),
                createDate: firebase.firestore.Timestamp.now()
            }).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                iconSave[0].setAttribute('data-icon', 'ic:round-save')
                console.error('Error creating file: ', error)
            })
        }
    }
}

if (location.search != '') {
    selectedCaseID = location.search.replace('?', '')

    allCases.doc(selectedCaseID).onSnapshot(
        _case => {
            if (!_case.exists) {
                ipcRenderer.send('window-action', 'exit')
            }
        },
        error => {
            console.error('Error getting case: ', error)
            ipcRenderer.send('window-action', 'exit')
        }
    )

    if (location.hash != '') {
        selectedFileID = location.hash.replace('#', '')

        const stopQuery = allCases.doc(selectedCaseID).collection('files').doc(selectedFileID).onSnapshot(
            file => {
                stopQuery()

                inputName.materialComponent.value = file.get('name')
                document.title = inputName.value
                inputName.materialComponent.disabled = false
                buttonSave.disabled = false

                if (file.get('createUser')) {
                    createField.classList.remove('hide')
                    inputCreateDate.materialComponent.value = new Date(file.get('createDate').seconds * 1000).toLocaleString()

                    stopUserQuery = file.get('createUser').onSnapshot(
                        snapshot => {
                            if (snapshot.get('name')) {
                                inputCreateUser.materialComponent.value = snapshot.get('name')
                            }
                            else {
                                inputCreateUser.materialComponent.value = snapshot.get('username')
                            }
                        },
                        error => {
                            console.error('Error getting user profile: ' + error)
                        }
                    )
                }

                if (file.get('updateUser')) {
                    updateField.classList.remove('hide')
                    inputUpdateDate.materialComponent.value = new Date(file.get('updateDate').seconds * 1000).toLocaleString()

                    stopUserQuery = file.get('updateUser').onSnapshot(
                        snapshot => {
                            if (snapshot.get('name')) {
                                inputUpdateUser.materialComponent.value = snapshot.get('name')
                            }
                            else {
                                inputUpdateUser.materialComponent.value = snapshot.get('username')
                            }
                        },
                        error => {
                            console.error('Error getting user profile: ' + error)
                        }
                    )
                }
            },
            error => {
                console.error('Error getting file: ', error)
            }
        )
    }
    else {
        inputName.materialComponent.disabled = false
        buttonSave.disabled = false
    }
}
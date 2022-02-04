const dialogDeleteCase = document.getElementById('dialogDeleteCase')
dialogDeleteCase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        const promises = []
        promises.push(
            currentCase.collection('proforma').get().then(activities => {
                activities.forEach(file => {
                    file.ref.delete().then(() => {
                    }).catch(error => {
                        console.error('Error removing activity: ', error)
                    })
                })
            }).catch(error => {
                console.error('Error getting activities: ', error)
            })
        )
        promises.push(
            currentCase.collection('files').get().then(files => {
                files.forEach(file => {
                    file.ref.delete().then(() => {
                    }).catch(error => {
                        console.error('Error removing file from firestore: ', error)
                    })
                })
            }).catch(error => {
                console.error('Error getting files from firestore: ', error)
            })
        )
        promises.push(
            storage.child(currentCase.id).listAll().then(folder => {
                folder.items.forEach(file => {
                    storage.child(file.fullPath).delete().then(() => {
                    }).catch(error => {
                        console.error('Error removing file from storage: ', error)
                    })
                })
            }).catch(error => {
                console.error('Error listing files from storage: ', error)
            })
        )
        promises.push(
            currentCase.delete().then(() => {
            }).catch(error => {
                console.error('Error removing case: ', error)
            })
        )
        Promise.all(promises).then(() => {
            ipcRenderer.send('window-action', 'exit')
        })
    }
})
const formEditCase = document.querySelector('form#editCase')
const currentCaseID = document.getElementById('currentCaseID')
const currentCaseIDIcon = currentCaseID.parentElement.getElementsByClassName('iconify')
currentCaseID.parentElement.onclick = () => {
    navigator.clipboard.writeText(currentCaseID.innerText)
    alert('"' + currentCaseID.innerText + '"' + translate('COPIED'))
}

const actionButtonsPanel = document.getElementById('actionButtonsPanel')
const buttonDelete = actionButtonsPanel.querySelector('button#delete')
const buttonSave = actionButtonsPanel.querySelector('button#save')

let currentCase, caseExists = false
let currentCaseStatus = 'active'
let stopIDSearch = () => { }

function checkCaseID() {
    if (currentCase == undefined) {
        currentCaseIDIcon[0].setAttribute('data-icon', 'eos-icons:loading')
    }
    else {
        currentCaseIDIcon[0].setAttribute('data-icon', 'ic:round-numbers')
    }
    currentCaseID.parentElement.disabled = currentCase == undefined
    buttonSave.disabled = currentCase == undefined
}

function validateInput(input) {
    if (input.target) {
        input = input.target
    }
    if (input.hasAttribute('type')) {
        if (input.attributes.type.value.includes('select')) {
            return true
        }
    }
    if (input.inputmask) {
        input.classList.toggle('is-invalid', !input.inputmask.isValid())
        if (input.value == '') {
            input.classList.toggle('is-invalid', input.required)
        }
    }
    else {
        if (input.tomselect) {
            if (input.tomselect.isRequired) {
                input.tomselect.wrapper.classList.toggle('is-invalid', input.tomselect.items.length == 0)
                return !input.tomselect.wrapper.classList.contains('is-invalid')
            }
        }
        else {
            if (input.required) {
                input.classList.toggle('is-invalid', input.value == '')
            }
        }
    }
    return !input.classList.contains('is-invalid')
}

function toggleCheckboxRelatedInputs(checkbox) {
    checkbox.relatedInputs.forEach(input => {
        input.disabled = !checkbox.checked
        input.parentElement.parentElement.hidden = !checkbox.checked
    })
}

formEditCase.querySelectorAll('input, textarea').forEach(
    inputEdit => {
        if (inputEdit.type != 'checkbox') {
            inputEdit.onchange = () => inputEdit.value = inputEdit.value.trim()
            if (inputEdit.id.includes('_')) {
                inputEdit.disabled = true
            }
            else {
                inputEdit.parentElement.parentElement.hidden = inputEdit.disabled
            }
        }
        else {
            inputEdit.relatedInputs = inputEdit.parentElement.parentElement.parentElement.parentElement.querySelectorAll('input[type="text"')

            inputEdit.onchange = () => toggleCheckboxRelatedInputs(inputEdit)
        }
    }
)

checkCaseID()

function generateCaseID() {
    currentCaseID.innerText = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
    checkCaseID()
    counter++
}

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadPermissions()
    }
    else {
        stopPermissionsQuery()
    }
})

let stopPermissionsQuery = () => { }

function toggleEditMode(editIsAllowed) {
    actionButtonsPanel.classList.toggle('hide', !editIsAllowed)
    if (editIsAllowed) {
        buttonDelete.onclick = () => dialogDeleteCase.materialComponent.open()
        buttonDelete.tabIndex = 0
        buttonSave.onclick = saveCase
        buttonSave.tabIndex = 0
    }
    else {
        buttonDelete.onclick = () => { }
        buttonDelete.tabIndex = -1
        buttonSave.onclick = () => { }
        buttonSave.tabIndex = -1
    }
}

function loadPermissions() {
    toggleEditMode(false)

    stopPermissionsQuery()
    stopPermissionsQuery = allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').doc('cases').onSnapshot(
        snapshot => {
            toggleEditMode(snapshot.get('edit'))
        },
        error => {
            console.error('Error getting permissions: ' + error)
        }
    )
}

if (location.hash != '') {
    document.title = location.hash
    const id = location.hash.replace('#', '')

    currentCase = allCases.doc(id)
    currentCaseID.innerText = id

    console.time()

    const stopQuery = currentCase.onSnapshot(snapshot => {
        stopQuery()
        console.timeLog()
        console.log(snapshot.data())

        caseExists = snapshot.exists
        buttonDelete.disabled = !caseExists
        checkCaseID()

        if (caseExists) {
            currentCaseStatus = snapshot.get('status')

            formEditCase.querySelectorAll('input, textarea').forEach(inputEdit => {
                const itemValue = snapshot.get(inputEdit.id)

                if (itemValue != undefined) {
                    if (inputEdit.disabled) {
                        if (itemValue != '') {
                            inputEdit.parentElement.parentElement.hidden = false
                        }
                    }
                    else {
                        inputEdit.parentElement.parentElement.hidden = false
                    }

                    if (inputEdit.type != 'checkbox') {
                        if (!inputEdit.parentElement.parentElement.hidden) {
                            if (inputEdit.getAttribute('mask') == 'date') {
                                inputEdit.value = new Date(itemValue).toLocaleDateString('tr')
                            }
                            else {
                                inputEdit.value = itemValue
                            }
                        }
                    }
                    else {
                        inputEdit.checked = itemValue
                        toggleCheckboxRelatedInputs(inputEdit)
                    }
                }
            })

            formEditCase.querySelectorAll('select').forEach(select => {
                if (snapshot.get(select.id) != undefined) {
                    const value = snapshot.get(select.id)

                    if (value != undefined) {
                        if (Array.isArray(value)) {
                            value.forEach(item => {
                                if (!select.tomselect.options[item]) {
                                    select.tomselect.addOption({
                                        value: item,
                                        text: item
                                    })
                                }
                                select.tomselect.addItem(item)
                            })
                        }
                        else {
                            select.tomselect.on('option_add', option => {
                                if (option == value.path) {
                                    select.tomselect.addItem(value.path)
                                    select.tomselect.on('option_add', () => { })
                                }
                            })
                        }
                        if (select.disabled) {
                            if (value != '') {
                                select.parentElement.parentElement.hidden = false
                            }
                        }
                        else {
                            select.parentElement.parentElement.hidden = false
                        }
                    }
                }
            })
        }
    })
    caseExists = true
}
else {
    console.time()
    stopIDSearch()
    stopIDSearch = allCases.onSnapshot(
        snapshot => {
            console.timeEnd()

            const today = new Date().toLocaleDateString('tr').split('.')
            let newID = today[2].substr(-2) + today[1] + '100'

            if (snapshot.docs[snapshot.docs.length - 1]) {
                if (snapshot.docs[snapshot.docs.length - 1].id.substr(0, 4) == newID.substr(0, 4)) {
                    newID = newID.replace('100', (Number.parseInt(snapshot.docs[snapshot.docs.length - 1].id.substr(-3)) + 1).toString())
                }
            }

            currentCase = allCases.doc(newID)
            document.title = '#' + newID
            currentCaseID.innerText = newID
            checkCaseID()
        },
        err => {
            console.error(err)
        }
    )
    formEditCase.querySelector('#callDate').value = new Date().toLocaleDateString('tr')
    formEditCase.querySelector('#callTime').value = new Date().toLocaleTimeString('tr').substr(0, 5)
    formEditCase.querySelector('#appointmentDate').value = new Date().toLocaleDateString('tr')
    formEditCase.querySelector('#appointmentTime').value = new Date().toLocaleTimeString('tr').substr(0, 5)
}

function saveCase() {
    const caseData = { status: currentCaseStatus }
    let valid = true

    for (const input of formEditCase.querySelectorAll('input, textarea, select')) {
        if (input != undefined) {
            if (input.tomselect != undefined) {
                input.onchange = validateInput

                if (!validateInput(input)) {
                    valid = false
                    input.tomselect.focus()
                    break
                }

                const value = input.tomselect.getValue()

                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        caseData[input.id] = value
                    }
                }
                else {
                    if (value != '') {
                        caseData[input.id] = db.doc(value)
                    }
                }
            }
            else {
                input.oninput = validateInput

                if (!validateInput(input)) {
                    valid = false
                    input.focus()
                    break
                }

                if (input.value != '' && !input.readOnly && !input.parentElement.parentElement.hidden) {
                    if (input.inputmask != undefined) {
                        caseData[input.id] = input.inputmask.unmaskedvalue()
                    }
                    else {
                        if (input.type != 'checkbox') {
                            caseData[input.id] = input.value
                        }
                        else {
                            caseData[input.id] = input.checked
                        }
                    }
                }
            }
        }
    }

    console.log(caseData)
    console.log('isValid: ' + valid)

    if (valid) {
        stopIDSearch()
        const today = new Date().toLocaleDateString('tr').split('.')
        if (caseExists) {
            caseData.updateUser = allUsers.doc(firebase.auth().currentUser.uid)
            caseData.updateDate = today[2] + '-' + today[1] + '-' + today[0]
            caseData.updateTime = new Date().toLocaleTimeString('tr').substr(0, 5)
            currentCase.set(caseData).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                console.error('Error updating case: ', error)
            })
        }
        else {
            caseData.createUser = allUsers.doc(firebase.auth().currentUser.uid)
            caseData.createDate = today[2] + '-' + today[1] + '-' + today[0]
            caseData.createTime = new Date().toLocaleTimeString('tr').substr(0, 5)
            currentCase.set(caseData).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                console.error('Error creating case: ', error)
            })
        }
    }
}
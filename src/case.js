const dialogDeleteCase = document.querySelector("#dialogDeleteCase")
dialogDeleteCase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        currentCase.delete().then(() => {
            ipcRenderer.send('window-action', 'exit')
        }).catch(error => {
            console.error("Error removing case: ", error)
        })
    }
})
const formEditCase = document.querySelector("form#editCase")
const buttonSave = document.querySelector("button#save")
const currentCaseID = document.querySelector("#currentCaseID")
const currentCaseIDIcon = currentCaseID.parentElement.querySelector(".mdi")
currentCaseID.parentElement.onclick = () => {
    navigator.clipboard.writeText(currentCaseID.innerText)
    alert('"' + currentCaseID.innerText + '"' + translate("COPIED"))
}

const buttonDelete = document.querySelector("button#delete")
buttonDelete.onclick = () => dialogDeleteCase.materialComponent.open()

let currentCase, caseExists = false
let stopIDSearch = () => { }

function checkCaseID() {
    currentCaseID.parentElement.disabled = currentCase == undefined
    currentCaseIDIcon.classList.toggle("mdi-pound", currentCase != undefined)
    currentCaseIDIcon.classList.toggle("mdi-loading", currentCase == undefined)
    currentCaseIDIcon.classList.toggle("mdi-spin", currentCase == undefined)
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
    if (input.mask) {
        input.classList.toggle('is-invalid', !input.mask.isValid())
        if (!input.required && input.mask.unmaskedvalue() == '') {
            input.classList.remove('is-invalid')
        }
    }
    else {
        if (input.tomSelect) {
            if (input.tomSelect.isRequired) {
                input.tomSelect.wrapper.classList.toggle('is-invalid', input.tomSelect.items.length == 0)
                return !input.tomSelect.wrapper.classList.contains('is-invalid')
            }
        }
        else {
            input.value = String(input.value).trim()
            if (input.required) {
                input.classList.toggle('is-invalid', input.value == '')
            }
        }
    }
    return !input.classList.contains('is-invalid')
}

formEditCase.querySelectorAll('input, textarea').forEach(
    inputEdit => {
        inputEdit.onchange = () => inputEdit.value = inputEdit.value.trim()
        if (inputEdit.id.includes('_')) {
            inputEdit.disabled = true
        }
        else {
            inputEdit.parentElement.parentElement.hidden = inputEdit.disabled
        }
    }
)

loadSelectMenus()

checkCaseID()

function generateCaseID() {
    currentCaseID.innerText = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
    checkCaseID()
    counter++
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

        caseExists = snapshot.exists
        buttonDelete.disabled = !caseExists
        checkCaseID()

        if (caseExists) {
            formEditCase.querySelectorAll('input, textarea').forEach(inputEdit => {
                let itemValue = snapshot.get(inputEdit.id)

                if (itemValue != undefined) {
                    if (inputEdit.disabled) {
                        if (itemValue != '') {
                            inputEdit.parentElement.parentElement.hidden = false
                        }
                    }
                    else {
                        inputEdit.parentElement.parentElement.hidden = false
                    }

                    if (!inputEdit.parentElement.parentElement.hidden) {
                        if (inputEdit.getAttribute("mask") == "date") {
                            inputEdit.value = new Date(itemValue).toLocaleDateString('tr')
                        }
                        else {
                            if (inputEdit.id.includes('User')) {
                                admin.auth().getUserByEmail(itemValue + emailSuffix).then(user => {
                                    if (user.displayName) {
                                        inputEdit.value = user.displayName
                                    }
                                }).catch(error => {
                                    console.error("Error getting user by email: ", error)
                                })
                            }
                            inputEdit.value = itemValue
                        }
                    }
                }
            })

            formEditCase.querySelectorAll('select').forEach(select => {
                if (snapshot.get(select.id) != undefined) {
                    let itemValue = snapshot.get(select.id).path

                    if (itemValue != undefined) {
                        if (select.id.includes('_')) {
                            setTimeout(() => select.tomSelect.addItem(itemValue), 100)
                        }
                        else {
                            select.tomSelect.addItem(itemValue)
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
    formEditCase.querySelector("#callDate").value = new Date().toLocaleDateString('tr')
    formEditCase.querySelector("#callTime").value = new Date().toLocaleTimeString().substr(0, 5)
    formEditCase.querySelector("#appointmentDate").value = new Date().toLocaleDateString('tr')
    formEditCase.querySelector("#appointmentTime").value = new Date().toLocaleTimeString().substr(0, 5)
}

function saveCase() {
    let caseData = {}
    let valid = true

    formEditCase.querySelectorAll('input, textarea').forEach(inputEdit => {
        if (inputEdit != undefined) {
            inputEdit.oninput = validateInput

            if (!validateInput(inputEdit)) {
                valid = false
            }

            if (inputEdit.value != '' && !inputEdit.disabled && !inputEdit.readOnly) {
                if (inputEdit.mask != undefined) {
                    caseData[inputEdit.id] = inputEdit.mask.unmaskedvalue()
                }
                else {
                    caseData[inputEdit.id] = inputEdit.value
                }
            }
        }
    })

    formEditCase.querySelectorAll('select').forEach(select => {
        if (select != undefined) {
            select.onchange = validateInput

            if (!validateInput(select)) {
                valid = false
            }

            if (select.tomSelect.getValue() != '') {
                caseData[select.id] = db.doc(select.tomSelect.getValue())
            }
        }
    })

    console.log(caseData)
    console.log('isValid: ' + valid)

    if (valid) {
        stopIDSearch()
        const today = new Date().toLocaleDateString('tr').split('.')
        if (caseExists) {
            caseData.updateUser = firebase.auth().currentUser.email.replace(emailSuffix, '')
            caseData.updateDate = today[2] + '-' + today[1] + '-' + today[0]
            caseData.updateTime = new Date().toLocaleTimeString().substr(0, 5)
            currentCase.update(caseData).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                console.error("Error updating case: ", error)
            })
        }
        else {
            caseData.createUser = firebase.auth().currentUser.email.replace(emailSuffix, '')
            caseData.createDate = today[2] + '-' + today[1] + '-' + today[0]
            caseData.createTime = new Date().toLocaleTimeString().substr(0, 5)
            caseData.status = "active"
            currentCase.set(caseData).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                console.error("Error creating case: ", error)
            })
        }
    }
}

buttonSave.onclick = saveCase

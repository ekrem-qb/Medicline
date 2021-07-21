const dialogDeleteCase = document.querySelector("#dialogDeleteCase")
dialogDeleteCase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        currentCase.delete().then(() => {
            ipcRenderer.send('window-action', 'exit')
        }).catch(error => {
            console.error("Error removing document: ", error)
        })
    }
})
const formEditCase = document.querySelector("form#editCase")
const buttonSave = document.querySelector("button#save")
const currentCaseID = document.querySelector("#currentCaseID")
currentCaseID.parentElement.onclick = () => {
    navigator.clipboard.writeText(currentCaseID.innerText)
    alert(currentCaseID.innerText + translate("COPIED"))
}

const buttonDelete = document.querySelector("button#delete")
buttonDelete.onclick = () => dialogDeleteCase.materialComponent.open()

var currentCase, caseExists = false

function checkCaseID() {
    buttonSave.disabled = currentCase == undefined

    currentCaseID.parentElement.disabled = currentCase == undefined
    let idIcon = currentCaseID.parentElement.querySelector(".mdi")
    idIcon.classList.toggle("mdi-pound", currentCase != undefined)
    idIcon.classList.toggle("mdi-loading", currentCase == undefined)
    idIcon.classList.toggle("mdi-spin", currentCase == undefined)

    if (currentCase == undefined)
        currentCaseID.parentElement.parentElement.title = "Generating available ID..."
    else
        currentCaseID.parentElement.parentElement.title = ''
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

function randomCaseID() {
    currentCaseID.innerText = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
    checkCaseID()
    counter++
}

if (location.hash != '') {
    let id = location.hash.replace('#', '')

    currentCase = allCases.doc(id)
    currentCaseID.innerText = id

    console.time()

    currentCase.get().then(snapshot => {
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
                            inputEdit.value = new Date(itemValue).toLocaleDateString("tr")
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
                            setTimeout(() => select.tomSelect.addItem(itemValue), 50)
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
    var counter = 0

    var repeatRandomCaseID = setInterval(randomCaseID, 50)

    allCases.onSnapshot(
        snapshot => {
            do {
                randomCaseID()
                caseExists = snapshot.docs.some(item => item.id === currentCaseID.innerText)

                console.log(currentCaseID.innerText + ":" + caseExists + " in " + snapshot.docs.length + " Time: " + counter)
                counter = 0
            } while (caseExists)

            currentCase = allCases.doc(currentCaseID.innerText)
            checkCaseID()
            clearInterval(repeatRandomCaseID)
            formEditCase.querySelector("#callDate").value = new Date().toLocaleDateString("tr")
            formEditCase.querySelector("#callTime").value = new Date().toLocaleTimeString().substr(0, 5)
            formEditCase.querySelector("#appointmentDate").value = new Date().toLocaleDateString("tr")
            formEditCase.querySelector("#appointmentTime").value = new Date().toLocaleTimeString().substr(0, 5)
        },
        err => {
            console.error(err)
        }
    )
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
        if (caseExists) {
            caseData.updateUser = firebase.auth().currentUser.email.replace(emailSuffix, '')
            caseData.updateDate = new Date().toJSON().substr(0, 10)
            caseData.updateTime = new Date().toLocaleTimeString().substr(0, 5)
            currentCase.update(caseData).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                console.error("Error updating document: ", error)
            })
        }
        else {
            caseData.createUser = firebase.auth().currentUser.email.replace(emailSuffix, '')
            caseData.createDate = new Date().toJSON().substr(0, 10)
            caseData.createTime = new Date().toLocaleTimeString().substr(0, 5)
            caseData.status = "active"
            currentCase.set(caseData).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                console.error("Error writing document: ", error)
            })
        }
    }
}

buttonSave.onclick = saveCase

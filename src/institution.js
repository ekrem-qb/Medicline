let currentQuery = db.collection('insurance')
const selectInstitutionType = document.getElementById('institutionType')
selectInstitutionType.materialComponent.listen('MDCSelect:change', () => {
    currentQuery = db.collection(selectInstitutionType.materialComponent.value)
})

const formInstitution = document.getElementById('institution')
const inputName = document.getElementById('name')

formInstitution.querySelectorAll('input, textarea').forEach(input => input.onchange = () => {
    input.value = input.value.trim()
    validateInput(input)
})

let currentInstitution

const buttonSave = document.getElementById('save')
buttonSave.onclick = () => {
    let data = {}
    let valid = true

    formInstitution.querySelectorAll('input, textarea').forEach(input => {
        if (input != undefined) {
            input.oninput = validateInput

            if (!validateInput(input)) {
                valid = false
            }

            if (input.value != '' && !input.disabled && !input.readOnly) {
                if (input.mask != undefined) {
                    data[input.id] = input.mask.unmaskedvalue()
                }
                else {
                    data[input.id] = input.value
                }
            }
        }
    })

    console.log(data)
    console.log('isValid: ' + valid)

    if (valid) {
        if (currentInstitution) {
            currentInstitution.update(data).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                console.error("Error updating institution: ", error)
            })
        }
        else {
            currentQuery.add(data).then(() => {
                ipcRenderer.send('window-action', 'exit')
            }).catch(error => {
                console.error("Error creating institution: ", error)
            })
        }
    }
}

const buttonDelete = document.getElementById('delete')
buttonDelete.onclick = () => dialogDeleteInstitution.materialComponent.open()

const dialogDeleteInstitution = document.querySelector("#dialogDeleteInstitution")
dialogDeleteInstitution.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        currentInstitution.delete().then(() => {
            currentInstitution = undefined
        }).catch(error => {
            console.error("Error removing institution: ", error)
        })
    }
})

function validateInput(input) {
    if (input.target) {
        input = input.target
    }
    if (input.mask) {
        input.materialComponent.valid = input.mask.isValid()
        if (!input.required && input.mask.unmaskedvalue() == '') {
            input.materialComponent.valid = true
        }
    }
    else {
        input.value = String(input.value).trim()
        if (input.required) {
            input.materialComponent.valid = input.value != ''
        }
        input.materialComponent.valid = input.validity.valid
    }
    return input.materialComponent.valid
}

if (location.search != '') {
    selectInstitutionType.materialComponent.value = location.search.replace('?', '')

    if (location.hash) {
        document.title = location.hash
        const id = location.hash.replace('#', '')

        currentInstitution = db.collection(selectInstitutionType.materialComponent.value).doc(id)
        selectInstitutionType.materialComponent.disabled = true

        console.time()

        currentInstitution.get().then(snapshot => {
            console.timeLog()

            buttonDelete.disabled = !snapshot.exists
            buttonSave.disabled = false

            if (snapshot.exists) {
                formInstitution.querySelectorAll('input, textarea').forEach(input => {
                    let itemValue = snapshot.get(input.id)

                    if (itemValue != undefined) {
                        if (input.disabled) {
                            if (itemValue != '') {
                                input.parentElement.parentElement.hidden = false
                            }
                        }
                        else {
                            input.parentElement.parentElement.hidden = false
                        }

                        if (!input.parentElement.parentElement.hidden) {
                            if (input.getAttribute("mask") == "date") {
                                input.materialComponent.value = new Date(itemValue).toLocaleDateString('tr')
                            }
                            else {
                                input.materialComponent.value = itemValue
                            }
                        }
                    }
                })
            }
        })
    }
    else {
        buttonSave.disabled = false
    }
}

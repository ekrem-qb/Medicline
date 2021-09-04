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

if (location.search != '') {
    selectInstitutionType.materialComponent.value = location.search.replace('?', '')
    buttonSave.disabled = false
    if (location.hash) {

    }
}

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

function saveInstitution() {
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
buttonSave.onclick = saveInstitution
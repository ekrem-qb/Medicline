const TomSelect = require('tom-select/dist/js/tom-select.base')
const icd10Codes = require('./icd10_codes.json')
let selectMenuQueries = []
let selectMenus = []

function loadSelectMenus() {
    selectMenus = []
    document.querySelectorAll('select').forEach(select => {
        const selectID = select.id.replace(/[0-9]/g, '').replace('createUser', 'users').replace('updateUser', 'users')

        if (select.tomselect == undefined) {
            const settings = {
                render: {
                    option_create: function (data, escape) {
                        return '<div class="create">' + translate('ADD') + ' <b>' + escape(data.input) + '</b>&hellip;</div>'
                    },
                    no_results: function (data, escape) {
                        return '<div class="no-results">' + '"' + escape(data.input) + '" ' + translate('NOT_FOUND') + '</div>'
                    }
                }
            }
            if (selectID == 'diagnosis') {
                settings.maxItems = 10
                settings.create = true
                new TomSelect(select, settings)

                for (const icd in icd10Codes) {
                    select.tomselect.addOption({
                        value: icd,
                        text: icd + ' - ' + icd10Codes[icd]
                    })
                }
            }
            else {
                settings.maxItems = 1
                settings.sortField = 'text'
                selectMenus.push(new TomSelect(select, settings))
            }
            select.tomselect.selectID = selectID
        }

        if (!selectID.includes('_') && selectID != 'diagnosis') {
            selectMenuQueries.push(
                db.collection(selectID).onSnapshot(
                    snapshot => {
                        loadOptions(select, snapshot)
                    },
                    error => {
                        console.error(error)
                    }
                )
            )
            select.tomselect.on('item_add', value => {
                const helperText = select.parentElement.parentElement.parentElement.querySelector('.helper-text>span')
                if (helperText) {
                    if (helperText.id.split('_')[0] == select.id) {
                        selectMenuQueries.push(
                            db.doc(value).onSnapshot(
                                snapshot => {
                                    const inputValue = snapshot.get(helperText.id.split('_')[1])
                                    if (inputValue != undefined) {
                                        helperText.parentElement.classList.remove('hide')
                                        helperText.innerText = inputValue
                                    }
                                },
                                error => {
                                    console.error(error)
                                }
                            )
                        )
                    }
                }
                const subInputs = select.parentElement.parentElement.parentElement.querySelectorAll('input:not([role="combobox"]), textarea')
                subInputs.forEach(subInput => {
                    if (subInput.id.split('_')[0] == select.id) {
                        subInput.disabled = false
                        subInput.value = ''
                    }
                })
                const subSelects = select.parentElement.parentElement.parentElement.querySelectorAll('select:not(#' + select.id + ')')
                select.tomselect.subSelects = []
                subSelects.forEach(subSelect => {
                    if (subSelect.id.split('_')[0] == select.id) {
                        select.tomselect.subSelects.push(subSelect.tomselect)

                        subSelect.tomselect.upperSelect = select.tomselect
                        subSelect.tomselect.enable()

                        selectMenuQueries.push(
                            db.doc(value).collection(subSelect.id.split('_')[1]).onSnapshot(
                                snapshot => {
                                    loadOptions(subSelect, snapshot)
                                },
                                error => {
                                    console.error(error)
                                }
                            )
                        )
                    }
                })
            })
            select.tomselect.on('item_remove', () => {
                const helperText = select.parentElement.parentElement.parentElement.querySelector('.helper-text>span')
                if (helperText) {
                    if (helperText.id.split('_')[0] == select.id) {
                        helperText.parentElement.classList.add('hide')
                    }
                }
                const subInputs = select.parentElement.parentElement.parentElement.querySelectorAll('input:not([role="combobox"]), textarea')
                subInputs.forEach(subInput => {
                    if (subInput.id.split('_')[0] == select.id) {
                        subInput.disabled = true
                        subInput.value = ''
                    }
                })
                const subSelects = select.parentElement.parentElement.parentElement.querySelectorAll('select')
                subSelects.forEach(subSelect => {
                    if (subSelect != select && subSelect.id.split('_')[0] == select.id) {
                        subSelect.tomselect.disable()
                        subSelect.tomselect.clear()
                    }
                })
            })
        }
    })
}

function loadOptions(select, snapshot) {
    const oldItems = select.tomselect.items.slice(0)

    select.tomselect.clear()
    select.tomselect.clearOptions()

    snapshot.forEach(item => {
        select.tomselect.addOption({
            value: item.ref.path,
            text: item.get('name')
        })
        select.tomselect.trigger('option_add', item.ref.path, {
            value: item.ref.path,
            text: item.get('name')
        })
    })
    if (select.tomselect.isOpen) {
        select.tomselect.refreshOptions()
    }

    oldItems.forEach(item => {
        select.tomselect.addItem(item)
    })
}

function createOption(value, select) {
    if (select.upperSelect) {
        db.doc(select.upperSelect.getValue()).collection(select.inputId.split('_')[1]).add({ name: value }).then(snapshot => {
            select.addItem(snapshot.path)
        }).catch(error => {
            console.error('Error creating ' + select.inputId.split('_')[1] + ': ', error)
        })
    }
    else {
        db.collection(select.selectID).add({ name: value }).then(snapshot => {
            select.addItem(snapshot.path)
            switch (select.selectID) {
                case 'insurance':
                case 'provider':
                    ipcRenderer.send('new-window', 'institution', snapshot.id, select.selectID)
                    break
            }
        }).catch(error => {
            console.error('Error creating ' + select.selectID + ': ', error)
        })
    }
}

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadSelectMenus()
        loadSelectPermissions()
    }
    else {
        selectMenuQueries.forEach(stopQuery => stopQuery())
        selectMenuQueries = []
        stopSelectPermissionsQueries()
    }
})

const stopSelectPermissionsQueries = () => {
    selectPermissionsQueries.forEach(stopQuery => stopQuery())
    selectPermissionsQueries = []
}
let selectPermissionsQueries = []

function toggleCreateOptions(allowedPermissions) {
    selectMenus.forEach(select => {
        let isAllowed = false

        if (select.inputId.includes('address')) {
            isAllowed = allowedPermissions.includes('hotels')
        }
        if (select.inputId.includes('country')) {
            isAllowed = allowedPermissions.includes('countries')
        }
        if (select.inputId.includes('provider') || select.inputId.includes('insurance')) {
            isAllowed = allowedPermissions.includes('institutions')
        }

        if (isAllowed) {
            select.settings.create = value => createOption(value, select)
            if (select.isOpen) {
                select.refreshOptions()
            }
        }
        else {
            select.settings.create = false
            if (select.isOpen) {
                select.refreshOptions()
            }
        }
    })
}

function loadSelectPermissions() {
    toggleCreateOptions([])

    stopSelectPermissionsQueries()
    selectPermissionsQueries.push(
        allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').where('edit', '==', true).onSnapshot(
            snapshot => {
                let allowedPermissions = []
                snapshot.forEach(permission => {
                    allowedPermissions.push(permission.id)
                })
                toggleCreateOptions(allowedPermissions)
            },
            error => {
                console.error('Error getting permissions: ' + error)
            }
        )
    )
}
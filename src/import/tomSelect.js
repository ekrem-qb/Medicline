const TomSelect = require('tom-select/dist/js/tom-select.base')
let selectMenuQueries = []
let selectMenus = []

function loadSelectMenus() {
    selectMenus = []
    document.querySelectorAll('select').forEach(select => {
        const selectID = select.id.replace(/[0-9]/g, '').replace('createUser', 'users').replace('updateUser', 'users')

        if (select.tomselect == undefined) {
            selectMenus.push(
                new TomSelect(select, {
                    maxItems: 1,
                    selectOnTab: true,
                    sortField: "text",
                    render: {
                        option_create: function (data, escape) {
                            return '<div class="create">' + translate('ADD') + ' <b>' + escape(data.input) + '</b>&hellip;</div>';
                        },
                        no_results: function (data, escape) {
                            return '<div class="no-results">' + '"' + escape(data.input) + '" ' + translate('NOT_FOUND') + '</div>';
                        }
                    }
                })
            )
            select.tomselect.selectID = selectID
        }

        if (!selectID.includes('_')) {
            selectMenuQueries.push(
                db.collection(selectID).onSnapshot(
                    snapshot => {
                        const oldValue = select.tomselect.getValue()

                        select.tomselect.clear()
                        select.tomselect.clearOptions()

                        snapshot.docs.forEach(item => {
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

                        if (oldValue) {
                            select.tomselect.addItem(oldValue)
                        }
                    },
                    error => {
                        console.error(error)
                    }
                )
            )
            select.tomselect.on("item_add", value => {
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
                        subInput.value = ""
                    }
                })
                const subSelects = select.parentElement.parentElement.parentElement.querySelectorAll('select')
                subSelects.forEach(subSelect => {
                    if (subSelect != select && subSelect.id.split('_')[0] == select.id) {
                        subSelect.tomselect.upperSelect = select.tomselect
                        select.tomselect.subSelect = subSelect.tomselect
                        subSelect.tomselect.enable()

                        selectMenuQueries.push(
                            db.doc(value).collection(subSelect.id.split('_')[1]).onSnapshot(
                                snapshot => {
                                    const oldValue = subSelect.tomselect.getValue()

                                    subSelect.tomselect.clear()
                                    subSelect.tomselect.clearOptions()

                                    snapshot.docs.forEach(item => {
                                        subSelect.tomselect.addOption({
                                            value: item.ref.path,
                                            text: item.get('name')
                                        })
                                        subSelect.tomselect.trigger('option_add', item.ref.path, {
                                            value: item.ref.path,
                                            text: item.get('name')
                                        })
                                    })
                                    if (subSelect.tomselect.isOpen) {
                                        subSelect.tomselect.refreshOptions()
                                    }

                                    if (oldValue) {
                                        subSelect.tomselect.addItem(oldValue)
                                    }
                                },
                                error => {
                                    console.error(error)
                                }
                            )
                        )
                    }
                })
            })
            select.tomselect.on("item_remove", () => {
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
                        subInput.value = ""
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

function createOption(value, select) {
    if (select.upperSelect) {
        db.doc(select.upperSelect.getValue()).collection(select.inputId.split('_')[1]).add({ name: value }).then(snapshot => {
            select.addItem(snapshot.path)
        }).catch(error => {
            console.error("Error creating " + select.inputId.split('_')[1] + ": ", error)
        })
    }
    else {
        db.collection(select.selectID).add({ name: value }).then(snapshot => {
            select.addItem(snapshot.path)
            switch (select.selectID) {
                case 'insurance':
                case 'provider':
                    ipcRenderer.send('new-window', 'institution', snapshot.id, select.selectID)
                    break;
            }
        }).catch(error => {
            console.error("Error creating " + select.selectID + ": ", error)
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
                snapshot.docs.forEach(permission => {
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
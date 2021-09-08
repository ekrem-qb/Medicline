const TomSelect = require('tom-select/dist/js/tom-select.base')
let selectMenuQueries = []

function loadSelectMenus() {
    selectMenuQueries.forEach(stopQuery => stopQuery())
    selectMenuQueries = []
    document.querySelectorAll('select').forEach(select => {
        const selectID = select.id.replace(/[0-9]/g, '')

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

        if (selectID != 'patientStatus' && selectID != 'country') {
            select.tomselect.settings.create = value => {
                db.collection(selectID).add({ name: value }).then(snapshot => {
                    select.tomselect.addItem(snapshot.path)
                    if (selectID == 'insurance' || selectID == 'provider') {
                        ipcRenderer.send('new-window', 'institution', snapshot.id, selectID)
                    }
                }).catch(error => {
                    console.error("Error creating " + selectID + ": ", error)
                })
            }
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
                        subSelect.tomselect.settings.create = value => {
                            if (subSelect.id.split('_')[1] == 'hotel') {
                                db.doc(select.tomselect.getValue()).collection(subSelect.id.split('_')[1]).add({ name: value }).then(snapshot => {
                                    subSelect.tomselect.addItem(snapshot.path)
                                }).catch(error => {
                                    console.error("Error creating " + subSelect.id.split('_')[1] + ": ", error)
                                })
                            }
                        }
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
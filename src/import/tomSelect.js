const TomSelect = require('tom-select/dist/js/tom-select.base')
let selectMenuQueries = []

function loadSelectMenus() {
    selectMenuQueries.forEach(stopQuery => stopQuery())
    selectMenuQueries = []
    document.querySelectorAll('select').forEach(select => {
        const selectID = select.id.replace(/[0-9]/g, '')

        if (select.tomSelect == undefined) {
            select.tomSelect = new TomSelect(select, {
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
        }

        if (selectID != 'patientStatus' && selectID != 'country') {
            select.tomSelect.settings.create = value => {
                if (selectID == 'address') {
                    db.collection(selectID).add({ name: value }).then(snapshot => {
                        select.tomSelect.addItem(snapshot.path)
                    }).catch(error => {
                        console.error("Error creating " + selectID + ": ", error)
                    })
                }
            }
        }

        if (!selectID.includes('_')) {
            selectMenuQueries.push(
                db.collection(selectID).onSnapshot(
                    snapshot => {
                        const oldValue = select.tomSelect.getValue()

                        select.tomSelect.clear()
                        select.tomSelect.clearOptions()

                        snapshot.docs.forEach(item => {
                            select.tomSelect.addOption({
                                value: item.ref.path,
                                text: item.get('name')
                            })
                        })
                        if (select.tomSelect.isOpen) {
                            select.tomSelect.refreshOptions()
                        }

                        if (oldValue) {
                            select.tomSelect.addItem(oldValue)
                        }
                    },
                    error => {
                        console.error(error)
                    }
                )
            )
            select.tomSelect.on("item_add", value => {
                let subInputs = select.parentElement.parentElement.parentElement.querySelectorAll('input:not([role="combobox"])')
                subInputs.forEach(subInput => {
                    if (subInput.id.split('_')[0] == select.id) {
                        subInput.disabled = false
                        subInput.value = ""

                        selectMenuQueries.push(
                            db.doc(value).onSnapshot(
                                snapshot => {
                                    const inputValue = snapshot.get(subInput.id.split('_')[1])
                                    if (inputValue != undefined) {
                                        subInput.value = inputValue
                                    }
                                },
                                error => {
                                    console.error(error)
                                }
                            )
                        )
                    }
                })
                let subSelects = select.parentElement.parentElement.parentElement.querySelectorAll('select')
                subSelects.forEach(subSelect => {
                    if (subSelect != select && subSelect.id.split('_')[0] == select.id) {
                        subSelect.tomSelect.settings.create = value => {
                            if (subSelect.id.split('_')[1] == 'hotel') {
                                db.doc(select.tomSelect.getValue()).collection(subSelect.id.split('_')[1]).add({ name: value }).then(snapshot => {
                                    subSelect.tomSelect.addItem(snapshot.path)
                                }).catch(error => {
                                    console.error("Error creating " + subSelect.id.split('_')[1] + ": ", error)
                                })
                            }
                        }
                        subSelect.tomSelect.enable()

                        selectMenuQueries.push(
                            db.doc(value).collection(subSelect.id.split('_')[1]).onSnapshot(
                                snapshot => {
                                    const oldValue = subSelect.tomSelect.getValue()

                                    subSelect.tomSelect.clear()
                                    subSelect.tomSelect.clearOptions()

                                    snapshot.docs.forEach(item => {
                                        subSelect.tomSelect.addOption({
                                            value: item.ref.path,
                                            text: item.get('name')
                                        })
                                    })
                                    if (subSelect.tomSelect.isOpen) {
                                        subSelect.tomSelect.refreshOptions()
                                    }

                                    if (oldValue) {
                                        subSelect.tomSelect.addItem(oldValue)
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
            select.tomSelect.on("item_remove", () => {
                let subInputs = select.parentElement.parentElement.parentElement.querySelectorAll('input:not([role="combobox"])')
                subInputs.forEach(subInput => {
                    if (subInput.id.split('_')[0] == select.id) {
                        subInput.disabled = true
                        subInput.value = ""
                    }
                })
                let subSelects = select.parentElement.parentElement.parentElement.querySelectorAll('select')
                subSelects.forEach(subSelect => {
                    if (subSelect != select && subSelect.id.split('_')[0] == select.id) {
                        subSelect.tomSelect.disable()
                        subSelect.tomSelect.clear()
                    }
                })
            })
        }
    })
}
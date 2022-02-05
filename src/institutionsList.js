const institutionsOverlay = document.getElementById('institutionsOverlay')
const institutionsOverlayIcon = institutionsOverlay.getElementsByClassName('iconify')
const institutionsOverlayText = institutionsOverlay.querySelector('h3')

const institutionsTable = document.querySelector('table#institutions')
const institutionsList = institutionsTable.querySelector('tbody#institutionsList')
let currentOrder, currentOrderDirection

const tableHeaderContextMenu = document.getElementById('tableHeaderContextMenu')
const addOption = tableHeaderContextMenu.children[0].children['add']
addOption.onclick = () => {
    hiddenHeadersMenu.style.left = (tableHeaderContextMenu.offsetLeft) + 'px'
    hiddenHeadersMenu.style.top = (tableHeaderContextMenu.offsetTop) + 'px'
    hiddenHeadersMenu.materialComponent.setAbsolutePosition(tableHeaderContextMenu.offsetLeft, tableHeaderContextMenu.offsetTop)
    hiddenHeadersMenu.materialComponent.open = true
}
const hideOption = tableHeaderContextMenu.children[0].children['hide']
hideOption.onclick = () => {
    if (selectedHeader) {
        addHiddenHeaderOption(selectedHeader.id)

        tableHeadersList.removeChild(selectedHeader)
        refreshAndSaveColumns()

        selectedHeader = undefined
    }
}

const hiddenHeadersMenu = document.getElementById('hiddenHeadersMenu')
const hiddenHeadersList = hiddenHeadersMenu.children[0]
const hiddenHeaderOptionTemplate = hiddenHeadersMenu.children['hiddenHeaderOptionTemplate']

function addHiddenHeaderOption(headerID) {
    const option = hiddenHeaderOptionTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(option.children[0])
    option.id = headerID

    option.onclick = () => {
        if (selectedHeader) {
            option.remove()
            tableHeadersList.insertBefore(newHeader(headerID), selectedHeader)
        }
        refreshAndSaveColumns()

        hiddenHeadersMenu.materialComponent.open = false
    }

    const label = option.children[1]
    label.textContent = translate(columnsJSON[headerID])

    hiddenHeadersList.appendChild(option)
}

const columnsJSON = require('./institutionColumns.json')
const tableHeadersList = institutionsTable.querySelector('#tableHeadersList')
const headerTemplate = document.getElementById('headerTemplate')
let selectedHeader

function newHeader(headerID) {
    const th = headerTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(th)
    th.id = headerID

    th.onmousedown = mouseEvent => {
        if (mouseEvent.button == 2) {
            selectedHeader = th
            addOption.classList.toggle('mdc-list-item--disabled', hiddenHeadersList.childElementCount == 0)
            hideOption.classList.toggle('mdc-list-item--disabled', tableHeadersList.childElementCount < 2)
        }
    }
    th.onmouseup = mouseEvent => {
        if (mouseEvent.button == 2) {
            tableHeaderContextMenu.style.left = mouseEvent.clientX + 'px'
            tableHeaderContextMenu.style.top = mouseEvent.clientY + 'px'
            tableHeaderContextMenu.materialComponent.setAbsolutePosition(mouseEvent.clientX, mouseEvent.clientY)
            tableHeaderContextMenu.materialComponent.open = true
        }
    }
    th.onclick = () => headerClick(headerID)

    const label = th.querySelector('label')
    label.textContent = translate(columnsJSON[headerID])

    th.sortIcon = th.getElementsByClassName('iconify')

    return th
}

function loadColumns() {
    setOverlayState('loading')

    let columns = Object.keys(columnsJSON)
    if (localStorage.getItem('institutionColumns')) {
        columns = localStorage.getItem('institutionColumns').split(',')
    }
    columns.forEach(headerID => tableHeadersList.appendChild(newHeader(headerID)))
    for (const column in columnsJSON) {
        if (!columns.includes(column)) {
            addHiddenHeaderOption(column)
        }
    }
    if (tableHeadersList.children['name']) {
        headerClick('name')
        headerClick('name')
    }
    else {
        headerClick(tableHeadersList.firstChild.id)
    }
}

loadColumns()

let currentQuery = db.collection('insurance')
let searchQuery
let foundInstitutions
let currentInstitutionsSnap
let stopCurrentQuery = () => { }
let currentRefQueries = []
let selectedInstitution, selectedInstitutionRow

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadInstitutions()
        loadPermissions()
    }
    else {
        stopPermissionsQuery()
        stopCurrentQuery()
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentRefQueries = []
    }
})

let stopPermissionsQuery = () => { }

function toggleEditMode(editIsAllowed) {
    buttonCreate.disabled = !editIsAllowed
    tableRowContextMenu.deleteOption.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
    if (editIsAllowed) {
        tableRowContextMenu.editOption.icon[0].setAttribute('data-icon', 'ic:round-edit')
        tableRowContextMenu.editOption.label.textContent = translate('EDIT')
    }
    else {
        tableRowContextMenu.editOption.icon[0].setAttribute('data-icon', 'ic:round-visibility')
        tableRowContextMenu.editOption.label.textContent = translate('VIEW')
    }
}

function loadPermissions() {
    toggleEditMode(false)

    stopPermissionsQuery()
    stopPermissionsQuery = allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').doc('institutions').onSnapshot(
        snapshot => {
            toggleEditMode(snapshot.get('edit'))
        },
        error => {
            console.error('Error getting permissions: ' + error)
        }
    )
}
const selectInstitutionType = document.getElementById('institutionType').materialComponent
selectInstitutionType.listen('MDCSelect:change', () => {
    currentQuery = db.collection(selectInstitutionType.value)
    loadInstitutions()
    labelButtonCreate.textContent = translate('NEW#' + selectInstitutionType.value.toUpperCase())
})
const buttonCreate = document.querySelector('button#create')
buttonCreate.onclick = () => {
    ipcRenderer.send('new-window', 'institution', undefined, selectInstitutionType.value)
}
const labelButtonCreate = buttonCreate.querySelector('.mdc-button__label')

const inputSearch = document.querySelector('input#search')
const buttonClearSearch = document.querySelector('button#clearSearch')

inputSearch.oninput = refreshSearch

function refreshSearch() {
    setOverlayState('loading')
    searchQuery = String(inputSearch.value).trim().toLowerCase()

    if (searchQuery != '') {
        buttonClearSearch.disabled = false
        foundInstitutions = []
        let institutionPromises = []

        currentInstitutionsSnap.forEach(institution => {
            if (!foundInstitutions.includes(institution.id)) {
                let data = String(institution.id)
                let valuePromises = []
                Object.values(institution.data()).forEach(value => {
                    if (Array.isArray(value)) {
                        data += ',' + value.toString().toLowerCase()
                    }
                    else if (typeof value === 'object' && value !== null) {
                        valuePromises.push(value.get())
                    }
                    else {
                        data += ',' + value.toString().toLowerCase()
                    }
                })
                if (valuePromises.length > 0) {
                    institutionPromises.push(
                        Promise.all(valuePromises).then(values => {
                            values.forEach(snaphot => {
                                data += ',' + snaphot.get('name').toString().toLowerCase()
                            })
                            if (data.includes(searchQuery)) {
                                foundInstitutions.push(institution.id)
                            }
                        })
                    )
                }
                else {
                    if (data.includes(searchQuery)) {
                        foundInstitutions.push(institution.id)
                    }
                }
            }
        })

        if (institutionPromises.length > 0) {
            Promise.all(institutionPromises).then(institutions => {
                if (foundInstitutions.length > 0) {
                    listInstitutions(currentInstitutionsSnap)
                }
                else {
                    setOverlayState('empty')
                }
            })
        }
        else {
            if (foundInstitutions.length > 0) {
                listInstitutions(currentInstitutionsSnap)
            }
            else {
                setOverlayState('empty')
            }
        }
    }
    else {
        clearSearch()
    }
}

function clearSearch() {
    buttonClearSearch.disabled = true
    inputSearch.value = ''
    searchQuery = undefined
    foundInstitutions = undefined
    listInstitutions(currentInstitutionsSnap)
}

function headerClick(headerID) {
    const clickedHeader = tableHeadersList.querySelector('th#' + headerID)
    if (clickedHeader) {
        tableHeadersList.querySelectorAll('[data-icon="ic:round-keyboard-arrow-up"]').forEach(otherHeaderIcon => {
            if (otherHeaderIcon.parentElement != clickedHeader) {
                otherHeaderIcon.classList.remove('rot-180')
                otherHeaderIcon.setAttribute('data-icon', 'ic:round-unfold-more')
            }
        })

        if (clickedHeader.sortIcon[0].getAttribute('data-icon') == 'ic:round-unfold-more') {
            clickedHeader.sortIcon[0].setAttribute('data-icon', 'ic:round-keyboard-arrow-up')
        }

        if (clickedHeader.sortIcon[0].classList.contains('rot-180')) {
            orderInstitutions(headerID, 'asc')
        }
        else {
            orderInstitutions(headerID, 'desc')
        }

        clickedHeader.sortIcon[0].classList.toggle('rot-180')
    }
}

function loadInstitutions() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        snapshot => {
            currentInstitutionsSnap = snapshot
            refreshSearch()
        },
        error => {
            console.error('Error getting institutions: ' + error)
            setOverlayState('empty')
        }
    )
}

function listInstitutions(snap) {
    if (snap.docs.length > 0) {
        let noOneFound = true

        institutionsList.innerHTML = ''
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentRefQueries = []
        snap.forEach(institutionSnap => {
            if (foundInstitutions == undefined || foundInstitutions.includes(institutionSnap.id)) {
                setOverlayState('hide')
                noOneFound = false

                const tr = document.createElement('tr')
                tr.id = institutionSnap.id
                tr.ondblclick = () => {
                    if (getSelectedText() == '') {
                        ipcRenderer.send('new-window', 'institution', selectedInstitution.id, selectInstitutionType.value)
                    }
                }
                tr.onmousedown = mouseEvent => {
                    if (mouseEvent.button != 1) {
                        if (selectedInstitution?.id != institutionSnap.id) {
                            selectedInstitutionRow?.classList.remove('selected')
                            selectedInstitution = institutionSnap.ref
                            selectedInstitutionRow = tr
                            selectedInstitutionRow.classList.add('selected')
                        }
                    }
                }
                tr.onmouseup = mouseEvent => {
                    if (mouseEvent.button == 2) {
                        tableRowContextMenu.pricesOption.hidden = selectInstitutionType.value != 'insurance'

                        tableRowContextMenu.style.left = mouseEvent.clientX + 'px'
                        tableRowContextMenu.style.top = mouseEvent.clientY + 'px'
                        tableRowContextMenu.materialComponent.setAbsolutePosition(mouseEvent.clientX, mouseEvent.clientY)
                        tableRowContextMenu.materialComponent.open = true
                    }
                }
                institutionsList.appendChild(tr)

                for (const column of tableHeadersList.children) {
                    const td = document.createElement('td')
                    td.id = column.id
                    tr.appendChild(td)

                    if (td.id == '__name__') {
                        td.textContent = institutionSnap.id
                    }
                    else {
                        const value = institutionSnap.get(td.id)
                        if (value != undefined) {
                            if (typeof value === 'object' && value !== null) {
                                currentRefQueries.push(
                                    value.onSnapshot(
                                        snapshot => {
                                            td.textContent = snapshot.get('name')

                                            if (searchQuery != undefined && searchQuery != '') {
                                                td.classList.toggle('found', td.textContent.toLowerCase().includes(searchQuery))
                                            }

                                            orderInstitutions(currentOrder, currentOrderDirection)
                                        },
                                        error => {
                                            console.error(error)
                                        }
                                    )
                                )
                            }
                            else {
                                td.textContent = value
                            }
                        }
                    }

                    if (searchQuery != undefined && searchQuery != '') {
                        td.classList.toggle('found', td.textContent.toLowerCase().includes(searchQuery))
                    }
                }
            }
        })
        if (institutionsList.children.namedItem(selectedInstitution?.id)) {
            selectedInstitutionRow = institutionsList.children.namedItem(selectedInstitution.id)
            selectedInstitutionRow.classList.add('selected')
        }
        else {
            selectedInstitution = undefined
            selectedInstitutionRow = undefined
            dialogDeleteInstitution.materialComponent.close()
        }
        orderInstitutions(currentOrder, currentOrderDirection)

        if (noOneFound) {
            setOverlayState('empty')
        }
    }
    else {
        setOverlayState('empty')
    }
}

function orderInstitutions(orderBy, orderDirection) {
    if (tableHeadersList.children[orderBy]) {
        let switching, i, shouldSwitch
        do {
            switching = false
            for (i = 0; i < institutionsList.childElementCount - 1; i++) {
                shouldSwitch = false

                const a = institutionsList.children[i].children[orderBy]
                const b = institutionsList.children[i + 1].children[orderBy]

                if (orderDirection == 'asc') {
                    if ((a.realValue || a.textContent.toLowerCase()) > (b.realValue || b.textContent.toLowerCase())) {
                        shouldSwitch = true
                        break
                    }
                }
                else if (orderDirection == 'desc') {
                    if ((a.realValue || a.textContent.toLowerCase()) < (b.realValue || b.textContent.toLowerCase())) {
                        shouldSwitch = true
                        break
                    }
                }
            }
            if (shouldSwitch) {
                institutionsList.children[i].parentElement.insertBefore(institutionsList.children[i + 1], institutionsList.children[i])
                switching = true
            }
        }
        while (switching)

        currentOrder = orderBy
        currentOrderDirection = orderDirection
    }
    else {
        if (tableHeadersList.children['__name__']) {
            headerClick('__name__')
        }
        else {
            headerClick(tableHeadersList.firstChild.id)
        }
    }
}

function setOverlayState(state) {
    switch (state) {
        case 'loading':
            institutionsOverlay.classList.remove('hide')
            institutionsOverlayIcon[0].setAttribute('data-icon', 'eos-icons:loading')
            institutionsOverlayText.hidden = true
            break
        case 'empty':
            institutionsOverlay.classList.remove('hide')
            institutionsOverlayIcon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            institutionsOverlayText.hidden = false
            institutionsOverlayText.innerText = translate('INSTITUTIONS') + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            institutionsOverlay.classList.add('hide')
            break
    }
}

let write, utils

function exportToExcel() {
    if (!write) write = require('xlsx').write
    if (!utils) utils = require('xlsx').utils
    ipcRenderer.send('save-file', translate((selectInstitutionType.value + 's').toUpperCase()) + ' ' + new Date().toLocaleString('tr').replace(',', '').replaceAll(':', '-') + '.xlsx', write(utils.table_to_book(institutionsTable), { type: 'buffer' }))
}

let stopFilteredCasesQuery = () => { }

const tableRowContextMenu = document.getElementById('tableRowContextMenu')
tableRowContextMenu.editOption = tableRowContextMenu.children[0].children['edit']
tableRowContextMenu.editOption.icon = tableRowContextMenu.editOption.getElementsByClassName('iconify')
tableRowContextMenu.editOption.label = tableRowContextMenu.editOption.querySelector('.mdc-list-item__text')
tableRowContextMenu.editOption.onclick = () => ipcRenderer.send('new-window', 'institution', selectedInstitution.id, selectInstitutionType.value)
tableRowContextMenu.pricesOption = tableRowContextMenu.children[0].children['prices']
tableRowContextMenu.pricesOption.onclick = () => { ipcRenderer.send('new-window', 'priceList', selectedInstitution.id) }
tableRowContextMenu.deleteOption = tableRowContextMenu.children[0].children['delete']
tableRowContextMenu.deleteOption.onclick = () => {
    const filteredCases = allCases.where(selectInstitutionType.value, '==', db.doc(selectInstitutionType.value + '/' + selectedInstitution.id))

    stopFilteredCasesQuery()
    stopFilteredCasesQuery = filteredCases.onSnapshot(
        snapshot => {
            let prefix

            foundCasesLinks.innerHTML = ''

            if (snapshot.docs.length > 0) {
                iconDialogDeleteInstitution[0].setAttribute('data-icon', 'ic:round-warning')

                prefix = 'CANT_DELETE#THIS_'
                textDialogDeleteInstitution.classList.remove('mb-0')
                textDialogDeleteInstitution.classList.add('mb-2')

                for (let i = 0; i < snapshot.docs.length; i++) {
                    const _case = snapshot.docs[i]

                    const link = document.createElement('a')
                    link.href = '#'
                    link.innerText = '#' + _case.id
                    link.id = _case.id
                    link.onclick = () => ipcRenderer.send('new-window', 'case', link.id)
                    foundCasesLinks.appendChild(link)

                    if (i < snapshot.docs.length - 1) {
                        const comma = document.createElement('b')
                        comma.innerText = ' , '
                        foundCasesLinks.appendChild(comma)
                    }
                }
                dialogDeleteInstitution.materialComponent.buttons[1].disabled = true
            }
            else {
                iconDialogDeleteInstitution[0].setAttribute('data-icon', 'ic:round-help-outline')

                prefix = 'ASK_DELETE#THIS_'
                textDialogDeleteInstitution.classList.add('mb-0')
                textDialogDeleteInstitution.classList.remove('mb-2')

                dialogDeleteInstitution.materialComponent.buttons[1].disabled = false
            }
            textDialogDeleteInstitution.innerText = translate(prefix + selectInstitutionType.value.toUpperCase())

            dialogDeleteInstitution.materialComponent.open()
        },
        error => {
            console.error('Error getting filtered cases: ' + error)
        }
    )
}
const dialogDeleteInstitution = document.querySelector('#dialogDeleteInstitution')
const iconDialogDeleteInstitution = dialogDeleteInstitution.getElementsByClassName('iconify')
const textDialogDeleteInstitution = dialogDeleteInstitution.querySelector('p')
const foundCasesLinks = dialogDeleteInstitution.querySelector('span')

dialogDeleteInstitution.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        const institutionRef = selectedInstitution
        if (institutionRef.parent.path == 'insurance') {
            institutionRef.collection('prices').get().then(prices => {
                prices.forEach(price => {
                    price.ref.delete().then(() => {
                    }).catch(error => {
                        console.error('Error removing price: ', error)
                    })
                })
            }).catch(error => {
                console.error('Error getting prices: ', error)
            })
        }
        institutionRef.delete().then(() => {
        }).catch(error => {
            console.error('Error removing institution: ', error)
        })
    }
})

function refreshAndSaveColumns() {
    listInstitutions(currentInstitutionsSnap)
    let institutionColumns = []
    for (const header of tableHeadersList.children) {
        institutionColumns.push(header.id)
    }
    localStorage.setItem('institutionColumns', institutionColumns)
}
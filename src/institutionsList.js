const tableOverlay = document.querySelector('.overlay')
const tableOverlayIcon = tableOverlay.querySelector('.mdi')
const tableOverlayText = tableOverlay.querySelector('h3')

const institutionsTable = document.querySelector('table#institutions')
const institutionsList = institutionsTable.querySelector('tbody#institutionsList')
let currentOrder, currentOrderDirection

const columnsJSON = require('./institutionColumns.json')
const tableColumnsList = institutionsTable.querySelector('#tableColumnsList')
const headerTemplate = document.getElementById('headerTemplate')

function newHeader(headerID) {
    const th = headerTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(th)
    th.id = headerID

    th.onmousedown = mouseEvent => {
        if (mouseEvent.button == 0) {
            if (th.parentElement != tableColumnsList) {
                setTableOverlayState('drag')
            }
        }
    }
    th.onmouseup = () => {
        if (th.parentElement != tableColumnsList) {
            if (institutionsList.childElementCount > 0) {
                setTableOverlayState('hide')
            }
            else {
                setTableOverlayState('empty')
            }
        }
    }
    th.onclick = () => headerClick(headerID)

    const label = th.querySelector('label')
    label.textContent = translate(columnsJSON[headerID])

    th.sortIcon = th.querySelector('i')

    return th
}

const Sortable = require('sortablejs')

function loadColumns() {
    setTableOverlayState('loading')

    let columns = Object.keys(columnsJSON)
    if (localStorage.getItem('institutionColumns') != null) {
        columns = localStorage.getItem('institutionColumns').split(',')
    }
    columns.forEach(headerID => tableColumnsList.appendChild(newHeader(headerID)))

    if (tableColumnsList.children['name']) {
        headerClick('name')
        headerClick('name')
    }
    else {
        headerClick(tableColumnsList.firstChild.id)
    }

    Sortable.create(tableColumnsList, {
        animation: 150,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        onStart: () => setTableOverlayState('drag'),
        onEnd: () => {
            if (institutionsList.childElementCount > 0) {
                setTableOverlayState('hide')
            }
            else {
                setTableOverlayState('empty')
            }
            listInstitutions(currentInstitutionsSnap)
            let institutionColumns = []
            for (let column of tableColumnsList.children) {
                institutionColumns.push(column.id)
            }
            localStorage.setItem('institutionColumns', institutionColumns)
        }
    })
}

loadColumns()

let currentQuery = db.collection('insurance')
let searchQuery
let foundInstitutions
let currentInstitutionsSnap
let stopCurrentQuery = () => { }
let currentRefQueries = []
let selectedInstitution, selectedInstitutionRow, selectedInstitutionID

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadInstitutions()
        loadPermissions()
    }
    else {
        stopPermissionsQuery()
        stopCurrentQuery()
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
    }
})

let stopPermissionsQuery = () => { }

function toggleEditMode(editIsAllowed) {
    buttonCreate.disabled = !editIsAllowed
    editOption.icon.classList.toggle('mdi-eye', !editIsAllowed)
    editOption.icon.classList.toggle('mdi-pencil', editIsAllowed)
    deleteOption.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
    if (editIsAllowed) {
        editOption.label.textContent = translate('EDIT')
    }
    else {
        editOption.label.textContent = translate('VIEW')
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
    setTableOverlayState('loading')
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
                    if (typeof value === 'object' && value !== null) {
                        valuePromises.push(value.get())
                    }
                    else {
                        data += ' -- ' + value.toString().toLowerCase()
                    }
                })
                if (valuePromises.length > 0) {
                    institutionPromises.push(
                        Promise.all(valuePromises).then(values => {
                            values.forEach(snaphot => {
                                data += ' -- ' + snaphot.get('name').toString().toLowerCase()
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
                    setTableOverlayState('empty')
                }
            })
        }
        else {
            if (foundInstitutions.length > 0) {
                listInstitutions(currentInstitutionsSnap)
            }
            else {
                setTableOverlayState('empty')
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
    const clickedHeader = tableColumnsList.querySelector('th#' + headerID)
    if (clickedHeader) {
        document.querySelectorAll('.mdi-chevron-up').forEach(otherHeaderIcon => {
            if (otherHeaderIcon.parentElement != clickedHeader) {
                otherHeaderIcon.classList.remove('mdi-chevron-up')
                otherHeaderIcon.classList.remove('mdi-rotate-180')
                otherHeaderIcon.classList.add('mdi-unfold-more-horizontal')
            }
        })

        if (clickedHeader.sortIcon.classList.contains('mdi-unfold-more-horizontal')) {
            clickedHeader.sortIcon.classList.remove('mdi-unfold-more-horizontal')
            clickedHeader.sortIcon.classList.add('mdi-chevron-up')
        }

        if (clickedHeader.sortIcon.classList.contains('mdi-rotate-180')) {
            orderInstitutions(headerID, 'asc')
        }
        else {
            orderInstitutions(headerID, 'desc')
        }

        clickedHeader.sortIcon.classList.toggle('mdi-rotate-180')
    }
}

function loadInstitutions() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        snapshot => {
            console.log(snapshot)
            currentInstitutionsSnap = snapshot
            listInstitutions(snapshot)
            refreshSearch()
        },
        error => {
            console.error('Error getting institutions: ' + error)
            setTableOverlayState('empty')
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
                setTableOverlayState('hide')
                noOneFound = false

                const tr = document.createElement('tr')
                tr.id = institutionSnap.id
                tr.ondblclick = () => {
                    if (getSelectedText() == '') {
                        ipcRenderer.send('new-window', 'institution', selectedInstitutionID, selectInstitutionType.value)
                    }
                }
                tr.onmousedown = mouseEvent => {
                    if (mouseEvent.button != 1) {
                        if (mouseEvent.button == 2) {
                            contextMenu.materialComponent.open = false
                        }
                        if (selectedInstitutionRow) {
                            selectedInstitutionRow.classList.remove('selected')
                        }
                        selectedInstitution = currentQuery.doc(institutionSnap.id)
                        selectedInstitutionID = institutionSnap.id
                        selectedInstitutionRow = tr
                        selectedInstitutionRow.classList.add('selected')
                    }
                }
                tr.onmouseup = mouseEvent => {
                    const hasSelection = getSelectedText() != ''

                    if (hasSelection || mouseEvent.button == 2) {
                        copyOption.hidden = !hasSelection
                        contextMenu.querySelectorAll('li.mdc-list-item:not(#copy)').forEach(option => {
                            option.hidden = hasSelection
                        })
                        contextMenu.style.left = (mouseEvent.clientX + 2) + 'px'
                        contextMenu.style.top = (mouseEvent.clientY + 2) + 'px'
                        contextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX + 2), (mouseEvent.clientY + 2))
                        contextMenu.materialComponent.open = true
                    }
                }
                if (tr.id == selectedInstitutionID) {
                    selectedInstitution = currentQuery.doc(selectedInstitutionID)
                    selectedInstitutionRow = tr
                    selectedInstitutionRow.classList.add('selected')
                }
                institutionsList.appendChild(tr)

                for (const column of tableColumnsList.children) {
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
        orderInstitutions(currentOrder, currentOrderDirection)

        if (noOneFound) {
            setTableOverlayState('empty')
        }
    }
    else {
        setTableOverlayState('empty')
    }
}

function orderInstitutions(orderBy, orderDirection) {
    let switching, i, shouldSwitch
    do {
        switching = false
        for (i = 0; i < institutionsList.childElementCount - 1; i++) {
            shouldSwitch = false

            const a = institutionsList.children[i].children[orderBy]
            const b = institutionsList.children[i + 1].children[orderBy]

            if (orderDirection == 'asc') {
                if (a.innerHTML.toLowerCase() > b.innerHTML.toLowerCase()) {
                    shouldSwitch = true
                    break
                }
            }
            else if (orderDirection == 'desc') {
                if (a.innerHTML.toLowerCase() < b.innerHTML.toLowerCase()) {
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

function setTableOverlayState(state) {
    switch (state) {
        case 'loading':
            tableOverlay.classList.remove('hide')
            tableOverlay.classList.remove('show-headers')
            tableOverlayIcon.classList.add('mdi-loading', 'mdi-spin')
            tableOverlayIcon.classList.remove('mdi-emoticon-sad-outline', 'mdi-archive-arrow-up-outline')
            tableOverlayText.hidden = true
            break
        case 'empty':
            tableOverlay.classList.remove('hide')
            tableOverlay.classList.remove('show-headers')
            tableOverlayIcon.classList.add('mdi-emoticon-sad-outline')
            tableOverlayIcon.classList.remove('mdi-loading', 'mdi-spin', 'mdi-archive-arrow-up-outline')
            tableOverlayText.hidden = false
            tableOverlayText.innerText = translate('INSTITUTIONS') + ' ' + translate('NOT_FOUND')
            break
        case 'drag':
            tableOverlay.classList.remove('hide')
            tableOverlay.classList.add('show-headers')
            tableOverlayIcon.classList.add('mdi-archive-arrow-up-outline')
            tableOverlayIcon.classList.remove('mdi-loading', 'mdi-spin', 'mdi-emoticon-sad-outline')
            tableOverlayText.hidden = false
            tableOverlayText.innerText = translate('DRAG_AND_DROP')
            break
        case 'hide':
            tableOverlay.classList.add('hide')
            break
        default:
            break
    }
}

const { writeFile, utils } = require('xlsx')

function exportToExcel() {
    ipcRenderer.send('dialog-save', translate((selectInstitutionType.value + 's').toUpperCase()) + ' ' + new Date().toLocaleString().replace(',', '').replaceAll(':', '-') + '.xlsx')
}

ipcRenderer.on('file-save', (event, filePath) => {
    writeFile(utils.table_to_book(institutionsTable), filePath)
})

let stopFilteredCasesQuery = () => { }

const contextMenu = document.getElementById('contextMenu')
const copyOption = contextMenu.children[0].children['copy']
copyOption.onclick = copySelectionToClipboard
const editOption = contextMenu.children[0].children['edit']
editOption.icon = editOption.querySelector('.mdi')
editOption.label = editOption.querySelector('.mdc-list-item__text')
editOption.onclick = () => ipcRenderer.send('new-window', 'institution', selectedInstitutionID, selectInstitutionType.value)
const deleteOption = contextMenu.children[0].children['delete']
deleteOption.onclick = () => {
    const filteredCases = allCases.where(selectInstitutionType.value, '==', db.doc(selectInstitutionType.value + '/' + selectedInstitution.id))

    stopFilteredCasesQuery()
    stopFilteredCasesQuery = filteredCases.onSnapshot(
        snapshot => {
            let prefix

            foundCasesLinks.innerHTML = ''

            if (snapshot.docs.length > 0) {
                iconDialogDeleteInstitution.classList.remove('mdi-help-circle-outline')
                iconDialogDeleteInstitution.classList.add('mdi-alert')

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
                iconDialogDeleteInstitution.classList.add('mdi-help-circle-outline')
                iconDialogDeleteInstitution.classList.remove('mdi-alert')

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
const iconDialogDeleteInstitution = dialogDeleteInstitution.querySelector('.mdi')
const textDialogDeleteInstitution = dialogDeleteInstitution.querySelector('p')
const foundCasesLinks = dialogDeleteInstitution.querySelector('span')

dialogDeleteInstitution.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        selectedInstitution.delete().then(() => {
            selectedInstitution = undefined
            selectedInstitutionID = undefined
        }).catch(error => {
            console.error('Error removing institution: ', error)
        })
    }
})

function getSelectedText() {
    if (getSelection().toString().replaceAll('\n', '').replaceAll('\t', '').trim() != '') {
        return getSelection().toString()
    }
    else {
        return ''
    }
}

function copySelectionToClipboard() {
    const selectedText = getSelectedText()
    if (selectedText != '') {
        navigator.clipboard.writeText(selectedText)
        alert('"' + selectedText + '"' + translate("COPIED"))
    }
}
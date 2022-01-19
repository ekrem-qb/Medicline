const proformaOverlay = document.getElementById('proformaOverlay')
const proformaOverlayIcon = proformaOverlay.getElementsByClassName('iconify')
const proformaOverlayText = proformaOverlay.querySelector('h3')

const proformaTabPage = proformaOverlay.parentElement
proformaTabPage.stopLoadingContent = () => {
    stopProformaCurrentQuery()
    stopProformaCurrentQuery = () => { }
    proformaCurrentQuery = undefined
    currentProformaRefQueries.forEach(stopRefQuery => stopRefQuery())
    currentProformaRefQueries = []
    stopActivityQuery()
}
proformaTabPage.loadContent = () => {
    proformaTabPage.stopLoadingContent()
    loadProforma()
    listActivities()
}

const proformaTable = proformaTabPage.querySelector('table#proforma')
proformaTable.parentElement.onscroll = () => inlineEdit.moveToAnchor()
const proformaList = proformaTable.querySelector('tbody#proformaList')
let proformaCurrentOrder, proformaCurrentOrderDirection

const proformaColumnsJSON = require('./proformaColumns.json')
const proformaHeadersList = proformaTable.querySelector('#proformaHeadersList')
const proformaHeaderTemplate = document.getElementById('proformaHeaderTemplate')

function newProformaHeader(headerID) {
    const th = proformaHeaderTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(th)
    th.id = headerID

    th.onmousedown = mouseEvent => {
        if (mouseEvent.button == 0) {
            if (th.parentElement != proformaHeadersList) {
            }
        }
    }
    th.onmouseup = () => {
        if (th.parentElement != proformaHeadersList) {
            if (proformaList.childElementCount > 0) {
                setProformaOverlayState('hide')
            }
            else {
                setProformaOverlayState('empty')
            }
        }
    }
    th.onclick = () => proformaHeaderClick(headerID)

    const label = th.querySelector('label')
    label.textContent = translate(proformaColumnsJSON[headerID])

    th.sortIcon = th.getElementsByClassName('iconify')

    return th
}

function loadProformaColumns() {
    setProformaOverlayState('loading')

    let columns = Object.keys(proformaColumnsJSON)
    if (localStorage.getItem('proformaColumns')) {
        columns = localStorage.getItem('proformaColumns').split(',')
    }
    columns.forEach(headerID => proformaHeadersList.appendChild(newProformaHeader(headerID)))

    if (proformaHeadersList.children['name']) {
        proformaHeaderClick('name')
        proformaHeaderClick('name')
    }
    else {
        proformaHeaderClick(proformaHeadersList.firstChild.id)
    }
}

loadProformaColumns()

let proformaCurrentQuery
let proformaCurrentProformaSnap
let stopProformaCurrentQuery = () => { }
let currentProformaRefQueries = []
let selectedProforma, selectedProformaRow, selectedProformaID

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        if (proformaTabPage.classList.contains('show')) {
            proformaTabPage.loadContent()
        }
    }
    else {
        proformaTabPage.stopLoadingContent()
    }
})

function proformaHeaderClick(headerID) {
    const clickedHeader = proformaHeadersList.querySelector('th#' + headerID)
    if (clickedHeader) {
        proformaHeadersList.querySelectorAll('[data-icon="ic:round-keyboard-arrow-up"]').forEach(otherHeaderIcon => {
            if (otherHeaderIcon.parentElement != clickedHeader) {
                otherHeaderIcon.classList.remove('rot-180')
                otherHeaderIcon.setAttribute('data-icon', 'ic:round-unfold-more')
            }
        })

        if (clickedHeader.sortIcon[0].getAttribute('data-icon') == 'ic:round-unfold-more') {
            clickedHeader.sortIcon[0].setAttribute('data-icon', 'ic:round-keyboard-arrow-up')
        }

        if (clickedHeader.sortIcon[0].classList.contains('rot-180')) {
            orderProforma(headerID, 'asc')
        }
        else {
            orderProforma(headerID, 'desc')
        }

        clickedHeader.sortIcon[0].classList.toggle('rot-180')
    }
}

function loadProforma() {
    if (selectedCase) {
        proformaCurrentQuery = selectedCase.collection('proforma')
        stopProformaCurrentQuery = proformaCurrentQuery.onSnapshot(
            snapshot => {
                console.log(snapshot)
                proformaCurrentProformaSnap = snapshot
                listProforma(snapshot)
            },
            error => {
                console.error('Error getting proforma: ' + error)
                setProformaOverlayState('empty')
            }
        )
    }
    else {
        stopProformaCurrentQuery()
        stopProformaCurrentQuery = () => { }
        proformaCurrentQuery = undefined
        setProformaOverlayState('empty')
    }
}

function listProforma(snap) {
    if (snap.docs.length > 0) {
        proformaList.innerHTML = ''
        currentProformaRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentProformaRefQueries = []
        snap.forEach(Proformanap => {
            setProformaOverlayState('hide')

            const tr = document.createElement('tr')
            tr.id = Proformanap.id
            tr.onmousedown = mouseEvent => {
                if (mouseEvent.button != 1) {
                    if (selectedProformaID != Proformanap.id) {
                        if (selectedProformaRow) {
                            selectedProformaRow.classList.remove('selected')
                        }
                        selectedProforma = proformaCurrentQuery.doc(Proformanap.id)
                        selectedProformaID = Proformanap.id
                        selectedProformaRow = tr
                        selectedProformaRow.classList.add('selected')
                    }
                }
            }
            tr.onmouseup = mouseEvent => {
                if (getSelectedText() != '') {
                    textContextMenu.style.left = (mouseEvent.clientX) + 'px'
                    textContextMenu.style.top = (mouseEvent.clientY) + 'px'
                    textContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
                    textContextMenu.materialComponent.open = true
                }
                else if (mouseEvent.button == 2) {
                    proformaContextMenu.style.left = (mouseEvent.clientX) + 'px'
                    proformaContextMenu.style.top = (mouseEvent.clientY) + 'px'
                    proformaContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
                    proformaContextMenu.materialComponent.open = true
                }
            }
            if (tr.id == selectedProformaID) {
                selectedProforma = proformaCurrentQuery.doc(selectedProformaID)
                selectedProformaRow = tr
                selectedProformaRow.classList.add('selected')
            }
            proformaList.appendChild(tr)

            for (const column of proformaHeadersList.children) {
                const td = document.createElement('td')
                td.id = column.id
                tr.appendChild(td)

                if (td.id == '__name__') {
                    td.textContent = Proformanap.id
                }
                else {
                    const value = Proformanap.get(td.id)
                    if (value != undefined) {
                        if (td.id.includes('Date')) {
                            td.textContent = new Date(value.seconds * 1000).toLocaleString('tr').replace(',', '')
                            td.realValue = value.seconds
                        }
                        else if (typeof value === 'object' && value !== null) {
                            currentProformaRefQueries.push(
                                value.onSnapshot(
                                    snapshot => {
                                        td.textContent = snapshot.get('name')
                                        orderProforma(proformaCurrentOrder, proformaCurrentOrderDirection)
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
                if (td.id == 'name') {
                    td.onclick = () => {
                        const proformaName = td.textContent
                        inlineEdit.show(td, Proformanap.ref.path, proformaName.slice(0, proformaName.lastIndexOf('.')))
                        inlineEditInput.proformaType = proformaName.slice(proformaName.lastIndexOf('.')).toLowerCase()
                    }
                }
            }
        })
        orderProforma(proformaCurrentOrder, proformaCurrentOrderDirection)
    }
    else {
        setProformaOverlayState('empty')
    }
}

function orderProforma(orderBy, orderDirection) {
    let switching, i, shouldSwitch
    do {
        switching = false
        for (i = 0; i < proformaList.childElementCount - 1; i++) {
            shouldSwitch = false

            let a = proformaList.children[i].children[orderBy]
            let b = proformaList.children[i + 1].children[orderBy]

            if (a.realValue != undefined) {
                a = a.realValue
                b = b.realValue
            }
            else {
                a = a.textContent.toLowerCase()
                b = b.textContent.toLowerCase()
            }

            if (orderDirection == 'asc') {
                if (a > b) {
                    shouldSwitch = true
                    break
                }
            }
            else if (orderDirection == 'desc') {
                if (a < b) {
                    shouldSwitch = true
                    break
                }
            }
        }
        if (shouldSwitch) {
            proformaList.children[i].parentElement.insertBefore(proformaList.children[i + 1], proformaList.children[i])
            switching = true
        }
    }
    while (switching)

    proformaCurrentOrder = orderBy
    proformaCurrentOrderDirection = orderDirection
}

function setProformaOverlayState(state) {
    switch (state) {
        case 'loading':
            proformaOverlay.classList.remove('hide')
            proformaOverlay.classList.remove('show-headers')
            proformaOverlayIcon[0].setAttribute('data-icon', 'eos-icons:loading')
            proformaOverlayText.hidden = true
            break
        case 'empty':
            proformaOverlay.classList.remove('hide')
            proformaOverlay.classList.remove('show-headers')
            proformaOverlayIcon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            proformaOverlayText.hidden = false
            proformaOverlayText.innerText = translate('ACTIVITIES') + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            proformaOverlay.classList.add('hide')
            break
    }
}

function refreshAndSaveProformaColumns() {
    listProforma(proformaCurrentProformaSnap)
    let proformaColumns = []
    for (const header of proformaHeadersList.children) {
        proformaColumns.push(header.id)
    }
    localStorage.setItem('proformaColumns', proformaColumns)
}

const dialogAddActivity = proformaTabPage.querySelector('#dialogAddActivity')

const buttonNewActivity = proformaTabPage.querySelector('button#newActivity')
buttonNewActivity.onclick = () => {
    if (proformaCurrentQuery) {
        dialogAddActivity.materialComponent.open()
        listActivities()
    }
}

inputSearchActivities = dialogAddActivity.querySelector('input#searchActivities')
const buttonClearSearchActivities = inputSearchActivities.parentElement.querySelector('button#clearSearchActivities')

function refreshSearchActivities() {
    const searchActivitiesQuery = String(inputSearchActivities.value).trim().toLowerCase()

    if (searchActivitiesQuery != '') {
        buttonClearSearchActivities.disabled = false

        for (const activity of activitiesList.children) {
            activity.classList.toggle('hide', !(activity.label.textContent.toLowerCase() + activity.price.textContent).includes(searchActivitiesQuery))
        }

        refreshListOverlayState()
    }
    else {
        clearSearchActivities()
    }
}

inputSearchActivities.oninput = refreshSearchActivities

function clearSearchActivities() {
    activitiesList.querySelectorAll('li.hide').forEach(activity => {
        activity.classList.remove('hide')
    })
    refreshListOverlayState()
    buttonClearSearchActivities.disabled = true
    inputSearchActivities.value = ''
}

const activitiesList = document.getElementById('activitiesList')
activitiesList.overlay = document.getElementById('activitiesListOverlay')
activitiesList.overlay.icon = activitiesList.overlay.getElementsByClassName('iconify')
activitiesList.overlay.text = activitiesList.overlay.querySelector('h3')
const listItemTemplate = document.getElementById('listItemTemplate')
let stopActivityQuery = () => { }

function listActivities() {
    activitiesList.innerHTML = ''
    stopActivityQuery()
    const selectedCaseSnap = currentCasesSnap.docs.find(a => a.id == selectedCaseID)
    if (selectedCaseSnap) {
        const selectedCaseInsurance = selectedCaseSnap.get('insurance')
        if (selectedCaseInsurance) {
            stopActivityQuery = selectedCaseInsurance.collection('prices').orderBy('name', 'asc').onSnapshot(
                snapshot => {
                    console.log(snapshot.docChanges())
                    snapshot.docChanges().forEach(
                        change => {
                            switch (change.type) {
                                case 'added':
                                    const listItem = listItemTemplate.content.firstElementChild.cloneNode(true)
                                    listItem.id = change.doc.ref.path

                                    const label = listItem.querySelector('b')
                                    const price = listItem.querySelector('small')
                                    listItem.label = label
                                    listItem.price = price

                                    label.textContent = change.doc.get('name')
                                    price.textContent = change.doc.get('price') + ' ' + change.doc.get('currency')

                                    const buttonRemove = listItem.children['remove']
                                    buttonRemove.onclick = () => {
                                        quantity.textContent = Number.parseInt(quantity.textContent) - 1

                                        buttonRemove.disabled = Number.parseInt(quantity.textContent) <= 0
                                    }
                                    buttonRemove.materialRipple = new MDCRipple(buttonRemove)
                                    buttonRemove.materialRipple.unbounded = true

                                    const quantity = listItem.children['quantity']

                                    const buttonAdd = listItem.children['add']
                                    buttonAdd.onclick = () => {
                                        quantity.textContent = Number.parseInt(quantity.textContent) + 1

                                        buttonRemove.disabled = Number.parseInt(quantity.textContent) <= 0
                                    }
                                    buttonAdd.materialRipple = new MDCRipple(buttonAdd)
                                    buttonAdd.materialRipple.unbounded = true

                                    if (change.newIndex == activitiesList.childElementCount) {
                                        activitiesList.appendChild(listItem)
                                    } else {
                                        activitiesList.insertBefore(listItem, activitiesList.children[change.newIndex])
                                    }
                                    break
                                case 'modified':
                                    activitiesList.children[change.doc.ref.path].label.textContent = change.doc.get('name')
                                    activitiesList.children[change.doc.ref.path].price.textContent = change.doc.get('price') + ' ' + change.doc.get('currency')

                                    if (change.newIndex == activitiesList.childElementCount) {
                                        activitiesList.appendChild(activitiesList.children[change.doc.ref.path])
                                    } else {
                                        const removedChild = activitiesList.removeChild(activitiesList.children[change.doc.ref.path])
                                        activitiesList.insertBefore(removedChild, activitiesList.children[change.newIndex])
                                    }
                                    break
                                case 'removed':
                                    activitiesList.children[change.doc.ref.path].remove()
                                    break
                            }
                        }
                    )
                    refreshSearchActivities()
                },
                error => {
                    console.error('Error getting billable activities: ' + error)
                }
            )
        }
    }

    refreshListOverlayState()
}

function setListOverlayState(overlay, state) {
    switch (state) {
        case 'loading':
            overlay.classList.remove('hide')
            overlay.icon[0].setAttribute('data-icon', 'eos-icons:loading')
            overlay.text.hidden = true
            break
        case 'empty':
            overlay.classList.remove('hide')
            overlay.icon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            overlay.text.hidden = false
            overlay.text.innerText = translate(overlay.id.replace('ListOverlay', '').toUpperCase()) + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            overlay.classList.add('hide')
            break
    }
}

function refreshListOverlayState() {
    if (activitiesList.querySelectorAll('li:not(.hide)').length > 0) {
        setListOverlayState(activitiesList.overlay, 'hide')
    } else {
        setListOverlayState(activitiesList.overlay, 'empty')
    }
}
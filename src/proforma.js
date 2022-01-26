const proformaTabPage = document.querySelector('.tab-page#proforma')
proformaTabPage.stopLoadingContent = () => {
    currentInsurance = undefined
    stopProformaCurrentQuery()
    stopProformaCurrentQuery = () => { }
    proformaCurrentQuery = undefined
    currentProformaRefQueries.forEach(stopRefQuery => stopRefQuery())
    currentProformaRefQueries = []
    stopActivityQuery()
    stopActivityQuery = () => { }
    stopSelectedCaseQuery()
    stopSelectedCaseQuery = () => { }
    stopCurrentInsuranceQuery()
    stopCurrentInsuranceQuery = () => { }
}
proformaTabPage.loadContent = () => {
    proformaTabPage.stopLoadingContent()
    loadInsurance()
}

let stopSelectedCaseQuery = () => { }
let stopCurrentInsuranceQuery = () => { }
let currentInsurance

function loadInsurance() {
    if (selectedCaseID) {
        stopSelectedCaseQuery()
        stopSelectedCaseQuery = allCases.doc(selectedCaseID).onSnapshot(
            snapshot => {
                if (snapshot.get('insurance') != currentInsurance) {
                    stopCurrentInsuranceQuery()
                    stopCurrentInsuranceQuery = snapshot.get('insurance').onSnapshot(
                        snapshot => {
                            if (currentInsurance) {
                                if (currentInsurance.id != snapshot.id) {
                                    currentInsurance = snapshot
                                    loadProforma()
                                    listActivities()
                                }
                                else {
                                    calculateDialogActivitiesTotalPrice()
                                }
                            }
                            else {
                                currentInsurance = snapshot
                                loadProforma()
                                listActivities()
                            }
                        },
                        error => {
                            console.error('Error getting insurance: ' + error)
                        }
                    )
                }
            },
            error => {
                console.error('Error getting case: ' + error)
            }
        )
    }
    else {
        setListOverlayState('empty')
        setProformaOverlayState('empty')
    }
}

const proformaOverlay = proformaTabPage.querySelector('.overlay')
const proformaOverlayIcon = proformaOverlay.getElementsByClassName('iconify')
const proformaOverlayText = proformaOverlay.querySelector('h3')

const proformaTable = proformaTabPage.querySelector('table')
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
let proformaCurrentSnap
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
                proformaCurrentSnap = snapshot
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
        setProformaOverlayState('hide')
        currentProformaRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentProformaRefQueries = []
        snap.forEach(proformaSnap => {
            const tr = document.createElement('tr')
            tr.id = proformaSnap.id
            tr.onmousedown = mouseEvent => {
                if (mouseEvent.button != 1) {
                    if (selectedProformaID != proformaSnap.id) {
                        if (selectedProformaRow) {
                            selectedProformaRow.classList.remove('selected')
                        }
                        selectedProforma = proformaCurrentQuery.doc(proformaSnap.id)
                        selectedProformaID = proformaSnap.id
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

                switch (td.id) {
                    case '__name__':
                        td.textContent = proformaSnap.id
                        break
                    case 'price':
                        td.textContent = proformaSnap.get(td.id) + ' ' + proformaSnap.get('currency')
                        break
                    case 'totalPrice':
                        td.textContent = (proformaSnap.get('price') * proformaSnap.get('quantity')) + ' ' + proformaSnap.get('currency')
                        break
                    default:
                        const value = proformaSnap.get(td.id)
                        if (value != undefined) {
                            if (td.id.toLowerCase().includes('date')) {
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
                        break
                }
                if (td.id == 'name') {
                    td.onclick = () => {
                        const proformaName = td.textContent
                        inlineEdit.show(td, proformaSnap.ref.path, proformaName.slice(0, proformaName.lastIndexOf('.')))
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
    listProforma(proformaCurrentSnap)
    let proformaColumns = []
    for (const header of proformaHeadersList.children) {
        proformaColumns.push(header.id)
    }
    localStorage.setItem('proformaColumns', proformaColumns)
}

const buttonNewActivity = proformaTabPage.querySelector('button#newActivity')
buttonNewActivity.onclick = () => {
    if (proformaCurrentQuery) {
        dialogAddActivity.materialComponent.open()
    }
}
const dialogAddActivity = proformaTabPage.querySelector('#dialogAddActivity')

const inputSearchActivities = dialogAddActivity.querySelector('input#searchActivities')
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
    if (currentInsurance) {
        stopActivityQuery = currentInsurance.ref.collection('prices').orderBy('name', 'asc').onSnapshot(
            snapshot => {
                snapshot.docChanges().forEach(
                    change => {
                        switch (change.type) {
                            case 'added':
                                const listItem = listItemTemplate.content.firstElementChild.cloneNode(true)
                                listItem.id = change.doc.ref.path
                                listItem.onclick = event => {
                                    if (event.target.parentElement != buttonRemove && event.target.parentElement != buttonAdd
                                        && event.target.parentElement.parentElement != buttonRemove && event.target.parentElement.parentElement != buttonAdd) {
                                        if (Number.parseInt(quantity.textContent) > 0) {
                                            quantity.textContent = 0
                                        }
                                        else {
                                            quantity.textContent = 1
                                        }
                                        calculateDialogActivitiesTotalPrice(listItem)
                                    }
                                }
                                new MDCRipple(listItem)

                                const label = listItem.querySelector('b')
                                listItem.label = label
                                const price = listItem.querySelector('small')
                                listItem.price = price

                                label.textContent = change.doc.get('name')
                                price.textContent = change.doc.get('price') + ' ' + change.doc.get('currency')

                                const buttonRemove = listItem.children['remove']
                                listItem.buttonRemove = buttonRemove
                                buttonRemove.onclick = () => {
                                    quantity.textContent = Number.parseInt(quantity.textContent) - 1

                                    calculateDialogActivitiesTotalPrice(listItem)
                                }
                                buttonRemove.materialRipple = new MDCRipple(buttonRemove)
                                buttonRemove.materialRipple.unbounded = true

                                const quantity = listItem.children['quantity']
                                listItem.quantity = quantity

                                const buttonAdd = listItem.children['add']
                                listItem.buttonAdd = buttonAdd
                                buttonAdd.onclick = () => {
                                    quantity.textContent = Number.parseInt(quantity.textContent) + 1

                                    calculateDialogActivitiesTotalPrice(listItem)
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
    refreshListOverlayState()
    calculateDialogActivitiesTotalPrice()
}

function calculateDialogActivitiesTotalPrice(clickedActivity) {
    if (clickedActivity) {
        clickedActivity.classList.toggle('active', Number.parseInt(clickedActivity.quantity.textContent) > 0)
        clickedActivity.buttonRemove.classList.toggle('hide', Number.parseInt(clickedActivity.quantity.textContent) <= 0)
        clickedActivity.quantity.classList.toggle('hide', Number.parseInt(clickedActivity.quantity.textContent) <= 0)
    }
    let totalPrice = 0
    activitiesList.querySelectorAll('li.active').forEach(activity => {
        const priceNcurrency = activity.price.textContent.split(' ')
        let price = parseFloat(priceNcurrency[0])
        if (currentInsurance) {
            const currency = currentInsurance.get(priceNcurrency[1])
            if (currency) {
                price /= parseFloat(currency)
            }
        }
        totalPrice += price * parseInt(activity.quantity.textContent)
    })
    buttonAddActivities.label.textContent = translate('ADD')
    if (totalPrice > 0) {
        buttonAddActivities.label.textContent += ' (' + (Math.round(totalPrice * 100) / 100) + '$)'
    }
    buttonAddActivities.disabled = totalPrice <= 0
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

const buttonCancelActivities = dialogAddActivity.querySelector('button#cancelActivities')

const buttonAddActivities = dialogAddActivity.querySelector('button#addActivities')
buttonAddActivities.label = buttonAddActivities.querySelector('.mdc-button__label')
buttonAddActivities.icon = buttonAddActivities.getElementsByClassName('iconify')
buttonAddActivities.onclick = () => {
    if (selectedCase) {
        if (activitiesList.querySelector('li.active')) {
            dialogAddActivity.scrimClickAction = ''
            buttonCancelActivities.disabled = true
            buttonAddActivities.icon[0].setAttribute('data-icon', 'eos-icons:loading')
            buttonAddActivities.disabled = true
            const promises = []
            for (const activity of activitiesList.children) {
                activity.classList.add('disabled')
                activity.buttonRemove.disabled = true
                activity.buttonAdd.disabled = true
                if (activity.classList.contains('active')) {
                    const priceNcurrency = activity.price.textContent.split(' ')
                    promises.push(
                        selectedCase.collection('proforma').add({
                            name: activity.label.textContent.trim(),
                            price: parseFloat(priceNcurrency[0]),
                            currency: priceNcurrency[1],
                            quantity: parseInt(activity.quantity.textContent),
                            date: firebase.firestore.Timestamp.now()
                        }).then(() => {
                            activity.classList.add('bg-success')
                            activity.classList.add('border-success')
                        }).catch(error => {
                            console.error('Error adding activity: ', error)
                            activity.classList.add('bg-danger')
                            activity.classList.add('border-danger')
                        })
                    )
                }
            }
            Promise.all(promises).then(() => {
                dialogAddActivity.scrimClickAction = 'cancel'
                buttonCancelActivities.disabled = false
                buttonAddActivities.icon[0].setAttribute('data-icon', 'ic:round-plus')
            })
        }
    }
}
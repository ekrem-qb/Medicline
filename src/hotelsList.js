const buttonCreateAddress = document.querySelector('button#createAddress')
buttonCreateAddress.onclick = () => showInlineEdit(buttonCreateAddress, 'address')
const buttonCreateHotel = document.querySelector('button#createHotel')
buttonCreateHotel.onclick = () => showInlineEdit(buttonCreateHotel, 'hotel')

const addressList = document.getElementById('addressList')
addressList.overlay = document.getElementById('addressessListOverlay')
addressList.overlay.icon = addressList.overlay.querySelector('.mdi')
addressList.overlay.text = addressList.overlay.querySelector('h3')
const hotelsList = document.getElementById('hotelsList')
hotelsList.overlay = document.getElementById('hotelsListOverlay')
hotelsList.overlay.icon = hotelsList.overlay.querySelector('.mdi')
hotelsList.overlay.text = hotelsList.overlay.querySelector('h3')
const listItemTemplate = document.getElementById('listItemTemplate')
let selectedAddress
let stopAddressQuery = () => { }
let stopHotelQuery = () => { }
let stopFilteredCasesQuery = () => { }

addressList.onscroll = () => moveInlineEditToAnchor()
hotelsList.onscroll = () => moveInlineEditToAnchor()

function listItems(collection, list) {
    list.innerHTML = ''
    return db.collection(collection).orderBy('name', 'asc').onSnapshot(
        snapshot => {
            console.log(snapshot.docChanges())
            snapshot.docChanges().forEach(
                change => {
                    switch (change.type) {
                        case 'added':
                            const listItem = listItemTemplate.content.firstElementChild.cloneNode(true)
                            listItem.id = change.doc.ref.path
                            if (collection == 'address') {
                                listItem.classList.add('mdc-ripple-surface')
                                new MDCRipple(listItem)
                                listItem.onclick = event => {
                                    if (event.target == listItem) {
                                        const activeItem = list.querySelector('.list-group-item.active')
                                        if (activeItem) {
                                            activeItem.classList.remove('active')
                                        }
                                        selectedAddress = listItem
                                        listItem.classList.add('active')
                                        stopHotelQuery()
                                        stopHotelQuery = listItems(change.doc.ref.path + '/hotel', hotelsList)
                                    }
                                }
                            }

                            const label = listItem.children['label']
                            label.textContent = change.doc.get('name')
                            label.onclick = () => showInlineEdit(listItem, listItem.id, label.textContent)
                            label.classList.toggle('disabled', !haveEditPermission)

                            listItem.label = label

                            const buttonDelete = listItem.children['delete']
                            buttonDelete.disabled = !haveEditPermission
                            buttonDelete.onclick = () => {
                                deleteAddressPath = listItem.id

                                let filteredCases

                                switch (change.doc.ref.path.split('/').length) {
                                    case 2:
                                        filteredCases = allCases.where(change.doc.ref.path.split('/')[0], '==', change.doc.ref)
                                        break
                                    case 4:
                                        filteredCases = allCases.where(change.doc.ref.path.split('/')[0] + '_' + change.doc.ref.path.split('/')[2], '==', change.doc.ref)
                                        break
                                }

                                stopFilteredCasesQuery()
                                stopFilteredCasesQuery = filteredCases.onSnapshot(
                                    snapshot => {
                                        let prefix

                                        foundCasesLinks.innerHTML = ''

                                        if (snapshot.docs.length > 0) {
                                            iconDialogDeleteAddress.classList.remove('mdi-help-circle-outline')
                                            iconDialogDeleteAddress.classList.add('mdi-alert')

                                            prefix = 'CANT_DELETE#THIS_'
                                            textDialogDeleteAddress.classList.remove('mb-0')
                                            textDialogDeleteAddress.classList.add('mb-2')

                                            for (let i = 0; i < snapshot.docs.length; i++) {
                                                const _case = snapshot.docs[i];

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
                                            dialogDeleteAddress.materialComponent.buttons[1].disabled = true
                                        } else {
                                            iconDialogDeleteAddress.classList.add('mdi-help-circle-outline')
                                            iconDialogDeleteAddress.classList.remove('mdi-alert')

                                            prefix = 'ASK_DELETE#THIS_'
                                            textDialogDeleteAddress.classList.add('mb-0')
                                            textDialogDeleteAddress.classList.remove('mb-2')

                                            dialogDeleteAddress.materialComponent.buttons[1].disabled = false
                                        }

                                        if (collection == 'address') {
                                            textDialogDeleteAddress.innerText = translate(prefix + collection.toUpperCase())
                                        } else {
                                            textDialogDeleteAddress.innerText = translate(prefix + collection.split('/')[2].toUpperCase())
                                        }

                                        dialogDeleteAddress.materialComponent.open()
                                    },
                                    error => {
                                        console.error('Error getting filtered cases: ' + error)
                                    }
                                )
                            }
                            buttonDelete.materialRipple = new MDCRipple(buttonDelete)
                            buttonDelete.materialRipple.unbounded = true

                            listItem.deleteButton = buttonDelete

                            if (change.newIndex == list.childElementCount) {
                                list.appendChild(listItem)
                            } else {
                                list.insertBefore(listItem, list.children[change.newIndex])
                            }
                            break
                        case 'modified':
                            list.children[change.doc.ref.path].label.textContent = change.doc.get('name')

                            if (change.newIndex == list.childElementCount) {
                                list.appendChild(list.children[change.doc.ref.path])
                            } else {
                                const removedChild = list.removeChild(list.children[change.doc.ref.path])
                                list.insertBefore(removedChild, list.children[change.newIndex])
                            }
                            break
                        case 'removed':
                            if (selectedAddress == list.children[change.doc.ref.path]) {
                                selectedAddress = undefined
                            }
                            list.children[change.doc.ref.path].remove()
                            break
                    }
                }
            )
            if (list.childElementCount > 0) {
                setListOverlayState(list.overlay, 'hide')
            } else {
                setListOverlayState(list.overlay, 'empty')
            }
            if (!selectedAddress) {
                if (addressList.childElementCount > 0) {
                    addressList.children[0].click()
                }
            }
            moveInlineEditToAnchor()
        },
        error => {
            console.error('Error getting ' + collection + ': ' + error)
        }
    )
}

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        stopAddressQuery()
        stopAddressQuery = listItems('address', addressList)
        loadPermissions()
    } else {
        stopAddressQuery()
        stopHotelQuery()
        stopFilteredCasesQuery()
        stopPermissionsQuery()
    }
})

let stopPermissionsQuery = () => { }
let haveEditPermission = false

function toggleEditMode(editIsAllowed) {
    buttonCreateAddress.disabled = !editIsAllowed
    buttonCreateHotel.disabled = !editIsAllowed

    for (const listItem of addressList.children) {
        listItem.label.classList.toggle('disabled', !editIsAllowed)
        listItem.deleteButton.disabled = !editIsAllowed
    }
    for (const listItem of hotelsList.children) {
        listItem.label.classList.toggle('disabled', !editIsAllowed)
        listItem.deleteButton.disabled = !editIsAllowed
    }

    haveEditPermission = editIsAllowed
}

function loadPermissions() {
    toggleEditMode(false)

    stopPermissionsQuery()
    stopPermissionsQuery = allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').doc('hotels').onSnapshot(
        snapshot => {
            toggleEditMode(snapshot.get('edit'))
        },
        error => {
            console.error('Error getting permissions: ' + error)
        }
    )
}

const inlineEdit = document.getElementById('inlineEdit')
const inlineEditInput = inlineEdit.querySelector('input')
let inlineEditPath, inlineEditAnchorID
const saveButton = inlineEdit.querySelector('button#save')
const saveButtonIcon = saveButton.querySelector('.mdi')

function showInlineEdit(anchor, path, oldValue) {
    if (oldValue) {
        inlineEditInput.value = oldValue
        inlineEditInput.oldValue = oldValue
    } else {
        inlineEditInput.value = ''
        inlineEditInput.oldValue = ''
    }
    saveButton.disabled = true

    inlineEditAnchorID = anchor.id
    moveInlineEditToAnchor()

    inlineEditPath = path
    inlineEdit.classList.add('show')
    inlineEditInput.focus()
}

saveButton.onclick = () => {
    if (inlineEditInput.value != '' && inlineEditInput.value != inlineEditInput.oldValue) {
        saveButtonIcon.classList.remove('mdi-check')
        saveButtonIcon.classList.add('mdi-loading', 'mdi-spin')

        if (inlineEditPath == 'address' || inlineEditPath == 'hotel') {
            let collection

            switch (inlineEditPath) {
                case 'address':
                    collection = db.collection(inlineEditPath)
                    break
                case 'hotel':
                    collection = db.collection(selectedAddress.id + '/' + inlineEditPath)
                    break
            }

            collection.add({
                name: inlineEditInput.value.trim()
            }).then(snapshot => {
                inlineEditInput.value = inlineEditInput.oldValue
                saveButton.disabled = true
                saveButtonIcon.classList.add('mdi-check')
                saveButtonIcon.classList.remove('mdi-loading', 'mdi-spin')
                inlineEdit.classList.remove('show')

                if (inlineEditPath == 'address') {
                    const newElement = document.getElementById(snapshot.path)
                    if (newElement) {
                        newElement.click()
                    }
                }
            }).catch(error => {
                saveButtonIcon.classList.add('mdi-check')
                saveButtonIcon.classList.remove('mdi-loading', 'mdi-spin')
                console.error('Error creating ' + inlineEditPath + ': ', error)
            })
        } else {
            db.doc(inlineEditPath).update({
                name: inlineEditInput.value.trim()
            }).then(() => {
                inlineEditInput.value = inlineEditInput.oldValue
                saveButton.disabled = true
                saveButtonIcon.classList.add('mdi-check')
                saveButtonIcon.classList.remove('mdi-loading', 'mdi-spin')
                inlineEdit.classList.remove('show')
            }).catch(error => {
                saveButtonIcon.classList.add('mdi-check')
                saveButtonIcon.classList.remove('mdi-loading', 'mdi-spin')
                console.error('Error updating ' + inlineEditPath + ': ', error)
            })
        }
    }
}

inlineEditInput.oninput = () => {
    if (inlineEditInput.value.trim() != '' && inlineEditInput.value.trim() != inlineEditInput.oldValue) {
        saveButton.disabled = false
    } else {
        saveButton.disabled = true
    }
}
inlineEditInput.onchange = () => inlineEditInput.value = inlineEditInput.value.trim()

inlineEditInput.onblur = event => {
    if (event.relatedTarget != null) {
        if (event.relatedTarget.parentElement == inlineEdit) {
            return
        }
    }
    inlineEdit.classList.remove('show')
}

inlineEditInput.onkeydown = event => {
    switch (event.key) {
        case 'Enter':
            saveButton.click()
            break
        case 'Escape':
            inlineEdit.classList.remove('show')
            break
    }
}

function moveInlineEditToAnchor() {
    let anchor = document.getElementById(inlineEditAnchorID)

    if (anchor != null) {
        if (anchor.localName == 'button') {
            inlineEdit.style.top = (anchor.parentElement.parentElement.offsetTop + 1) + 'px'
            inlineEdit.style.left = (anchor.parentElement.parentElement.offsetLeft + 1) + 'px'
            inlineEdit.style.height = anchor.offsetHeight + 'px'
            inlineEdit.style.width = anchor.offsetWidth + 'px'
            inlineEdit.style.zIndex = '15'
        } else {
            inlineEdit.style.top = anchor.getBoundingClientRect().top + 'px'
            inlineEdit.style.left = anchor.getBoundingClientRect().left + 'px'
            inlineEdit.style.height = (anchor.offsetHeight - (Number.parseFloat(window.getComputedStyle(inlineEdit, null).paddingTop.replace('px', '')) * 2)) + 'px'
            inlineEdit.style.width = (anchor.offsetWidth - (Number.parseFloat(window.getComputedStyle(inlineEdit, null).paddingLeft.replace('px', '')) * 2)) + 'px'
            inlineEdit.style.zIndex = ''
        }
    } else {
        inlineEdit.classList.remove('show')
    }
}

let deleteAddressPath
const dialogDeleteAddress = document.getElementById('dialogDeleteAddress')
const iconDialogDeleteAddress = dialogDeleteAddress.querySelector('.mdi')
const textDialogDeleteAddress = dialogDeleteAddress.querySelector('p')
const foundCasesLinks = dialogDeleteAddress.querySelector('span')

dialogDeleteAddress.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        db.doc(deleteAddressPath).delete().then(() => {

        }).catch(error => {
            console.error('Error removing address: ', error)
        })
    }
})

function setListOverlayState(overlay, state) {
    switch (state) {
        case 'loading':
            overlay.classList.remove('hide')
            overlay.classList.remove('show-headers')
            overlay.icon.classList.add('mdi-loading', 'mdi-spin')
            overlay.icon.classList.remove('mdi-emoticon-sad-outline', 'mdi-archive-arrow-up-outline')
            overlay.text.hidden = true
            break
        case 'empty':
            overlay.classList.remove('hide')
            overlay.classList.remove('show-headers')
            overlay.icon.classList.add('mdi-emoticon-sad-outline')
            overlay.icon.classList.remove('mdi-loading', 'mdi-spin', 'mdi-archive-arrow-up-outline')
            overlay.text.hidden = false
            overlay.text.innerText = translate(overlay.id.replace('ListOverlay', '').toUpperCase()) + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            overlay.classList.add('hide')
            break
    }
}
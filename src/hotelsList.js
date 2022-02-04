const buttonCreateAddress = document.querySelector('button#createAddress')
buttonCreateAddress.onclick = () => inlineEdit.show(buttonCreateAddress, 'address')
const buttonCreateHotel = document.querySelector('button#createHotel')
buttonCreateHotel.onclick = () => inlineEdit.show(buttonCreateHotel, 'hotel')

const addressList = document.getElementById('addressList')
addressList.overlay = document.getElementById('addressessListOverlay')
addressList.overlay.icon = addressList.overlay.getElementsByClassName('iconify')
addressList.overlay.text = addressList.overlay.querySelector('h3')
const hotelsList = document.getElementById('hotelsList')
hotelsList.overlay = document.getElementById('hotelsListOverlay')
hotelsList.overlay.icon = hotelsList.overlay.getElementsByClassName('iconify')
hotelsList.overlay.text = hotelsList.overlay.querySelector('h3')
const listItemTemplate = document.getElementById('listItemTemplate')
let selectedAddress
let stopAddressQuery = () => { }
let stopHotelQuery = () => { }
let stopFilteredCasesQuery = () => { }

addressList.onscroll = () => inlineEdit.moveToAnchor()
hotelsList.onscroll = () => inlineEdit.moveToAnchor()

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
                                        if (selectedAddress != listItem) {
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
                            }

                            const label = listItem.children['label']
                            label.textContent = change.doc.get('name')
                            label.onclick = () => inlineEdit.show(listItem, listItem.id, label.textContent)
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
                                            iconDialogDeleteAddress[0].setAttribute('data-icon', 'ic:round-warning')

                                            prefix = 'CANT_DELETE#THIS_'
                                            textDialogDeleteAddress.classList.remove('mb-0')
                                            textDialogDeleteAddress.classList.add('mb-2')

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
                                            dialogDeleteAddress.materialComponent.buttons[1].disabled = true
                                        } else {
                                            iconDialogDeleteAddress[0].setAttribute('data-icon', 'ic:round-help-outline')

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
            inlineEdit.moveToAnchor()
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
        selectedAddress = undefined
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

const buttonDone = inlineEdit.querySelector('button#save')
buttonDone.icon = buttonDone.getElementsByClassName('iconify')

buttonDone.onclick = async () => {
    if (inlineEdit.input.value != '' && inlineEdit.input.value != inlineEdit.input.oldValue) {
        buttonDone.icon[0].setAttribute('data-icon', 'eos-icons:loading')
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

            await collection.add({
                name: inlineEdit.input.value.trim()
            }).then(snapshot => {
                if (inlineEditPath == 'address') {
                    addressList.children.namedItem(snapshot.path)?.click()
                }
            }).catch(error => {
                console.error('Error creating ' + inlineEditPath + ': ', error)
            })
        } else {
            await db.doc(inlineEditPath).update({
                name: inlineEdit.input.value.trim()
            }).then(() => {
            }).catch(error => {
                console.error('Error updating ' + inlineEditPath + ': ', error)
            })
        }
        inlineEdit.hide()
    }
}

let deleteAddressPath
const dialogDeleteAddress = document.getElementById('dialogDeleteAddress')
const iconDialogDeleteAddress = dialogDeleteAddress.getElementsByClassName('iconify')
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
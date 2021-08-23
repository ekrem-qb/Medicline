const addressList = document.getElementById('addressList')
const hotelsList = document.getElementById('hotelsList')
let curentAddressListSnapshot, curenthotelsListSnapshot
let stopHotelQuery = () => { }
let stopFilteredCasesQuery = () => { }

addressList.onscroll = () => moveInlineEditToAnchor()
hotelsList.onscroll = () => moveInlineEditToAnchor()

function listItems(collection, list) {
    stopHotelQuery()
    return db.collection(collection).orderBy('name', 'asc').onSnapshot(
        snapshot => {
            list.innerHTML = ''
            snapshot.docs.forEach(item => {
                const listItem = document.createElement('li')
                listItem.classList.add('list-group-item', 'flex', 'align-items-center', 'justify-content-between', 'p-2')
                listItem.id = item.ref.path
                list.appendChild(listItem)

                if (collection == 'address') {
                    curentAddressListSnapshot = snapshot
                    listItem.classList.add('mdc-ripple-surface')
                    listItem.onclick = event => {
                        if (event.target == listItem) {
                            const activeItem = list.querySelector('.list-group-item.active')
                            if (activeItem) {
                                activeItem.classList.remove('active')
                            }
                            selectedAddressID = listItem.id
                            listItem.classList.add('active')
                            stopHotelQuery = listItems(item.ref.path + '/hotel', hotelsList)
                        }
                    }
                }
                else {
                    curenthotelsListSnapshot = snapshot
                }

                const bigtext = document.createElement('b')
                bigtext.classList.add('ms-2')
                listItem.appendChild(bigtext)
                bigtext.textContent = item.get('name')

                bigtext.onclick = () => showInlineEdit(listItem, listItem.id, bigtext.textContent)

                const deleteButton = document.createElement('button')
                deleteButton.classList.add('mdc-icon-button', 'mdc-button--outlined', 'mdc-button--red')
                listItem.appendChild(deleteButton)

                deleteButton.onclick = () => {
                    deleteAddressPath = listItem.id

                    let filteredCases

                    switch (item.ref.path.split('/').length) {
                        case 2:
                            filteredCases = allCases.where(item.ref.path.split('/')[0], '==', item.ref)
                            break
                        case 4:
                            filteredCases = allCases.where(item.ref.path.split('/')[0] + '_' + item.ref.path.split('/')[2], '==', item.ref)
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
                                    link.onclick = () => ipcRenderer.send('new-window', 'case', _case.id)
                                    foundCasesLinks.appendChild(link)

                                    if (i < snapshot.docs.length - 1) {
                                        const comma = document.createElement('b')
                                        comma.innerText = ' , '
                                        foundCasesLinks.appendChild(comma)
                                    }
                                }
                                dialogDeleteAddress.materialComponent.buttons[1].disabled = true
                            }
                            else {
                                iconDialogDeleteAddress.classList.add('mdi-help-circle-outline')
                                iconDialogDeleteAddress.classList.remove('mdi-alert')

                                prefix = 'ASK_DELETE#THIS_'
                                textDialogDeleteAddress.classList.add('mb-0')
                                textDialogDeleteAddress.classList.remove('mb-2')

                                dialogDeleteAddress.materialComponent.buttons[1].disabled = false
                            }

                            if (collection == 'address') {
                                textDialogDeleteAddress.innerText = translate(prefix + collection.toUpperCase())
                            }
                            else {
                                textDialogDeleteAddress.innerText = translate(prefix + collection.split('/')[2].toUpperCase())
                            }

                            dialogDeleteAddress.materialComponent.open()
                        },
                        error => {
                            console.error("Error getting filtered cases: " + error)
                        }
                    )
                }

                const deleteRipple = document.createElement('div')
                deleteRipple.classList.add('mdc-icon-button__ripple')
                deleteButton.appendChild(deleteRipple)

                const deleteIcon = document.createElement('i')
                deleteIcon.classList.add('mdi', 'mdi-trash-can')
                deleteButton.appendChild(deleteIcon)

                listItem.materialRipple = new MDCRipple(listItem)

                listItem.querySelectorAll('.mdc-icon-button').forEach(rippleElement => {
                    rippleElement.materialRipple = new MDCRipple(rippleElement)
                    rippleElement.materialRipple.unbounded = true
                })
            })
            if (collection == 'address') {
                if (document.getElementById(selectedAddressID)) {
                    document.getElementById(selectedAddressID).click()
                }
                else {
                    selectedAddressID = list.children[0].id
                    list.children[0].click()
                }
            }
            moveInlineEditToAnchor()
        },
        error => {
            console.error("Error getting " + colllection + error)
        }
    )
}

listItems('address', addressList)

let selectedAddressID
const inlineEdit = document.getElementById('inlineEdit')
const inlineEditInput = inlineEdit.querySelector('input')
let inlineEditPath, inlineEditAnchorID
const saveButton = inlineEdit.querySelector('button#save')
const saveButtonIcon = saveButton.querySelector('.mdi')

function showInlineEdit(anchor, path, oldValue) {
    if (oldValue) {
        inlineEditInput.value = oldValue
        inlineEditInput.oldValue = oldValue
    }
    else {
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
                    collection = db.collection(selectedAddressID + '/' + inlineEditPath)
                    break
            }

            collection.add({ name: inlineEditInput.value.trim() }).then(() => {
                inlineEditInput.value = inlineEditInput.oldValue
                saveButton.disabled = true
                saveButtonIcon.classList.add('mdi-check')
                saveButtonIcon.classList.remove('mdi-loading', 'mdi-spin')
                inlineEdit.classList.remove('show')
            }).catch(error => {
                saveButtonIcon.classList.add('mdi-check')
                saveButtonIcon.classList.remove('mdi-loading', 'mdi-spin')
                console.error("Error creating " + inlineEditPath + ": ", error)
            })
        }
        else {
            db.doc(inlineEditPath).update({ name: inlineEditInput.value.trim() }).then(() => {
                inlineEditInput.value = inlineEditInput.oldValue
                saveButton.disabled = true
                saveButtonIcon.classList.add('mdi-check')
                saveButtonIcon.classList.remove('mdi-loading', 'mdi-spin')
                inlineEdit.classList.remove('show')
            }).catch(error => {
                saveButtonIcon.classList.add('mdi-check')
                saveButtonIcon.classList.remove('mdi-loading', 'mdi-spin')
                console.error("Error updating " + inlineEditPath + ": ", error)
            })
        }
    }
}

inlineEditInput.oninput = () => {
    if (inlineEditInput.value.trim() != '' && inlineEditInput.value.trim() != inlineEditInput.oldValue) {
        saveButton.disabled = false
    }
    else {
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
            inlineEdit.style.top = (anchor.parentElement.offsetTop + 1) + 'px'
            inlineEdit.style.left = (anchor.parentElement.offsetLeft + 1) + 'px'
            inlineEdit.style.height = anchor.offsetHeight + 'px'
            inlineEdit.style.width = anchor.offsetWidth + 'px'
            inlineEdit.style.zIndex = '15'
        }
        else {
            inlineEdit.style.top = anchor.getBoundingClientRect().top + 'px'
            inlineEdit.style.left = anchor.getBoundingClientRect().left + 'px'
            inlineEdit.style.height = (anchor.offsetHeight - (Number.parseFloat(window.getComputedStyle(inlineEdit, null).paddingTop.replace('px', '')) * 2)) + 'px'
            inlineEdit.style.width = (anchor.offsetWidth - (Number.parseFloat(window.getComputedStyle(inlineEdit, null).paddingLeft.replace('px', '')) * 2)) + 'px'
            inlineEdit.style.zIndex = ''
        }
    }
    else {
        inlineEdit.classList.remove('show')
    }
}

let deleteAddressPath
const dialogDeleteAddress = document.querySelector("#dialogDeleteAddress")
const iconDialogDeleteAddress = dialogDeleteAddress.querySelector(".mdi")
const textDialogDeleteAddress = dialogDeleteAddress.querySelector("p")
const foundCasesLinks = dialogDeleteAddress.querySelector("span")

dialogDeleteAddress.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        db.doc(deleteAddressPath).delete().then(() => {

        }).catch(error => {
            console.error("Error removing address: ", error)
        })
    }
})
const buttonCreateCountry = document.querySelector('button#createCountry')
buttonCreateCountry.onclick = () => inlineEdit.show(buttonCreateCountry, 'country')

const countriesList = document.getElementById('countriesList')
countriesList.overlay = document.getElementById('countriesListOverlay')
countriesList.overlay.icon = countriesList.overlay.getElementsByClassName('iconify')
countriesList.overlay.text = countriesList.overlay.querySelector('h3')
const listItemTemplate = document.getElementById('listItemTemplate')
let stopCountryQuery = () => { }
let stopFilteredCasesQuery = () => { }

countriesList.onscroll = () => inlineEdit.moveToAnchor()

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

                            const label = listItem.children['label']
                            label.textContent = change.doc.get('name')
                            label.onclick = () => inlineEdit.show(listItem, listItem.id, label.textContent)
                            label.classList.toggle('disabled', !haveEditPermission)

                            listItem.label = label

                            const buttonDelete = listItem.children['delete']
                            buttonDelete.disabled = !haveEditPermission
                            buttonDelete.onclick = () => {
                                deleteCountryPath = listItem.id

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
                                            iconDialogDeleteCountry[0].setAttribute('data-icon', 'ic:round-warning')

                                            prefix = 'CANT_DELETE#THIS_'
                                            textDialogDeleteCountry.classList.remove('mb-0')
                                            textDialogDeleteCountry.classList.add('mb-2')

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
                                            dialogDeleteCountry.materialComponent.buttons[1].disabled = true
                                        } else {
                                            iconDialogDeleteCountry[0].setAttribute('data-icon', 'ic:round-help-outline')

                                            prefix = 'ASK_DELETE#THIS_'
                                            textDialogDeleteCountry.classList.add('mb-0')
                                            textDialogDeleteCountry.classList.remove('mb-2')

                                            dialogDeleteCountry.materialComponent.buttons[1].disabled = false
                                        }

                                        if (collection == 'country') {
                                            textDialogDeleteCountry.innerText = translate(prefix + collection.toUpperCase())
                                        } else {
                                            textDialogDeleteCountry.innerText = translate(prefix + collection.split('/')[2].toUpperCase())
                                        }

                                        dialogDeleteCountry.materialComponent.open()
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
            inlineEdit.moveToAnchor()
        },
        error => {
            console.error('Error getting ' + collection + ': ' + error)
        }
    )
}

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        stopCountryQuery()
        stopCountryQuery = listItems('country', countriesList)
        loadPermissions()
    } else {
        stopCountryQuery()
        stopFilteredCasesQuery()
        stopPermissionsQuery()
    }
})

let stopPermissionsQuery = () => { }
let haveEditPermission = false

function toggleEditMode(editIsAllowed) {
    buttonCreateCountry.disabled = !editIsAllowed

    for (const listItem of countriesList.children) {
        listItem.label.classList.toggle('disabled', !editIsAllowed)
        listItem.deleteButton.disabled = !editIsAllowed
    }

    haveEditPermission = editIsAllowed
}

function loadPermissions() {
    toggleEditMode(false)

    stopPermissionsQuery()
    stopPermissionsQuery = allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').doc('countries').onSnapshot(
        snapshot => {
            toggleEditMode(snapshot.get('edit'))
        },
        error => {
            console.error('Error getting permissions: ' + error)
        }
    )
}

const inlineEditInput = inlineEdit.querySelector('input')
const saveButton = inlineEdit.querySelector('button#save')
const saveButtonIcon = saveButton.getElementsByClassName('iconify')

saveButton.onclick = () => {
    if (inlineEditInput.value != '' && inlineEditInput.value != inlineEditInput.oldValue) {
        saveButtonIcon[0].setAttribute('data-icon', 'eos-icons:loading')

        if (inlineEditPath == 'country') {
            db.collection(inlineEditPath).add({
                name: inlineEditInput.value.trim()
            }).then(snapshot => {
                saveButton.disabled = true
                saveButtonIcon[0].setAttribute('data-icon', 'ic:round-done')
                inlineEdit.hide()
            }).catch(error => {
                saveButtonIcon[0].setAttribute('data-icon', 'ic:round-done')
                console.error('Error creating ' + inlineEditPath + ': ', error)
            })
        } else {
            db.doc(inlineEditPath).update({
                name: inlineEditInput.value.trim()
            }).then(() => {
                saveButton.disabled = true
                saveButtonIcon[0].setAttribute('data-icon', 'ic:round-done')
                inlineEdit.hide()
            }).catch(error => {
                saveButtonIcon[0].setAttribute('data-icon', 'ic:round-done')
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
    inlineEdit.hide()
}

inlineEditInput.onkeydown = event => {
    switch (event.key) {
        case 'Enter':
            saveButton.click()
            break
        case 'Escape':
            inlineEdit.hide()
            break
    }
}

let deleteCountryPath
const dialogDeleteCountry = document.getElementById('dialogDeleteCountry')
const iconDialogDeleteCountry = dialogDeleteCountry.getElementsByClassName('iconify')
const textDialogDeleteCountry = dialogDeleteCountry.querySelector('p')
const foundCasesLinks = dialogDeleteCountry.querySelector('span')

dialogDeleteCountry.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        db.doc(deleteCountryPath).delete().then(() => {

        }).catch(error => {
            console.error('Error removing country: ', error)
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
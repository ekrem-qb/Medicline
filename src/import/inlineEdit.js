const inlineEdit = document.getElementById('inlineEdit')
let inlineEditPath, inlineEditAnchorSelector
inlineEdit.moveToAnchor = () => {
    const anchor = document.querySelector(inlineEditAnchorSelector)
    if (anchor != null) {
        switch (anchor.localName) {
            case 'button':
                inlineEdit.style.top = (anchor.parentElement.parentElement.offsetTop + 1) + 'px'
                inlineEdit.style.left = anchor.parentElement.parentElement.offsetLeft + 'px'
                inlineEdit.style.height = anchor.offsetHeight + 'px'
                inlineEdit.style.width = anchor.offsetWidth + 'px'
                inlineEdit.style.zIndex = '15'
                break
            default:
                inlineEdit.style.top = anchor.getBoundingClientRect().top + 'px'
                inlineEdit.style.left = anchor.getBoundingClientRect().left + 'px'
                inlineEdit.style.height = (anchor.offsetHeight - (parseFloat(window.getComputedStyle(inlineEdit, null).paddingTop.replace('px', '')) * 2)) + 'px'
                inlineEdit.style.width = (anchor.offsetWidth - (parseFloat(window.getComputedStyle(inlineEdit, null).paddingLeft.replace('px', '')) * 2)) + 'px'
                inlineEdit.style.zIndex = ''
                break
        }
    } else {
        inlineEdit.hide()
    }
}
inlineEdit.show = (anchor, path, oldValue) => {
    if (oldValue) {
        inlineEditInput.value = oldValue
        inlineEditInput.oldValue = oldValue
    } else {
        inlineEditInput.value = ''
        inlineEditInput.oldValue = ''
    }
    if (typeof saveButton !== 'undefined') {
        saveButton.disabled = true
    }
    if (anchor.parentElement.id != '') {
        inlineEditAnchorSelector = '#'
        if (!isNaN(anchor.parentElement.id[0])) {
            inlineEditAnchorSelector += '\\3'
        }
        inlineEditAnchorSelector += anchor.parentElement.id.replaceAll('/', '\\/') + '>'
    }
    else {
        inlineEditAnchorSelector = ''
    }
    inlineEditAnchorSelector += anchor.tagName.toLocaleLowerCase()
    if (anchor.id != '') {
        inlineEditAnchorSelector += '#'
        if (!isNaN(anchor.id[0])) {
            inlineEditAnchorSelector += '\\3'
        }
        inlineEditAnchorSelector += anchor.id.replaceAll('/', '\\/')
    }
    inlineEdit.moveToAnchor()

    inlineEditPath = path
    inlineEdit.classList.add('show')
    inlineEditInput.focus()
}
inlineEdit.hide = () => inlineEdit.classList.remove('show')
window.onresize = () => inlineEdit.moveToAnchor()
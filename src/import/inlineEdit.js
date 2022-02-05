const inlineEdit = document.getElementById('inlineEdit')
let inlineEditPath, inlineEditAnchor, inlineEditAnchorSelector
inlineEdit.moveToAnchor = () => {
    if (inlineEdit.classList.contains('show')) {
        if (!inlineEditAnchor?.isConnected) {
            inlineEditAnchor = document.querySelector(inlineEditAnchorSelector)
        }
        if (inlineEditAnchor) {
            switch (inlineEditAnchor.localName) {
                case 'button':
                    inlineEdit.style.top = (inlineEditAnchor.parentElement.parentElement.offsetTop + 1) + 'px'
                    inlineEdit.style.left = inlineEditAnchor.parentElement.parentElement.offsetLeft + 'px'
                    inlineEdit.style.height = inlineEditAnchor.offsetHeight + 'px'
                    inlineEdit.style.width = inlineEditAnchor.offsetWidth + 'px'
                    inlineEdit.style.zIndex = '15'
                    break
                default:
                    inlineEdit.style.top = inlineEditAnchor.getBoundingClientRect().top + 'px'
                    inlineEdit.style.left = inlineEditAnchor.getBoundingClientRect().left + 'px'
                    inlineEdit.style.height = (inlineEditAnchor.offsetHeight - (parseFloat(window.getComputedStyle(inlineEdit, null).paddingTop.replace('px', '')) * 2)) + 'px'
                    inlineEdit.style.width = (inlineEditAnchor.offsetWidth - (parseFloat(window.getComputedStyle(inlineEdit, null).paddingLeft.replace('px', '')) * 2)) + 'px'
                    inlineEdit.style.zIndex = ''
                    break
            }
        } else {
            inlineEdit.hide()
        }
    }
}
inlineEdit.show = (anchor, path, oldValue, valueType = 'name') => {
    inlineEdit.input.type = 'text'
    inlineEdit.input.min = undefined
    inlineEdit.input.onkeypress = undefined
    inlineEdit.input.inputmask?.destroy()

    inlineEdit.valueType = valueType
    switch (valueType) {
        case 'price':
        case 'date':
        case 'quantity':
            mask(inlineEdit.input, valueType, true)
            break
    }
    if (oldValue != undefined) {
        inlineEdit.input.oldValue = oldValue
    }
    else {
        inlineEdit.input.oldValue = ''
    }
    inlineEdit.input.value = inlineEdit.input.oldValue
    buttonDone.icon[0].setAttribute('data-icon', 'ic:round-done')
    buttonDone.disabled = true
    if (inlineEditAnchor != anchor) {
        inlineEditAnchor = anchor
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
        inlineEditAnchorSelector += anchor.tagName.toLowerCase()
        if (anchor.id != '') {
            inlineEditAnchorSelector += '#'
            if (!isNaN(anchor.id[0])) {
                inlineEditAnchorSelector += '\\3'
            }
            inlineEditAnchorSelector += anchor.id.replaceAll('/', '\\/')
        }
    }
    inlineEditPath = path
    inlineEdit.classList.add('show')
    inlineEdit.moveToAnchor()
    inlineEdit.input.focus()
}
inlineEdit.hide = () => inlineEdit.classList.remove('show')
window.onresize = () => inlineEdit.moveToAnchor()

inlineEdit.input = inlineEdit.querySelector('input')
inlineEdit.input.onchange = () => inlineEdit.input.value = inlineEdit.input.value.trim()

inlineEdit.input.oninput = () => {
    if (!inlineEdit.input.inputmask) {
        buttonDone.disabled = inlineEdit.input.value.trim() == '' || inlineEdit.input.value.trim() == inlineEdit.input.oldValue
    }
}
inlineEdit.input.onblur = event => {
    if (event.relatedTarget != null) {
        if (event.relatedTarget.parentElement == inlineEdit.input.parentElement) {
            return
        }
    }
    inlineEdit.hide()
}
inlineEdit.input.onkeydown = event => {
    switch (event.key) {
        case 'Enter':
            buttonDone.click()
            break
        case 'Escape':
            inlineEdit.hide()
            break
    }
}
inlineEdit.input.onkeyup = () => {
    if (inlineEdit.input.inputmask) {
        buttonDone.disabled = inlineEdit.input.inputmask.unmaskedvalue().toString() == '' || inlineEdit.input.inputmask.unmaskedvalue() == inlineEdit.input.oldValue
    }
}
const buttonDone = inlineEdit.querySelector('button#done')
buttonDone.icon = buttonDone.getElementsByClassName('iconify')
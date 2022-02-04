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
    inlineEdit.input.value = oldValue || ''
    inlineEdit.input.oldValue = oldValue || ''
    buttonDone.icon[0].setAttribute('data-icon', 'ic:round-done')
    if (inlineEdit.input.id != 'activityName') {
        buttonDone.disabled = true
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
    inlineEdit.input.focus()
}
inlineEdit.hide = () => inlineEdit.classList.remove('show')
window.onresize = () => inlineEdit.moveToAnchor()

inlineEdit.input = inlineEdit.querySelector('input')
inlineEdit.input.onchange = () => inlineEdit.input.value = inlineEdit.input.value.trim()

if (inlineEdit.input.id != 'activityName') {
    inlineEdit.input.oninput = () => {
        if (inlineEdit.input.value.trim() != '' && inlineEdit.input.value.trim() != inlineEdit.input.oldValue) {
            buttonDone.disabled = false
        } else {
            buttonDone.disabled = true
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
}
const buttonDone = inlineEdit.querySelector('button#done')
buttonDone.icon = buttonDone.getElementsByClassName('iconify')
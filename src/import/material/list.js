const { MDCList } = require('@material/list')

document.querySelectorAll('.mdc-list').forEach(listElement => {
    listElement.materialComponent = new MDCList(listElement)
    listElement.materialComponent.listElements.forEach(listItemElement => {
        listItemElement.materialRipple = new MDCRipple(listItemElement)
    })
})
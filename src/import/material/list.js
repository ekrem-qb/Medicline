const { MDCList } = require('@material/list')

for (const element of document.getElementsByClassName('mdc-list')) {
    element.materialComponent = new MDCList(element)
    element.materialComponent.listElements.forEach(listItemElement => {
        listItemElement.materialRipple = new MDCRipple(listItemElement)
    })
}
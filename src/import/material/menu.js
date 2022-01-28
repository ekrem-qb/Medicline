const { MDCMenu } = require('@material/menu')
const menuList = document.getElementsByClassName('mdc-menu')

for (const element of menuList) {
    element.materialComponent = new MDCMenu(element)
    element.materialComponent.setFixedPosition(true)
}

document.onmousedown = mouseEvent => {
    if (mouseEvent.button == 2) {
        for (const element of menuList) {
            element.materialComponent.open = false
        }
    }
}

const { MDCList } = require('@material/list')

for (const element of document.getElementsByClassName('mdc-list')) {
    element.materialComponent = new MDCList(element)
    element.materialComponent.listElements.forEach(listItemElement => {
        listItemElement.materialRipple = new MDCRipple(listItemElement)
    })
}
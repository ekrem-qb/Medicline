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
const { MDCMenu } = require('@material/menu')

document.querySelectorAll('.mdc-menu').forEach(menuElement => {
    menuElement.materialComponent = new MDCMenu(menuElement)
    menuElement.materialComponent.setFixedPosition(true)
})

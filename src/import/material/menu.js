const { MDCMenu } = require('@material/menu')

for (const element of document.getElementsByClassName('mdc-menu')) {
    element.materialComponent = new MDCMenu(element)
    element.materialComponent.setFixedPosition(true)
}
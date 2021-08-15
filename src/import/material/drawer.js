const { MDCDrawer } = require('@material/drawer')

for (const element of document.getElementsByClassName('mdc-drawer')) {
    element.materialComponent = MDCDrawer.attachTo(element)
}
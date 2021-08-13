const { MDCTabBar } = require('@material/tab-bar')

for (const element of document.getElementsByClassName('mdc-tab-bar')) {
    element.materialComponent = new MDCTabBar(element)
}
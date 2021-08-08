const { MDCTabBar } = require('@material/tab-bar')

document.querySelectorAll('.mdc-tab-bar').forEach(tabBarElement => {
    tabBarElement.materialComponent = new MDCTabBar(tabBarElement)
})

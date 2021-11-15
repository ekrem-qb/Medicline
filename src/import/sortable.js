const Sortable = require('sortablejs')

Sortable.create(tableHeadersList, {
    group: 'TableColumns',
    animation: 150,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    onStart: () => setOverlayState('drag'),
    onEnd: () => {
        setOverlayState('hide')
    },
    onSort: () => {
        refreshAndSaveColumns()
    }
})

const Sortable = require('sortablejs')

Sortable.create(tableHeadersList, {
    group: 'TableColumns',
    animation: 150,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    onStart: () => setTableOverlayState('drag'),
    onEnd: () => {
        if (casesList.childElementCount > 0) {
            setTableOverlayState('hide')
        }
        else {
            setTableOverlayState('empty')
        }
    },
    onSort: () => {
        listCases(currentCasesSnap)
        let enabledColumns = []
        for (const header of tableHeadersList.children) {
            enabledColumns.push(header.id)
        }
        localStorage.setItem('enabledColumns', enabledColumns)
    }
})

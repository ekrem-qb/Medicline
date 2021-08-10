const Sortable = require("sortablejs")

const properties = {
    group: "TableColumns",
    animation: 150,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    onStart: () => setTableOverlayState('drag'),
    onEnd: () => {
        if (casesList.childElementCount > 0) {
            setTableOverlayState('hide')
        }
        else {
            setTableOverlayState("empty")
        }
    }
}

Sortable.create(hiddenTableColumnsList, properties)

properties.onSort = () => {
    listCases(currentCasesSnap)
    let enabledColumns = []
    for (let column of tableColumnsList.children) {
        enabledColumns.push(column.id)
    }
    localStorage.setItem("enabledColumns", enabledColumns)
}
Sortable.create(tableColumnsList, properties)

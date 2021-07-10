const { TableExport } = require('tableexport')

function buttonExportClick() {
    let table = TableExport(document.querySelectorAll('table'), {
        filename: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
        exportButtons: false
    })
    let xlsxData = table.getExportData()['cases'].xlsx
    table.export2file(xlsxData.data, xlsxData.mimeType, xlsxData.filename, xlsxData.fileExtension, xlsxData.merges, xlsxData.RTL, xlsxData.sheetname)
}

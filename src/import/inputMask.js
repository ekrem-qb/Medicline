require('inputmask')

document.querySelectorAll('input[mask]').forEach(input => {
    const options = {
        showMaskOnHover: false
    }
    switch (input.getAttribute('mask')) {
        case 'time':
            options.alias = 'datetime'
            options.inputFormat = 'HH:MM'
            options.placeholder = '--:--'
            break
        case 'date':
            options.alias = 'datetime'
            options.inputFormat = 'dd.mm.yyyy'
            options.outputFormat = 'yyyy-mm-dd'
            options.placeholder = '--.--.----'
            break
        case 'tel':
            options.alias = '[+]9999999[99999999]'
            options.placeholder = ''
            options.onUnMask = maskedValue => { return maskedValue }
            break
        case 'price':
            options.alias = 'currency'
            options.showMaskOnFocus = false
            options.onUnMask = maskedValue => { return parseFloat(maskedValue) }
            break
    }
    input.mask = new Inputmask(options).mask(input)
})
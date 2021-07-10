require('inputmask')

document.querySelectorAll('input[mask]').forEach(input => {
    let options = {
        showMaskOnHover: false
    }
    switch (input.getAttribute("mask")) {
        case "time":
            options.alias = "datetime"
            options.inputFormat = "HH:MM"
            options.placeholder = "--:--"
            break;
        case "date":
            options.alias = "datetime"
            options.inputFormat = "dd.mm.yyyy"
            options.outputFormat = "yyyy-mm-dd"
            options.placeholder = "--.--.----"
            break;
        case "tel":
            options.alias = "[+]9999999[99999999]"
            options.placeholder = ""
            break;
    }
    input.mask = new Inputmask(options).mask(input)
})

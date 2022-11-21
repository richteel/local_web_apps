const color_gpio = [
    { gpio_mode: 0, color_1: "GPIO15-19/16-21/20-27", color_2: "GPIO9-14/10-15/12-19", color_3: "GPIO4-8/4-9/4-11" },
    { gpio_mode: 1, color_1: "GPIO15-19/16-21/20-27", color_2: "GPIO9-14/10-15/12-19", color_3: "GPIO4-8/4-9/4-11" },
    { gpio_mode: 2, color_1: "GPIO15-19", color_2: "GPIO9-14", color_3: "GPIO4-8" },
    { gpio_mode: 3, color_1: "GPIO20-24", color_2: "GPIO12-17", color_3: "GPIO4-8" },
    { gpio_mode: 4, color_1: "GPIO21-25", color_2: "GPIO12-17", color_3: "GPIO5-9" },
    { gpio_mode: 5, color_1: "GPIO16-21", color_2: "GPIO10-15", color_3: "GPIO4-9" },
    { gpio_mode: 6, color_1: "GPIO20-25", color_2: "GPIO12-17", color_3: "GPIO4-9" },
    { gpio_mode: 7, color_1: "GPIO20-27", color_2: "GPIO12-19", color_3: "GPIO4-11" }
];

const form_info = [
    { select_name: "output_format", decimal_cell_id: "output_format_dec", hex_cell_id: "output_format_hex", shift: 0, mask: 15 },
    { select_name: "rgb_order", decimal_cell_id: "rgb_order_dec", hex_cell_id: "rgb_order_hex", shift: 4, mask: 15 },
    { select_name: "output_enable_mode", decimal_cell_id: "output_enable_mode_dec", hex_cell_id: "output_enable_mode_hex", shift: 8, mask: 1 },
    { select_name: "invert_pixel_clock", decimal_cell_id: "invert_pixel_clock_dec", hex_cell_id: "invert_pixel_clock_hex", shift: 9, mask: 1 },
    { select_name: "unk1", decimal_cell_id: "unk1_dec", hex_cell_id: "unk1_hex", shift: 10, mask: 1 },
    { select_name: "unk2", decimal_cell_id: "unk2_dec", hex_cell_id: "unk2_hex", shift: 11, mask: 1 },
    { select_name: "hsync_disable", decimal_cell_id: "hsync_disable_dec", hex_cell_id: "hsync_disable_hex", shift: 12, mask: 1 },
    { select_name: "vsync_disable", decimal_cell_id: "vsync_disable_dec", hex_cell_id: "vsync_disable_hex", shift: 13, mask: 1 },
    { select_name: "output_enable_disable", decimal_cell_id: "output_enable_disable_dec", hex_cell_id: "output_enable_disable_hex", shift: 14, mask: 1 },
    { select_name: "unk3", decimal_cell_id: "unk3_dec", hex_cell_id: "unk3_hex", shift: 15, mask: 1 },
    { select_name: "hsync_polarity", decimal_cell_id: "hsync_polarity_dec", hex_cell_id: "hsync_polarity_hex", shift: 16, mask: 1 },
    { select_name: "vsync_polarity", decimal_cell_id: "vsync_polarity_dec", hex_cell_id: "vsync_polarity_hex", shift: 17, mask: 1 },
    { select_name: "output_enable_polarity", decimal_cell_id: "output_enable_polarity_dec", hex_cell_id: "output_enable_polarity_hex", shift: 18, mask: 1 },
    { select_name: "unk4", decimal_cell_id: "unk4_dec", hex_cell_id: "unk4_hex", shift: 19, mask: 1 },
    { select_name: "hsync_phase", decimal_cell_id: "hsync_phase_dec", hex_cell_id: "hsync_phase_hex", shift: 20, mask: 1 },
    { select_name: "vsync_phase", decimal_cell_id: "vsync_phase_dec", hex_cell_id: "vsync_phase_hex", shift: 21, mask: 1 },
    { select_name: "output_enable_phase", decimal_cell_id: "output_enable_phase_dec", hex_cell_id: "output_enable_phase_hex", shift: 22, mask: 1 },
    { select_name: "unk5", decimal_cell_id: "unk5_dec", hex_cell_id: "unk5_hex", shift: 23, mask: 1 }
];


/*************************************************************************/
/******************************** COLORS *********************************/
/*************************************************************************/
const colorCellIds = [
    ["color_1_1", "color_1_2", "color_1_3"],
    ["color_2_1", "color_2_2", "color_2_3"],
    ["color_3_1", "color_3_2", "color_3_3"],
    ["color_4_1", "color_4_2", "color_4_3"],
];
let colors_name, colors_clear_button, colors_value = 0;

function colorsInit(_colors_name, colors_clear_button_id) {
    colors_name = _colors_name;
    colors_clear_button = document.getElementById(colors_clear_button_id);

    if (!colors_name || !colors_clear_button || !document.querySelectorAll(`input[name="${colors_name}"]`)) {
        console.error("ERROR: colorsInit - Failed to find one of the color containers");
        return false;
    }

    const radio_buttons = document.querySelectorAll(`input[name="${colors_name}"]`);
    for (const radioButton of radio_buttons) {
        radioButton.addEventListener("change", colorsChanged);
    }
    colors_clear_button.addEventListener("click", () => {
        const radio_buttons = document.querySelectorAll(`input[name="${colors_name}"]`);

        for (const radioButton of radio_buttons) {
            radioButton.checked = false;
        }
        colorsChanged();
    });

    colorsGpioChanged();

    return true;
}


function colorsChanged() {
    const radio_buttons = document.querySelectorAll(`input[name="${colors_name}"]`);

    colors_value = 0;

    for (const radioButton of radio_buttons) {
        if (radioButton.checked) {
            colors_value = radioButton.value;
            break;
        }
    }

    if (document.getElementById("rgb_order").value != colors_value) {
        document.getElementById("rgb_order").value = colors_value;
        formUpdateValue(null);
    }

    colors_clear_button.disabled = colors_value == "0";
}

function colorsGpioChanged() {
    const colorsGpio = color_gpio.filter((colors) => { return (colors.gpio_mode == gpio_value) });

    if (!colorsGpio || colorsGpio.length != 1) {
        console.error("ERROR: colorsGpioChanged did not find GPIO Color Pins for GPIO Mode");
        return;
    }

    for (let i = 0; i < colorCellIds.length; i++) {
        for (let j = 0; j < colorCellIds[i].length; j++) {
            const cell = document.getElementById(colorCellIds[i][j]);
            if (!cell) {
                console.error(`ERROR: Failed to find cell "${colorCellIds[i][j]}"`);
                return false;
            }
            switch (j) {
                case 0:
                    cell.textContent = colorsGpio[0].color_1;
                    break;
                case 1:
                    cell.textContent = colorsGpio[0].color_2;
                    break;
                case 2:
                    cell.textContent = colorsGpio[0].color_3;
                    break;
                default:
                    cell.textContent = "";
                    break;
            }
        }
    }

    return true;
}

function colorsSet(_colors_value) {
    if (colors_value == _colors_value)
        return;

    colors_value = _colors_value;

    const radio_buttons = document.querySelectorAll(`input[name="${colors_name}"]`);

    for (const radioButton of radio_buttons) {
        radioButton.checked = false;
        if (radioButton.value == colors_value) {
            radioButton.checked = true;
        }
    }

    colorsChanged();

    console.debug(`colorsSet(${_colors_value})`);
}

/*************************************************************************/
/********************************* FORM **********************************/
/*************************************************************************/
let dpi_output_format_dec, dpi_output_format_hex, form_clear_button;

function formInit(dpi_output_format_dec_id, dpi_output_format_hex_id, form_clear_button_id) {
    dpi_output_format_dec = document.getElementById(dpi_output_format_dec_id);
    dpi_output_format_hex = document.getElementById(dpi_output_format_hex_id);
    form_clear_button = document.getElementById(form_clear_button_id);

    if (!dpi_output_format_dec || !dpi_output_format_hex || !form_clear_button) {
        console.error("ERROR: formInit - Failed to find one of the form containers");
        return false;
    }

    dpi_output_format_dec.addEventListener("input", formCheckEnteredValue);
    dpi_output_format_hex.addEventListener("input", formCheckEnteredValue);

    for (item of form_info) {
        document.getElementById(item.select_name).addEventListener("change", formUpdateValue);
    }

    form_clear_button.addEventListener("click", () => {
        prev_dec_val = 0;
        formUpdateSelectedValues();
        formUpdateValue(null);
    });

    formUpdateValue(null);

    return true;
}

let prev_dec_val = 0;

function formCheckEnteredValue(e) {
    const last_dec_val = prev_dec_val;
    const isHex = e.target == dpi_output_format_hex;

    let reg = /^\d+$/;

    if (isHex) {
        reg = /(0x)?[\dabcdef]+$/;
    }

    if (e.target.value == "") {
        prev_dec_val = 0;
    }
    else if (!e.target.value.match(reg)) {
        dpi_output_format_dec.value = prev_dec_val;
        dpi_output_format_hex.value = parseInt(prev_dec_val).toString(16);
    }
    else if (isHex) {
        let val = e.target.value.startsWith("0x") ? e.target.value.substring(2) : e.target.value;
        prev_dec_val = parseInt(val, 16);
    }
    else {
        prev_dec_val = e.target.value;
    }

    prev_dec_val = parseInt(prev_dec_val);

    if (isHex)
        dpi_output_format_dec.value = prev_dec_val;
    else
        dpi_output_format_hex.value = "0x" + parseInt(prev_dec_val).toString(16);

    if (prev_dec_val == last_dec_val)
        return false;

    formUpdateSelectedValues();

    return true;
}

function formUpdateSelectedValues() {
    for (const item of form_info) {
        const item_val = (prev_dec_val >> item.shift) & item.mask;
        document.getElementById(item.decimal_cell_id).textContent = item_val;
        document.getElementById(item.hex_cell_id).textContent = "0x" + item_val.toString(16);
        document.getElementById(item.select_name).value = item_val;
    }
}

function formUpdateValue(e) {
    let newDecVal = 0;
    for (item of form_info) {
        const val = document.getElementById(item.select_name).value;
        let num = 0;
        if (val.length > 0)
            num = parseInt(val);

        if (item.select_name == "output_format") {
            gpioSet(val);
        }
        else if (item.select_name == "rgb_order") {
            colorsSet(val);
        }

        num = (num & item.mask) << item.shift;

        newDecVal += num;

        // console.debug(`{val: ${val}, num: ${num}, newDecVal: ${newDecVal}}`)
    }

    // console.debug(`Finish - {prev_dec_val: ${prev_dec_val}, newDecVal: ${newDecVal}}`)
    prev_dec_val = newDecVal;
    dpi_output_format_dec.value = prev_dec_val;
    dpi_output_format_hex.value = "0x" + parseInt(prev_dec_val).toString(16);

    formUpdateSelectedValues();

    form_clear_button.disabled = prev_dec_val == 0;
}



/*************************************************************************/
/********************************* GPIO **********************************/
/*************************************************************************/
let gpio_name, gpio_clear_button, gpio_value = 0;

function gpioInit(_gpio_name, gpio_clear_button_id) {
    gpio_name = _gpio_name;
    gpio_clear_button = document.getElementById(gpio_clear_button_id);

    if (!gpio_name || !gpio_clear_button || !document.querySelectorAll(`input[name="${gpio_name}"]`)) {
        console.error("ERROR: gpioInit - Failed to find one of the gpio containers");
        return false;
    }

    const radio_buttons = document.querySelectorAll(`input[name="${gpio_name}"]`);
    for (const radioButton of radio_buttons) {
        radioButton.addEventListener("change", gpioChanged);
    }
    gpio_clear_button.addEventListener("click", () => {
        const radio_buttons = document.querySelectorAll(`input[name="${gpio_name}"]`);

        for (const radioButton of radio_buttons) {
            radioButton.checked = false;
        }
        gpioChanged();
    });

    return true;
}

function gpioChanged() {
    const radio_buttons = document.querySelectorAll(`input[name="${gpio_name}"]`);

    gpio_value = 0;

    for (const radioButton of radio_buttons) {
        if (radioButton.checked) {
            gpio_value = radioButton.value;
            break;
        }
    }

    gpio_clear_button.disabled = gpio_value == "0";

    if (document.getElementById("output_format").value != gpio_value) {
        document.getElementById("output_format").value = gpio_value;
        formUpdateValue(null);
    }

    colorsGpioChanged();
}

function gpioSet(_gpio_value) {
    if (gpio_value == _gpio_value)
        return;

    gpio_value = _gpio_value;

    const radio_buttons = document.querySelectorAll(`input[name="${gpio_name}"]`);

    for (const radioButton of radio_buttons) {
        radioButton.checked = false;
        if (radioButton.value == gpio_value) {
            radioButton.checked = true;
        }
    }

    gpioChanged();

    console.debug(`gpioSet(${_gpio_value})`);
}


/*************************************************************************/
/********************************* TABS **********************************/
/*************************************************************************/
let tabs_container, tabs_left_button, tabs_right_button, tab_items, tabs_scroll_step;
let tab_selected = null;

function tabsInit(tabs_container_id, tabs_left_button_id, tabs_right_button_id, tab_items_id, scroll_step) {
    tabs_container = document.getElementById(tabs_container_id);
    tabs_left_button = document.getElementById(tabs_left_button_id);
    tabs_right_button = document.getElementById(tabs_right_button_id);
    tab_items = document.getElementById(tab_items_id);
    tabs_scroll_step = Math.abs(scroll_step);

    if (!tabs_scroll_step) {
        tabs_scroll_step = 200;
        console.info(`The tabs_scroll_step variable set to the default value of ${tabs_scroll_step}`);
    }

    if (!tabs_container || !tabs_left_button || !tabs_right_button || !tab_items) {
        console.error("ERROR: tabsInit - Failed to find one of the tabs containers");
        return false;
    }

    tabs_left_button.addEventListener("click", function () {
        const step_size = tabs_scroll_step <= tabs_container.offsetWidth ? tabs_scroll_step : tabs_container.offsetWidth;
        tabs_container.scrollLeft -= step_size;
        tabsUpdateScrollButtonsDisabledState();
    });

    tabs_right_button.addEventListener("click", function () {
        const step_size = tabs_scroll_step <= tabs_container.offsetWidth ? tabs_scroll_step : tabs_container.offsetWidth;
        tabs_container.scrollLeft += step_size;
        tabsUpdateScrollButtonsDisabledState();
    });

    for (const tab of tab_items.getElementsByTagName("li")) {
        tab.addEventListener("click", function (e) {
            e.stopPropagation();

            if (e.target.tagName == "LI") {
                tab_selected = e.target;
                tabsSelectedTabChanged();
            }
        });
    }

    tab_items.getElementsByTagName("li")[0].click();

    tabsUpdateScrollButtonsDisabledState();

    return true;
}

function tabsSelectedTabChanged() {
    // Update tab styles
    for (const tab of tab_items.getElementsByTagName("li")) {
        tab.classList.remove("selected");
        if (tab == tab_selected) {
            tab.classList.add("selected");
        }
    }

    // Make the selected tab fully visible if part of it is hidden
    if (tab_selected) {
        if (tab_selected.offsetLeft < (tabs_container.offsetLeft + tabs_container.scrollLeft)) {
            tabs_container.scrollLeft -= tabs_scroll_step;
            tabsUpdateScrollButtonsDisabledState();
        }
        else if ((tab_selected.offsetLeft + tab_selected.offsetWidth) > (tabs_container.offsetLeft + tabs_container.scrollLeft + tabs_container.offsetWidth)) {
            tabs_container.scrollLeft += tabs_scroll_step;
            tabsUpdateScrollButtonsDisabledState();
        }
    }

    worksheetShowSelected();
}

function tabsUpdateScrollButtonsDisabledState() {
    tabs_left_button.disabled = false;
    tabs_right_button.disabled = false;

    if (tabs_container.scrollLeft == 0) {
        tabs_left_button.disabled = true;
    }
    if (tabs_container.offsetWidth + tabs_container.scrollLeft >= tabs_container.scrollWidth) {
        tabs_right_button.disabled = true;
    }
}


/*************************************************************************/
/******************************* WORKSHEETS ******************************/
/*************************************************************************/
let worksheets_container;

function worksheetsInit(worksheets_container_id) {
    worksheets_container = document.getElementById(worksheets_container_id);

    if (!worksheets_container) {
        console.error("ERROR: worksheetsInit - Failed to find the worksheets container");
        return false;
    }

    worksheetShowSelected();

    return true;
}

function worksheetShowSelected() {
    if (!worksheets_container)
        return;

    for (const sheet of worksheets_container.childNodes) {
        if (sheet.tagName != "DIV" || !sheet.id)
            continue;

        sheet.classList.remove("selected");
        if (sheet.id == tab_selected.id + "_div") {
            sheet.classList.add("selected");
        }
    }
}


/*************************************************************************/
/**************************** INTITIALIZATION ****************************/
/*************************************************************************/
let initialized = true;
const main_content_area = document.getElementById("outer-parent");

initialized = initialized && tabsInit("tabs_panel", "lefttab", "righttab", "tabs", 100);
initialized = initialized && worksheetsInit("worksheets");
initialized = initialized && gpioInit("gpio_mode", "clear_gpio");
initialized = initialized && colorsInit("color_order", "clear_color");
initialized = initialized && formInit("dpi_output_format_dec", "dpi_output_format_hex", "clear_form");

if (!initialized) {
    console.error("ERROR: Failed to initialize");
}


window.addEventListener("resize", tabsUpdateScrollButtonsDisabledState);

// gpioSet(6);
// colorsSet(2);

/*
initialized = initialized && messageInit("msg");
initialized = initialized && tabsInit("tabs_panel", "lefttab", "righttab", "tabs", "tabcommands", "tabsCommandMenu", 100);
initialized = initialized && bookmarksInit("bookmarks-parent", "bookmarksCommandMenu");
initialized = initialized && dataInit();

dialogsInit();

if (!initialized) {
    messageShow("Initialization Failed");
    main_content_area.style.display = "none";
}
else {
    document.addEventListener("click", function () {
        contextMenusHide();
    });
}

dataLoad();
uiUpdate();

window.addEventListener("resize", tabsUpdateScrollButtonsDisabledState);
*/

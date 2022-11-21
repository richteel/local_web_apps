
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

function formTextIsValidInt(val, min = 0, max = 0) {
    const reg = /^-?\d+$/;

    if (!val.match(reg)) {
        console.info("Not an integer");
        return false;
    }

    if (min == max) {
        return true;
    }

    const checkVal = parseInt(val);
    if (checkVal < min || checkVal > max) {
        console.info("Not in range");
        return false;
    }

    return true;
}


/*************************************************************************/
/******************************* WORKSHEET *******************************/
/****************************** Color Order ******************************/
/*************************************************************************/
let colors_name, colors_clear_button, colors_radio_buttons;

function colorFormInit(_colors_name, colors_clear_button_id) {
    colors_name = _colors_name;
    colors_clear_button = document.getElementById(colors_clear_button_id);
    colors_radio_buttons = document.querySelectorAll(`input[name="${colors_name}"]`);

    if (!colors_name || !colors_clear_button || !colors_radio_buttons) {
        console.error("ERROR: colorFormInit - Failed to find one of the color containers");
        return false;
    }

    for (const radioButton of colors_radio_buttons) {
        radioButton.addEventListener("change", colorFormSelectionChanged);
    }
    colors_clear_button.addEventListener("click", () => {
        dpiFormUpdateFromSubValue(0, 15, 4);
    });

    return true;
}

function colorFormSelectionChanged(e) {
    // console.info(`colorFormSelectionChanged(${!e ? "null" : !e.target.value ? "no_val" : e.target.value})`);

    dpiFormUpdateFromSubValue(e.target.value, 15, 4);
}

function colorFormUpdateOrderValue(val) {
    if (!gpio_radio_buttons)
        return;

    let selected = false;

    for (const radioButton of colors_radio_buttons) {
        radioButton.checked = false;

        if (val == radioButton.value) {
            radioButton.checked = true;
            selected = true;
        }
    }

    colors_clear_button.disabled = !selected;

    const colorsGpio = COLORS_GPIO.filter((colors) => { return (colors.gpio_mode == gpio_mode) });

    if (!colorsGpio || colorsGpio.length != 1) {
        console.error(`ERROR: colorFormUpdateOrderValue(${val}) did not find GPIO Color Pins for GPIO Mode`);
        return;
    }

    for (let i = 0; i < COLOR_CELL_IDS.length; i++) {
        for (let j = 0; j < COLOR_CELL_IDS[i].length; j++) {
            const cell = document.getElementById(COLOR_CELL_IDS[i][j]);
            if (!cell) {
                console.error(`ERROR: Failed to find cell "${COLOR_CELL_IDS[i][j]}"`);
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
}


/*************************************************************************/
/******************************* WORKSHEET *******************************/
/****************************** Config.txt *******************************/
/*************************************************************************/
let config_text;

function configFormInit(config_text_id) {
    config_text = document.getElementById(config_text_id);

    if (!config_text) {
        console.error("ERROR: configFormInit - Failed to find one of the config containers");
        return false;
    }

    return true;
}

function configAppendText(txt) {
    if (config_text.value.length > 0)
        config_text.value += "\r\n";

    config_text.value += txt;
}

function configUpdateText() {
    if (!config_text) {
        return;
    }

    config_text.value = "";

    configAppendText("dtparam=i2c_arm=" + configGetValue("i2c_arm"));
    configAppendText("dtparam=spi=" + configGetValue("spi"));
    configAppendText("");
    configAppendText("dtoverlay=" + configGetValue("dtoverlay"));
    configAppendText("overscan_left=" + configGetValue("overscan_left"));
    configAppendText("overscan_right=" + configGetValue("overscan_right"));
    configAppendText("overscan_top=" + configGetValue("overscan_top"));
    configAppendText("overscan_bottom=" + configGetValue("overscan_bottom"));
    configAppendText("framebuffer_width=" + configGetValue("framebuffer_width"));
    configAppendText("framebuffer_height=" + configGetValue("framebuffer_height"));
    configAppendText("enable_dpi_lcd=1");
    configAppendText("display_default_lcd=1");
    configAppendText("dpi_group=" + configGetValue("dpi_group"));
    configAppendText("dpi_mode=" + configGetValue("dpi_mode"));
    configAppendText("dpi_output_format=" + configGetValue("dpi_output_format"));
    configAppendText("dpi_timings=800 0 40 48 40 480 0 13 3 29 0 0 0 62 0 30000000 6");
}

function configValuesFromWorksheets() {
}

function configGetValue(config_name, null_value = "") {
    const configItem = CONFIG_IDS.filter((item => { return item.name == config_name }));

    if (!configItem || configItem.length != 1) {
        console.error(`ERROR: configGetValue - Failed to get configuration value for "${config_name}"`);
        return null_value;
    }

    if (!configItem[0].elementId)
        return null_value;

    const elem = document.getElementById(configItem[0].elementId);

    if (!elem) {
        console.error(`ERROR: configGetValue - Failed to get configuration element for "${config_name}"`);
        return null_value;
    }

    return !elem.value ? null_value : elem.value;
}


/*************************************************************************/
/******************************* WORKSHEET *******************************/
/*************************** dpi_output_format ***************************/
/*************************************************************************/
let dpi_output_format_dec, dpi_output_format_hex, dpi_form_clear_button;

function dpFormInit(dpi_output_format_dec_id, dpi_output_format_hex_id, dpi_form_clear_button_id) {
    dpi_output_format_dec = document.getElementById(dpi_output_format_dec_id);
    dpi_output_format_hex = document.getElementById(dpi_output_format_hex_id);
    dpi_form_clear_button = document.getElementById(dpi_form_clear_button_id);

    if (!dpi_output_format_dec || !dpi_output_format_hex || !dpi_form_clear_button) {
        console.error("ERROR: dpFormInit - Failed to find one of the form containers");
        return false;
    }

    dpi_output_format_dec.addEventListener("input", dpiFormTextChanged);
    dpi_output_format_hex.addEventListener("input", dpiFormTextChanged);

    for (item of DPI_FORM_INFO) {
        document.getElementById(item.select_name).addEventListener("change", dpiFormSelectChanged);
    }

    dpi_form_clear_button.addEventListener("click", () => {
        dpiFormChangeDecText(0);
    });

    return true;
}

function dpiFormChangeDecText(val) {
    dpi_output_format_dec.value = val;
    dpi_output_format_dec.dispatchEvent(new Event('input', { bubbles: true }));
}

function dpiFormSelectChanged(e) {
    if (!e || !e.target || !e.target.id) {
        console.error("ERROR: dpiFormSelectChanged - Event target not found");
        return;
    }

    const selectItems = DPI_FORM_INFO.filter((items) => { return (items.select_name == e.target.id) });

    if (!selectItems || selectItems.length != 1) {
        console.error("ERROR: dpiFormSelectChanged - Did not find item");
        return;
    }

    dpiFormUpdateFromSubValue(e.target.value, selectItems[0].mask, selectItems[0].shift);
}

// Called from textboxes
function dpiFormTextChanged(e) {
    const last_dec_val = DATA_CONFIG.dpi_output_format_dec;
    const isHex = e.target == dpi_output_format_hex;

    let reg = /^\d+$/;

    if (isHex) {
        reg = /(0x)?[\dabcdef]+$/;
    }

    if (e.target.value == "") {
        DATA_CONFIG.dpi_output_format_dec = 0;
    }
    else if (isHex && e.target.value == "0x") {
        DATA_CONFIG.dpi_output_format_dec = 0;
        dpi_output_format_hex.value = "0x0"
    }
    else if (!e.target.value.match(reg)) {
        dpi_output_format_dec.value = DATA_CONFIG.dpi_output_format_dec;
        dpi_output_format_hex.value = "0x" + parseInt(DATA_CONFIG.dpi_output_format_dec).toString(16);
    }
    else if (isHex) {
        let val = e.target.value.startsWith("0x") ? e.target.value.substring(2) : e.target.value;
        DATA_CONFIG.dpi_output_format_dec = parseInt(val, 16);
    }
    else {
        DATA_CONFIG.dpi_output_format_dec = e.target.value;
    }

    DATA_CONFIG.dpi_output_format_dec = parseInt(DATA_CONFIG.dpi_output_format_dec);

    if (isHex)
        dpi_output_format_dec.value = DATA_CONFIG.dpi_output_format_dec;
    else
        dpi_output_format_hex.value = "0x" + parseInt(DATA_CONFIG.dpi_output_format_dec).toString(16);

    DATA_CONFIG.dpi_output_format_hex = dpi_output_format_hex.value;

    if (DATA_CONFIG.dpi_output_format_dec == last_dec_val) {
        console.info(`dpiFormTextChanged(${!e ? "null" : !e.target.id ? "no_id" : e.target.id}) - NO CHANGE IN VALUE`);
        return false;
    }
    console.info(`dpiFormTextChanged(${!e ? "null" : !e.target.id ? "no_id" : e.target.id}) - Value changed from ${last_dec_val} to ${DATA_CONFIG.dpi_output_format_dec}`);

    saveSheetInformation();

    dpiFormUpdateUi();

    return true;
}

// Called from any UI Control on Change except textboxes
function dpiFormUpdateFromSubValue(value, mask, shift) {
    const CLEAR_VALUE_MASK = ~(mask << shift);
    let new_dec_val = DATA_CONFIG.dpi_output_format_dec & CLEAR_VALUE_MASK;
    new_dec_val += (value & mask) << shift;

    // No changes made
    if (new_dec_val == DATA_CONFIG.dpi_output_format_dec) {
        return;
    }

    dpiFormChangeDecText(new_dec_val);
}

function dpiFormUpdateUi() {
    // console.info(`dpiFormUpdateUi()`);

    dpi_form_clear_button.disabled = DATA_CONFIG.dpi_output_format_dec == 0;

    // Update dpi_output_format Select Lists
    for (const item of DPI_FORM_INFO) {
        const item_val = (DATA_CONFIG.dpi_output_format_dec >> item.shift) & item.mask;
        document.getElementById(item.decimal_cell_id).textContent = item_val;
        document.getElementById(item.hex_cell_id).textContent = "0x" + item_val.toString(16);
        document.getElementById(item.select_name).value = item_val;

        if (item.select_name == "output_format") {
            gpioFormUpdateModeValue(item_val);
        }
        else if (item.select_name == "rgb_order") {
            colorFormUpdateOrderValue(item_val);
        }
    }

    configUpdateText();
}



/*************************************************************************/
/******************************* WORKSHEET *******************************/
/**************************** GPIO Assignment ****************************/
/*************************************************************************/
let gpio_name, gpio_clear_button, gpio_radio_buttons, gpio_mode = 0;

function gpioFormInit(_gpio_name, gpio_clear_button_id) {
    gpio_name = _gpio_name;
    gpio_clear_button = document.getElementById(gpio_clear_button_id);
    gpio_radio_buttons = document.querySelectorAll(`input[name="${gpio_name}"]`);

    if (!gpio_name || !gpio_clear_button || !gpio_radio_buttons) {
        console.error("ERROR: gpioInit - Failed to find one of the gpio containers");
        return false;
    }

    for (const radioButton of gpio_radio_buttons) {
        radioButton.addEventListener("change", gpioFormSelectionChanged);
    }

    gpio_clear_button.addEventListener("click", () => {
        dpiFormUpdateFromSubValue(0, 15, 0);
    });

    return true;
}

function gpioFormSelectionChanged(e) {
    // console.info(`gpioFormSelectionChanged(${!e ? "null" : !e.target.value ? "no_val" : e.target.value})`);

    dpiFormUpdateFromSubValue(e.target.value, 15, 0);
}

function gpioFormUpdateModeValue(val) {
    gpio_mode = 0;

    if (!gpio_radio_buttons)
        return;

    let selected = false;

    for (const radioButton of gpio_radio_buttons) {
        radioButton.checked = false;

        if (val == radioButton.value) {
            radioButton.checked = true;
            selected = true;
            gpio_mode = val;
        }
    }

    gpio_clear_button.disabled = !selected;
}

/*************************************************************************/
/******************************* WORKSHEET *******************************/
/***************************** Other Settings ****************************/
/*************************************************************************/
const otherPrevious = { id: "", val: "" };

function otherFormInit() {
    for (const item of OTHER_FORM_INFO) {
        let elem = document.getElementById("other_" + item);

        if (elem) {
            switch (elem.tagName.toUpperCase()) {
                case "INPUT":
                    elem.addEventListener("keydown", otherFormIfValidSetPrevious);
                    elem.addEventListener("input", otherConfigCheckIfValid);
                    break;
                case "SELECT":
                    elem.addEventListener("change", otherConfigCheckIfValid);
                    break;
                default:
                    console.error(`ERROR: otherFormInit - Event handler not assigned: ${elem.id} has tagName ${elem.tagName}`);
                    break;
            }
        }
    }

    return true;
}

function otherFormValidate() {

}

function otherFormIfValidSetPrevious(e) {
    otherPrevious.id = "";
    otherPrevious.val = "";

    if (!e || !e.target || !e.target.id) {
        return;
    }

    otherPrevious.id = e.target.id;
    otherPrevious.val = e.target.value;
}

function otherConfigCheckIfValid(e) {
    const previousId = otherPrevious.id;
    const previousVal = otherPrevious.val;

    otherPrevious.id = "";
    otherPrevious.val = "";

    if (!e || !e.target || !e.target.id) {
        return;
    }

    if (e.type == "input") {
        let isValid = true;

        switch (e.target.id.toLowerCase()) {
            case "other_overscan_left":
            case "other_overscan_right":
            case "other_overscan_top":
            case "other_overscan_bottom":
                isValid = formTextIsValidInt(e.target.value);
                break;
            case "other_framebuffer_width":
            case "other_framebuffer_height":
                isValid = formTextIsValidInt(e.target.value, 0, 4096);
                break;
            case "other_dpi_mode":
                const other_dpi_group = document.getElementById("other_dpi_group");
                if (parseInt(other_dpi_group.value) == 2)
                    isValid = formTextIsValidInt(e.target.value, 1, 87);
                else
                    isValid = formTextIsValidInt(e.target.value, 1, 107);
                break;
            default:
                console.info(`otherConfigCheckIfValid - Input not checked ${e.target.id}`);
                break;
        }

        if (e.target.value == "") {
            return true;
        }

        const selPos = e.target.selectionStart - 1;

        if (!isValid && previousId == e.target.id) {
            e.target.value = previousVal;
        }

        e.target.value = parseInt(e.target.value);

        if (selPos < e.target.value.length) {
            e.target.setSelectionRange(selPos, selPos);
        }

        saveSheetInformation();
        configUpdateText();
        return isValid;
    }

    switch (e.target.id.toLowerCase()) {
        case "other_interface":
            const i2c = document.getElementById("other_i2c");
            const spi = document.getElementById("other_spi");

            i2c.disabled = false;
            spi.disabled = false;

            if (e.target.value == "gpio") {
                i2c.value = "off";
                spi.value = "off";

                i2c.disabled = true;
                spi.disabled = true;
            }
            break;
        case "other_i2c":
            break;
        case "other_spi":
            break;
        case "other_dpi_group":
            const mode = document.getElementById("other_dpi_mode");
            if (e.target.value == 2) {
                if (mode.value > 87)
                    mode.value = "";
            }
            break;
        default:
            console.info(`otherConfigCheckIfValid - Select not checked ${e.target.id}`);
            break;
    }

    saveSheetInformation();
    configUpdateText();
    return true;
}


/*************************************************************************/
/******************************* WORKSHEET *******************************/
/******************************** Wiring *********************************/
/*************************************************************************/
function wiringFormInit() {

    return true;
}


/*************************************************************************/
/**************************** INTITIALIZATION ****************************/
/*************************************************************************/
function loadSavedData() {
    getSheetInformation();

    let currentval = DATA_CONFIG.dpi_output_format_dec;

    if (!Number.isInteger(DATA_CONFIG.dpi_output_format_dec))
        currentval = 0;

    DATA_CONFIG.dpi_output_format_dec = 0;
    dpiFormChangeDecText(currentval);
}

let initialized = true;
const main_content_area = document.getElementById("outer-parent");

initialized = initialized && tabsInit("tabs_panel", "lefttab", "righttab", "tabs", 100);
initialized = initialized && worksheetsInit("worksheets");
initialized = initialized && dpFormInit("dpi_output_format_dec", "dpi_output_format_hex", "clear_form");
initialized = initialized && colorFormInit("color_order", "clear_color");
initialized = initialized && configFormInit("config_text");
initialized = initialized && gpioFormInit("gpio_mode", "clear_gpio");
initialized = initialized && otherFormInit();
initialized = initialized && wiringFormInit();

if (!initialized) {
    console.error("ERROR: Failed to initialize");
}


window.addEventListener("resize", tabsUpdateScrollButtonsDisabledState);

loadSavedData();


const EXECUTE_TESTS = true;
const MAX_TEST_RETRY_COUNT = 100;
const TEST_RETRY_TIME_MS = 10;
let test_retry_count = 0;

function execute_tests() {
    if (typeof runTests === "undefined") {
        if (test_retry_count > MAX_TEST_RETRY_COUNT) {
            console.error("ERROR: execute_tests - Retry exceeded max try count.")
            return;
        }
        test_retry_count++;
        console.info(`execute_tests - runTests() is undefined try again in ${TEST_RETRY_TIME_MS}ms Attempt: ${test_retry_count}`);
        // setTimeout(function () { execute_tests(); }, TEST_RETRY_TIME_MS);
        setTimeout(() => { execute_tests(); }, TEST_RETRY_TIME_MS);
        return;
    }

    const hold_value = DATA_CONFIG.dpi_output_format_dec;
    runTests();
    dpiFormChangeDecText(hold_value);
}

if (EXECUTE_TESTS) {
    execute_tests();
}
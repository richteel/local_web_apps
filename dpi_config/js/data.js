// Used to display the GPIO Pins for each color
const COLORS_GPIO = [
    { gpio_mode: 0, color_1: "GPIO15-19/16-21/20-27", color_2: "GPIO9-14/10-15/12-19", color_3: "GPIO4-8/4-9/4-11" },
    { gpio_mode: 1, color_1: "GPIO15-19/16-21/20-27", color_2: "GPIO9-14/10-15/12-19", color_3: "GPIO4-8/4-9/4-11" },
    { gpio_mode: 2, color_1: "GPIO15-19", color_2: "GPIO9-14", color_3: "GPIO4-8" },
    { gpio_mode: 3, color_1: "GPIO20-24", color_2: "GPIO12-17", color_3: "GPIO4-8" },
    { gpio_mode: 4, color_1: "GPIO21-25", color_2: "GPIO12-17", color_3: "GPIO5-9" },
    { gpio_mode: 5, color_1: "GPIO16-21", color_2: "GPIO10-15", color_3: "GPIO4-9" },
    { gpio_mode: 6, color_1: "GPIO20-25", color_2: "GPIO12-17", color_3: "GPIO4-9" },
    { gpio_mode: 7, color_1: "GPIO20-27", color_2: "GPIO12-19", color_3: "GPIO4-11" }
];

const COLORS_ORDER = [
    { order: 0, color1: "", color2: "", color3: "" },
    { order: 1, color1: "Red", color2: "Green", color3: "Blue" },
    { order: 2, color1: "Blue", color2: "Green", color3: "Red" },
    { order: 3, color1: "Green", color2: "Red", color3: "Blue" },
    { order: 4, color1: "Blue", color2: "Red", color3: "Green" },
];

const COLOR_CELL_IDS = [
    ["color_1_1", "color_1_2", "color_1_3"],
    ["color_2_1", "color_2_2", "color_2_3"],
    ["color_3_1", "color_3_2", "color_3_3"],
    ["color_4_1", "color_4_2", "color_4_3"],
];

// Used for the Color Order table showing color and pin assignments for GPIO Assignment and Color Order Selections
const COLORS_GPIO_INFO = [
    [
        { mode: 0, gpio: 27, color: null, bit: null },
        { mode: 0, gpio: 26, color: null, bit: null },
        { mode: 0, gpio: 25, color: null, bit: null },
        { mode: 0, gpio: 24, color: null, bit: null },
        { mode: 0, gpio: 23, color: null, bit: null },
        { mode: 0, gpio: 22, color: null, bit: null },
        { mode: 0, gpio: 21, color: null, bit: null },
        { mode: 0, gpio: 20, color: null, bit: null },
        { mode: 0, gpio: 19, color: null, bit: null },
        { mode: 0, gpio: 18, color: null, bit: null },
        { mode: 0, gpio: 17, color: null, bit: null },
        { mode: 0, gpio: 16, color: null, bit: null },
        { mode: 0, gpio: 15, color: null, bit: null },
        { mode: 0, gpio: 14, color: null, bit: null },
        { mode: 0, gpio: 13, color: null, bit: null },
        { mode: 0, gpio: 12, color: null, bit: null },
        { mode: 0, gpio: 11, color: null, bit: null },
        { mode: 0, gpio: 10, color: null, bit: null },
        { mode: 0, gpio: 9, color: null, bit: null },
        { mode: 0, gpio: 8, color: null, bit: null },
        { mode: 0, gpio: 7, color: null, bit: null },
        { mode: 0, gpio: 6, color: null, bit: null },
        { mode: 0, gpio: 5, color: null, bit: null },
        { mode: 0, gpio: 4, color: null, bit: null },
    ], [
        { mode: 1, gpio: 27, color: null, bit: null },
        { mode: 1, gpio: 26, color: null, bit: null },
        { mode: 1, gpio: 25, color: null, bit: null },
        { mode: 1, gpio: 24, color: null, bit: null },
        { mode: 1, gpio: 23, color: null, bit: null },
        { mode: 1, gpio: 22, color: null, bit: null },
        { mode: 1, gpio: 21, color: null, bit: null },
        { mode: 1, gpio: 20, color: null, bit: null },
        { mode: 1, gpio: 19, color: null, bit: null },
        { mode: 1, gpio: 18, color: null, bit: null },
        { mode: 1, gpio: 17, color: null, bit: null },
        { mode: 1, gpio: 16, color: null, bit: null },
        { mode: 1, gpio: 15, color: null, bit: null },
        { mode: 1, gpio: 14, color: null, bit: null },
        { mode: 1, gpio: 13, color: null, bit: null },
        { mode: 1, gpio: 12, color: null, bit: null },
        { mode: 1, gpio: 11, color: null, bit: null },
        { mode: 1, gpio: 10, color: null, bit: null },
        { mode: 1, gpio: 9, color: null, bit: null },
        { mode: 1, gpio: 8, color: null, bit: null },
        { mode: 1, gpio: 7, color: null, bit: null },
        { mode: 1, gpio: 6, color: null, bit: null },
        { mode: 1, gpio: 5, color: null, bit: null },
        { mode: 1, gpio: 4, color: null, bit: null }
    ], [
        { mode: 2, gpio: 27, color: null, bit: null },
        { mode: 2, gpio: 26, color: null, bit: null },
        { mode: 2, gpio: 25, color: null, bit: null },
        { mode: 2, gpio: 24, color: null, bit: null },
        { mode: 2, gpio: 23, color: null, bit: null },
        { mode: 2, gpio: 22, color: null, bit: null },
        { mode: 2, gpio: 21, color: null, bit: null },
        { mode: 2, gpio: 20, color: null, bit: null },
        { mode: 2, gpio: 19, color: 1, bit: 7 },
        { mode: 2, gpio: 18, color: 1, bit: 6 },
        { mode: 2, gpio: 17, color: 1, bit: 5 },
        { mode: 2, gpio: 16, color: 1, bit: 4 },
        { mode: 2, gpio: 15, color: 1, bit: 3 },
        { mode: 2, gpio: 14, color: 2, bit: 7 },
        { mode: 2, gpio: 13, color: 2, bit: 6 },
        { mode: 2, gpio: 12, color: 2, bit: 5 },
        { mode: 2, gpio: 11, color: 2, bit: 4 },
        { mode: 2, gpio: 10, color: 2, bit: 3 },
        { mode: 2, gpio: 9, color: 2, bit: 2 },
        { mode: 2, gpio: 8, color: 3, bit: 7 },
        { mode: 2, gpio: 7, color: 3, bit: 6 },
        { mode: 2, gpio: 6, color: 3, bit: 5 },
        { mode: 2, gpio: 5, color: 3, bit: 4 },
        { mode: 2, gpio: 4, color: 3, bit: 3 }
    ], [
        { mode: 3, gpio: 27, color: null, bit: null },
        { mode: 3, gpio: 26, color: null, bit: null },
        { mode: 3, gpio: 25, color: null, bit: null },
        { mode: 3, gpio: 24, color: 1, bit: 7 },
        { mode: 3, gpio: 23, color: 1, bit: 6 },
        { mode: 3, gpio: 22, color: 1, bit: 5 },
        { mode: 3, gpio: 21, color: 1, bit: 4 },
        { mode: 3, gpio: 20, color: 1, bit: 3 },
        { mode: 3, gpio: 19, color: null, bit: null },
        { mode: 3, gpio: 18, color: null, bit: null },
        { mode: 3, gpio: 17, color: 2, bit: 7 },
        { mode: 3, gpio: 16, color: 2, bit: 6 },
        { mode: 3, gpio: 15, color: 2, bit: 5 },
        { mode: 3, gpio: 14, color: 2, bit: 4 },
        { mode: 3, gpio: 13, color: 2, bit: 3 },
        { mode: 3, gpio: 12, color: 2, bit: 2 },
        { mode: 3, gpio: 11, color: null, bit: null },
        { mode: 3, gpio: 10, color: null, bit: null },
        { mode: 3, gpio: 9, color: null, bit: null },
        { mode: 3, gpio: 8, color: 3, bit: 7 },
        { mode: 3, gpio: 7, color: 3, bit: 6 },
        { mode: 3, gpio: 6, color: 3, bit: 5 },
        { mode: 3, gpio: 5, color: 3, bit: 4 },
        { mode: 3, gpio: 4, color: 3, bit: 3 }
    ], [
        { mode: 4, gpio: 27, color: null, bit: null },
        { mode: 4, gpio: 26, color: null, bit: null },
        { mode: 4, gpio: 25, color: 1, bit: 7 },
        { mode: 4, gpio: 24, color: 1, bit: 6 },
        { mode: 4, gpio: 23, color: 1, bit: 5 },
        { mode: 4, gpio: 22, color: 1, bit: 4 },
        { mode: 4, gpio: 21, color: 1, bit: 3 },
        { mode: 4, gpio: 20, color: null, bit: null },
        { mode: 4, gpio: 19, color: null, bit: null },
        { mode: 4, gpio: 18, color: null, bit: null },
        { mode: 4, gpio: 17, color: 2, bit: 7 },
        { mode: 4, gpio: 16, color: 2, bit: 6 },
        { mode: 4, gpio: 15, color: 2, bit: 5 },
        { mode: 4, gpio: 14, color: 2, bit: 4 },
        { mode: 4, gpio: 13, color: 2, bit: 3 },
        { mode: 4, gpio: 12, color: 2, bit: 2 },
        { mode: 4, gpio: 11, color: null, bit: null },
        { mode: 4, gpio: 10, color: null, bit: null },
        { mode: 4, gpio: 9, color: 3, bit: 7 },
        { mode: 4, gpio: 8, color: 3, bit: 6 },
        { mode: 4, gpio: 7, color: 3, bit: 5 },
        { mode: 4, gpio: 6, color: 3, bit: 4 },
        { mode: 4, gpio: 5, color: 3, bit: 3 },
        { mode: 4, gpio: 4, color: null, bit: null }
    ], [
        { mode: 5, gpio: 27, color: null, bit: null },
        { mode: 5, gpio: 26, color: null, bit: null },
        { mode: 5, gpio: 25, color: null, bit: null },
        { mode: 5, gpio: 24, color: null, bit: null },
        { mode: 5, gpio: 23, color: null, bit: null },
        { mode: 5, gpio: 22, color: null, bit: null },
        { mode: 5, gpio: 21, color: 1, bit: 7 },
        { mode: 5, gpio: 20, color: 1, bit: 6 },
        { mode: 5, gpio: 19, color: 1, bit: 5 },
        { mode: 5, gpio: 18, color: 1, bit: 4 },
        { mode: 5, gpio: 17, color: 1, bit: 3 },
        { mode: 5, gpio: 16, color: 1, bit: 2 },
        { mode: 5, gpio: 15, color: 2, bit: 7 },
        { mode: 5, gpio: 14, color: 2, bit: 6 },
        { mode: 5, gpio: 13, color: 2, bit: 5 },
        { mode: 5, gpio: 12, color: 2, bit: 4 },
        { mode: 5, gpio: 11, color: 2, bit: 3 },
        { mode: 5, gpio: 10, color: 2, bit: 2 },
        { mode: 5, gpio: 9, color: 3, bit: 7 },
        { mode: 5, gpio: 8, color: 3, bit: 6 },
        { mode: 5, gpio: 7, color: 3, bit: 5 },
        { mode: 5, gpio: 6, color: 3, bit: 4 },
        { mode: 5, gpio: 5, color: 3, bit: 3 },
        { mode: 5, gpio: 4, color: 3, bit: 2 }
    ], [
        { mode: 6, gpio: 27, color: null, bit: null },
        { mode: 6, gpio: 26, color: null, bit: null },
        { mode: 6, gpio: 25, color: 1, bit: 7 },
        { mode: 6, gpio: 24, color: 1, bit: 6 },
        { mode: 6, gpio: 23, color: 1, bit: 5 },
        { mode: 6, gpio: 22, color: 1, bit: 4 },
        { mode: 6, gpio: 21, color: 1, bit: 3 },
        { mode: 6, gpio: 20, color: 1, bit: 2 },
        { mode: 6, gpio: 19, color: null, bit: null },
        { mode: 6, gpio: 18, color: null, bit: null },
        { mode: 6, gpio: 17, color: 2, bit: 7 },
        { mode: 6, gpio: 16, color: 2, bit: 6 },
        { mode: 6, gpio: 15, color: 2, bit: 5 },
        { mode: 6, gpio: 14, color: 2, bit: 4 },
        { mode: 6, gpio: 13, color: 2, bit: 3 },
        { mode: 6, gpio: 12, color: 2, bit: 2 },
        { mode: 6, gpio: 11, color: null, bit: null },
        { mode: 6, gpio: 10, color: null, bit: null },
        { mode: 6, gpio: 9, color: 3, bit: 7 },
        { mode: 6, gpio: 8, color: 3, bit: 6 },
        { mode: 6, gpio: 7, color: 3, bit: 5 },
        { mode: 6, gpio: 6, color: 3, bit: 4 },
        { mode: 6, gpio: 5, color: 3, bit: 3 },
        { mode: 6, gpio: 4, color: 3, bit: 2 }
    ], [
        { mode: 7, gpio: 27, color: 1, bit: 7 },
        { mode: 7, gpio: 26, color: 1, bit: 6 },
        { mode: 7, gpio: 25, color: 1, bit: 5 },
        { mode: 7, gpio: 24, color: 1, bit: 4 },
        { mode: 7, gpio: 23, color: 1, bit: 3 },
        { mode: 7, gpio: 22, color: 1, bit: 2 },
        { mode: 7, gpio: 21, color: 1, bit: 1 },
        { mode: 7, gpio: 20, color: 1, bit: 0 },
        { mode: 7, gpio: 19, color: 2, bit: 7 },
        { mode: 7, gpio: 18, color: 2, bit: 6 },
        { mode: 7, gpio: 17, color: 2, bit: 5 },
        { mode: 7, gpio: 16, color: 2, bit: 4 },
        { mode: 7, gpio: 15, color: 2, bit: 3 },
        { mode: 7, gpio: 14, color: 2, bit: 2 },
        { mode: 7, gpio: 13, color: 2, bit: 1 },
        { mode: 7, gpio: 12, color: 2, bit: 0 },
        { mode: 7, gpio: 11, color: 3, bit: 7 },
        { mode: 7, gpio: 10, color: 3, bit: 6 },
        { mode: 7, gpio: 9, color: 3, bit: 5 },
        { mode: 7, gpio: 8, color: 3, bit: 4 },
        { mode: 7, gpio: 7, color: 3, bit: 3 },
        { mode: 7, gpio: 6, color: 3, bit: 2 },
        { mode: 7, gpio: 5, color: 3, bit: 1 },
        { mode: 7, gpio: 4, color: 3, bit: 0 }
    ]
];

const CONFIG_IDS = [
    {name: "i2c_arm", elementId: "other_i2c"},
    {name: "spi", elementId: "other_spi"},
    {name: "dtoverlay", elementId: "other_overlay"},
    {name: "overscan_left", elementId: "other_overscan_left"},
    {name: "overscan_right", elementId: "other_overscan_right"},
    {name: "overscan_top", elementId: "other_overscan_top"},
    {name: "overscan_bottom", elementId: "other_overscan_bottom"},
    {name: "framebuffer_width", elementId: "other_framebuffer_width"},
    {name: "framebuffer_height", elementId: "other_framebuffer_height"},
    {name: "enable_dpi_lcd", elementId: ""},
    {name: "display_default_lcd", elementId: ""},
    {name: "dpi_group", elementId: "other_dpi_group"},
    {name: "dpi_mode", elementId: "other_dpi_mode"},
    {name: "dpi_output_format", elementId: "dpi_output_format_hex"},
    {name: "dpi_timings", elementId: ""},
];

const DPI_FORM_INFO = [
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

const OTHER_FORM_INFO_0 = {
    interface_id: "other_interface",
    i2c_id: "other_i2c",
    spi_id: "other_spi",
    overlay_id: "other_overlay",
    overscan_left_id: "other_overscan_left",
    overscan_right_id: "other_overscan_right",
    overscan_top_id: "other_overscan_top",
    framebuffer_width_id: "other_framebuffer_width",
    framebuffer_height_id: "other_framebuffer_height",
    dpi_group_id: "other_dpi_group",
    dpi_mode_id: "other_dpi_mode",
};

const OTHER_FORM_INFO = [
    "interface",
    "i2c",
    "spi",
    "overlay",
    "overscan_left",
    "overscan_right",
    "overscan_top",
    "overscan_bottom",
    "framebuffer_width",
    "framebuffer_height",
    "dpi_group",
    "dpi_mode",
];

const DATA_CONFIG_TXT_KEY = "config.txt";
let DATA_CONFIG = {};

function getSheetInformation() {
    if (localStorage.getItem(DATA_CONFIG_TXT_KEY) === null)
        return;

    DATA_CONFIG = JSON.parse(localStorage.getItem(DATA_CONFIG_TXT_KEY));

    if (DATA_CONFIG.dpi_output_format_dec)
    DATA_CONFIG.dpi_output_format_dec = parseInt(DATA_CONFIG.dpi_output_format_dec);

    for(const item of OTHER_FORM_INFO) {
        let elem = document.getElementById("other_" + item);

        if(elem) {
            elem.value = DATA_CONFIG[item];
        }
    }
}

function saveSheetInformation() {
    for(const item of OTHER_FORM_INFO) {
        let elem = document.getElementById("other_" + item);

        if(elem) {
            DATA_CONFIG[item] = elem.value;
        }
    }

    localStorage.setItem(DATA_CONFIG_TXT_KEY, JSON.stringify(DATA_CONFIG));
}
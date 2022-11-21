/*************************************************************************/
/******************************* WORKSHEET *******************************/
/*************************** dpi_output_format ***************************/
/*************************************************************************/
function dpiUpdateSubValue_Shift_0_Test() {
    // Test setting 24 bits
    for (let i = 0; i < 24; i++) {
        DATA_CONFIG.dpi_output_format_dec = 0xffffff;

        dpiFormUpdateFromSubValue(0, 1, i);
        const expected = 0xffffff - Math.pow(2, i);
        console.debug(`dpiFormUpdateFromSubValue(0, 1, ${i}) -> ${DATA_CONFIG.dpi_output_format_dec}`);
        const result = DATA_CONFIG.dpi_output_format_dec;
        console.assert(DATA_CONFIG.dpi_output_format_dec == expected, "%o", { result, expected });
    }
}

function dpiUpdateSubValue_Shift_1_Test() {
    // Test setting 24 bits
    for (let i = 0; i < 24; i++) {
        DATA_CONFIG.dpi_output_format_dec = 0;

        dpiFormUpdateFromSubValue(1, 1, i);
        const expected = Math.pow(2, i);
        console.debug(`dpiFormUpdateFromSubValue(1, 1, ${i}) -> ${DATA_CONFIG.dpi_output_format_dec}`);
        const result = DATA_CONFIG.dpi_output_format_dec;
        console.assert(DATA_CONFIG.dpi_output_format_dec == expected, "%o", { result, expected });
    }
}

const TEXT_IS_VALID_TEST_SET = [
    { val: "22", min: 0, max: 67, expected: true },
    { val: "107", min: 0, max: 67, expected: false },
    { val: "22a", min: 0, max: 67, expected: false },
    { val: "a22", min: 0, max: 67, expected: false },
    { val: "apple", min: 0, max: 67, expected: false },
    { val: "-12", min: 0, max: 67, expected: false },
    { val: "0", min: 0, max: 67, expected: true },
    { val: "67", min: 0, max: 67, expected: true },
    { val: "-12", min: -100, max: 100, expected: true },
];

function formTextIsValidInt_Test_0() {
    // Test with data set
    for (const test_item of TEXT_IS_VALID_TEST_SET) {

        const result = formTextIsValidInt(test_item.val, test_item.min, test_item.max);
        const expected = test_item.expected;
        console.debug(`formTextIsValidInt(${test_item.val}, ${test_item.min}, ${test_item.max}) -> ${result}`);
        console.assert(result == expected, "%o", { result, expected });
    }
}


/*************************************************************************/
/******************************* RUN TESTS *******************************/
/*************************************************************************/
function runTests() {
    console.group("dpiUpdateSubValue_Shift_1_Test()");
    dpiUpdateSubValue_Shift_1_Test();
    console.groupEnd();

    console.group("dpiUpdateSubValue_Shift_0_Test()");
    dpiUpdateSubValue_Shift_0_Test();
    console.groupEnd();

    console.group("formTextIsValidInt_Test_0()");
    formTextIsValidInt_Test_0();
    console.groupEnd();

    // Reset the form
    loadSavedData();
}
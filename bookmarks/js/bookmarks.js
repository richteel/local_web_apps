let isSwiping = false;

/*************************************************************************/
/******************************* BOOKMARKS *******************************/
/*************************************************************************/
let bookmarks_container, bookmarks_command_menu;
let bookmark_selected = null;

function bookmarksInit(bookmarks_container_id, bookmarks_command_menu_id) {
    bookmarks_container = document.getElementById(bookmarks_container_id);
    bookmarks_command_menu = document.getElementById(bookmarks_command_menu_id);

    if (!bookmarks_container || !bookmarks_command_menu) {
        console.error("ERROR: bookmarksInit - Failed to find one of the bookmarks containers");
        return false;
    }

    for (const item of bookmarks_command_menu.getElementsByTagName("button")) {
        item.addEventListener("click", function (e) {
            commandButtonClicked(e);
        });
        // TODO: Need to know which bookmark
    }

    CONTEXT_MENUS.push(bookmarks_command_menu);

    return true;
}

function dataBookmarkDelete(bookmark_id) {
    if (!bookmark_id) {
        console.error(`ERROR: dataBookmarkDelete - The bookmark_id parameter value is missing.`);
        return false;
    }
    const index = data_bookmarks.map(obj => obj.id).indexOf(bookmark_id);

    if (index < 0) {
        console.error(`ERROR: dataBookmarkDelete - Failed to find id in array of bookmarks. id -> ${bookmark_id}`);
        return false;
    }

    for (let i = data_bookmarks.length - 1; i > -1; i--) {
        if (data_bookmarks[i].parent_id == bookmark_id) {
            data_bookmarks.splice(i, 1);
        }
    }

    data_bookmarks.splice(index, 1);
    localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));

    return true;
}

function bookmarksDisplayItems(tab_id, parent_elem, parent_id = "") {
    if (!parent_elem) {
        bookmarks_container.replaceChildren();
        parent_elem = bookmarks_container;
    }

    if (!parent_elem) {
        messageShow("Unknown error while displaying bookmarks", MESSAGE_ERROR);
        return false;
    }

    if (!data_bookmarks) {
        messageShow("No bookmarks data found", MESSAGE_WARNING);
        return false;
    }

    let parent_elem_ul;

    /*
        <li draggable="true" id="bookmark_10">
            <div class="bookmark_outer">
                <div class="bookmark_inner">
                    <a class="bookmark_link" href="http://10.140.1.32/" target="_blank">Hub/Switch1</a>
                    <br>
                    <span class="bookmark_note">T1600G-28PS - JetStream 24-Port Gigabit Smart PoE+ Switch with 4 SFP Slots</span>
                </div>
                <button type="button" class="bookmark_button">…</button>
            </div>
        </li>
    */
    for (const bookmark of data_bookmarks) {
        if (!bookmark.title || bookmark.tab_id != tab_id)
            continue;

        if (parent_id && bookmark.parent_id != parent_id)
            continue;

        if (!parent_id && bookmark.parent_id)
            continue;

        // Create items to display the bookmark
        const bm_li = document.createElement("li");
        const bm_div_outer = document.createElement("div");
        const bm_div_inner = document.createElement("div");
        const bm_link = document.createElement("a");
        const bm_break = document.createElement("br");
        const bm_span_note = document.createElement("span");
        const bm_button = document.createElement("button");

        // bm_elem_outer > bm_li
        bm_li.draggable = true;
        bm_li.id = bookmark.id;

        bm_li.addEventListener("dragstart", bookmarkDrag);
        bm_li.addEventListener("drop", bookmarkDrop);
        bm_li.addEventListener("dragover", bookmarkAllowDrop);

        bm_li.addEventListener("click", function (e) {
            e.stopPropagation();
            if (e.target.getElementsByTagName('a').length > 0) {
                e.target.getElementsByTagName('a')[0].click();
            }
        });

        bm_div_outer.className = "bookmark_outer";

        // bm_elem > bm_div_inner
        bm_div_inner.className = "bookmark_inner";

        // bm_anchor > bm_link
        bm_link.className = "bookmark_link";

        // note_span > bm_span_note
        bm_span_note.className = "bookmark_note";

        bm_button.type = "button";
        bm_button.textContent = "…";
        bm_button.className = "bookmark_button";
        bm_button.addEventListener("click", function (e) {
            e.stopPropagation();

            bookmark_selected = e.target.closest("li");
            contextMenuShow(bookmarks_command_menu, { X: e.pageX, Y: e.pageY })
        });

        // Append bookmark elements to the document

        // - Add link and notes to inner div
        if (bookmark.url) {
            bm_link.textContent = bookmark.title;
            bm_link.href = bookmark.url;
            bm_link.target = bookmark.target;
            bm_div_inner.appendChild(bm_link);
        }
        else {
            bm_div_inner.textContent = bookmark.title;
        }
        if (bookmark.note) {
            // bm_span_note.textContent = bookmark.note;
            bm_span_note.innerHTML = bookmark.note;
            bm_div_inner.appendChild(bm_break);
            bm_div_inner.appendChild(bm_span_note);
        }

        // - Add inner & button to outer
        bm_div_outer.appendChild(bm_div_inner);
        bm_div_outer.appendChild(bm_button);

        // - Add items to li
        bm_li.appendChild(bm_div_outer);
        // - Add items to ul
        if (parent_elem.tagName == "UL") {
            parent_elem.appendChild(bm_li);
        }
        else {
            if (!parent_elem_ul) {
                parent_elem_ul = document.createElement("ul");
                parent_elem.appendChild(parent_elem_ul);
            }

            parent_elem_ul.appendChild(bm_li);
        }
        bookmarksDisplayItems(tab_id, bm_li, bookmark.id);
    }
}

// https://www.w3schools.com/html/tryit.asp?filename=tryhtml5_draganddrop

function bookmarkAllowDrop(e) {
    e.preventDefault();
}

function bookmarkDrag(e) {
    e.dataTransfer.setData("target_id", e.target.id);
}

function bookmarkDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const data = e.dataTransfer.getData("target_id");
    const target_li_id = e.target.closest("li").id;
    if (data && target_li_id) {
        const dropped_item = dataFindItemsById(data_bookmarks, data)[0];
        const target_item = dataFindItemsById(data_bookmarks, target_li_id)[0];

        if (dropped_item && target_item) {
            if (dropped_item.parent_id == target_item.parent_id) {
                console.info("bookmarkDrop - Reorder")
                const dropped_index = data_bookmarks.map(obj => obj.id).indexOf(dropped_item.id);
                const target_index = data_bookmarks.map(obj => obj.id).indexOf(target_item.id);

                // Swaps position, which is not what we want
                // data_bookmarks[dropped_index], data_bookmarks[target_index]] = [data_bookmarks[target_index], data_bookmarks[dropped_index]];
                const move_item = data_bookmarks.splice(dropped_index, 1)[0];
                data_bookmarks.splice(target_index, 0, move_item);
            }
            else {
                console.info("bookmarkDrop - Change Parent");
                dropped_item.parent_id = target_item.parent_id;
            }

            localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));
            dataLoad();
            uiUpdate();
        }
    }
}

function bookmarksSelectedbookmarkChanged() {
    // Update bookmarks context menu
    const disable_selected_items = !bookmark_selected;

    for (const item of bookmarks_command_menu.getElementsByTagName("button")) {
        item.disabled = false;
        if (!bookmark_selected && (item.textContent.toUpperCase().includes("SELECTED") || item.textContent.toUpperCase().includes("BOOKMARK"))) {
            item.disabled = disable_selected_items;
        }
    }

    // Update bookmark styles
    for (const bookmark of bookmark_items.getElementsByTagName("li")) {
        bookmark.classList.remove("selected");
        if (bookmark_selected && bookmark.id == bookmark_selected.id) {
            bookmark.classList.add("selected");
        }
    }
}

function searchBookmarks() {
    if (search_text.value.length == 0) {
        search_results.style.display = "none";
        return;
    }
    // Clear all results
    while (search_results.firstChild) {
        search_results.removeChild(search_results.firstChild);
    }

    let result_count = 0;

    const searchQuery = search_text.value.toLowerCase();
    const dataBookmarks = JSON.parse(localStorage.getItem('bookmarks')); // Assuming your JSON is stored under "bookmarkData"
    const dataTabs = JSON.parse(localStorage.getItem('tabs')); // Assuming your JSON is stored under "bookmarkData"
    const tabsMap = new Map(dataTabs.map(tab => [tab.id, tab.title]));

    // Filter bookmarks based on search query
    const filteredBookmarks = dataBookmarks.filter(bookmark =>
        bookmark.title.toLowerCase().includes(searchQuery) ||
        bookmark.note.toLowerCase().includes(searchQuery)
    );
    result_count = filteredBookmarks.length;

    if (result_count > 0) {
        // Show result count
        const resultCountP = document.createElement("p");
        resultCountP.textContent = `${result_count} results found`;
        resultCountP.style.fontStyle = "italic";
        search_results.appendChild(resultCountP);

        // Group bookmarks by tab
        const groupedResults = new Map();
        filteredBookmarks.forEach(bookmark => {
            if (!groupedResults.has(bookmark.tab_id)) {
                groupedResults.set(bookmark.tab_id, []);
            }
            groupedResults.get(bookmark.tab_id).push(bookmark);
        });

        // Render grouped results in the order of dataTabs
        dataTabs.forEach(tab => {
            if (groupedResults.has(tab.id)) {
                const tabTitle = tab.title || 'Unknown Tab';
                const tabSection = document.createElement('div');
                tabSection.innerHTML = `<h3>${tabTitle}</h3>`;

                const ul = document.createElement('ul');
                groupedResults.get(tab.id).forEach(bookmark => {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="${bookmark.url}" target="${bookmark.target}">${bookmark.title}</a>`;
                    if (bookmark.note.length > 0) {
                        li.innerHTML += `<br><span class="bookmark_note">${bookmark.note}</span>`;
                    }
                    ul.appendChild(li);
                });

                tabSection.appendChild(ul);
                search_results.appendChild(tabSection);
            }
        });
    }

    // Show no results message
    if (result_count == 0) {
        const no_results = document.createElement("p");
        no_results.textContent = NO_SEARCH_RESULTS;
        no_results.style.fontStyle = "italic";
        search_results.appendChild(no_results);
    }

    search_results.style.display = "block";
}


/*************************************************************************/
/**************************** COMMAND BUTTONS ****************************/
/*************************************************************************/
function commandButtonClicked(e) {
    if (!e || !e.target || !e.target.getAttribute("command")) {
        console.warn("WARNING: commandButtonClicked - Event, target, or command not passed or set");
        return;
    }

    const command = e.target.getAttribute("command").toLowerCase();
    const selectedId = tab_selected && tab_selected.id ? tab_selected.id : "";
    const selectedTitle = tab_selected ? tab_selected.textContent : "N/A";

    switch (command) {
        case "bookmark_add":
            dialogsShowEditBookmark("");
            break;
        case "bookmark_add_child":
            dialogsShowEditBookmark("", bookmark_selected.id);
            break;
        case "bookmark_add_sibling":
            const parent_id = dataFindItemsById(data_bookmarks, bookmark_selected.id)[0].parent_id;
            dialogsShowEditBookmark("", parent_id);
            break;
        case "bookmark_delete":
            const bookmark = dataFindItemsById(data_bookmarks, bookmark_selected.id)[0];
            const prompt_bookmark = `Are you sure you want to delete the "${bookmark.title}" bookmark and child bookmarks?`;
            if (confirm(prompt_bookmark) == true) {
                if (dataBookmarkDelete(bookmark_selected.id)) {
                    bookmark_selected = null;
                    dataLoad();
                    uiUpdate();
                }
            }
            break;
        case "bookmark_edit":
            dialogsShowEditBookmark(bookmark_selected.id);
            break;
        case "clear":
            dataClear();
            break;
        case "export":
            dataExport();
            break;
        case "import":
            // Use setTimeout to clear the context menu when displaying the prompt.
            // The click event needs to complete first.
            setTimeout(dataImport, 10);
            break;
        case "tab_add":
            dialogsShowEditTab("");
            break;
        case "tab_move_left":
            if (dataTabMove(selectedId, -1)) {
                dataLoad();
                uiUpdate();
            }
            break;
        case "tab_move_right":
            if (dataTabMove(selectedId, 1)) {
                dataLoad();
                uiUpdate();
            }
            break;
        case "tab_remove":
            const prompt = `Are you sure you want to delete the ${selectedTitle} tab and associated bookmarks?`;
            if (confirm(prompt) == true) {
                if (dataTabDelete(selectedId)) {
                    tab_selected = null;
                    dataLoad();
                    uiUpdate();
                }
            }
            break;
        case "tab_rename":
            dialogsShowEditTab(selectedId);
            break;
        default:
            console.info(`INFO: commandButtonClicked - Command -> ${command} not handled`);
            break;
    }

}

/*************************************************************************/
/***************************** CONTEXT MENUS *****************************/
/*************************************************************************/
const CONTEXT_MENUS = [];

function contextMenusHide() {
    for (menu of CONTEXT_MENUS) {
        menu.style.display = "none";
    }
}

function contextMenuShow(menu, pos) {
    contextMenusHide();
    menu.style.display = "block";

    let menu_left = pos.X;
    let menu_top = pos.Y;

    if (menu_left + menu.offsetWidth > document.body.clientWidth)
        menu_left = document.body.clientWidth - menu.offsetWidth - 20;
    if (menu_left < 0)
        menu_left = 0;

    if (menu_top + menu.offsetHeight > document.body.clientHeight)
        menu_top = document.body.clientHeight - menu.offsetHeight - 20;
    if (menu_top < 0)
        menu_top = 0;

    menu.style.left = menu_left + "px";
    menu.style.top = menu_top + "px";
}


/*************************************************************************/
/********************************* DATA **********************************/
/*************************************************************************/
const DATA_BOOKMARKS_KEY = "bookmarks";
const DATA_TABS_KEY = "tabs";
let data_tabs = [];
let data_bookmarks = [];
let data_last_tab_id = 0;
let data_last_bookmark_id = 0;

function convertLineBreaks(text) {
    return text.replace(/\n/g, '\n'); // Replaces \n with actual line breaks
}

function dataInit() {
    if (typeof (Storage) === "undefined") {
        console.error("ERROR: dataInit - Local storage is not supported");
        return false;
    }

    console.info("Using local storage");
    return true;
}

function dataBookmarkDeleteAllForTab(tab_id) {
    if (!tab_id) {
        console.error(`ERROR: dataBookmarkDeleteAllForTab - The tab_id parameter value is missing.`);
        return false;
    }

    for (let i = data_bookmarks.length - 1; i > -1; i--) {
        if (data_bookmarks[i].tab_id == tab_id) {
            data_bookmarks.splice(i, 1);
        }
    }

    localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));

    return true;
}

function dataBookmarkSave(bookmark_id, bookmark_tab_id, bookmark_parent_id, bookmark_title, bookmark_url, bookmark_target, bookmark_note) {
    if (!bookmark_title || !bookmark_tab_id) {
        console.error(`ERROR: dataBookmarkSave - Called without bookmark title or tab id`);
        return false;
    }

    const bookmarks_with_titles = dataFindItemsByTitleAndTabId(data_bookmarks, bookmark_title, bookmark_tab_id);
    const bookmarks_with_ids = dataFindItemsById(data_bookmarks, bookmark_id);

    /*
    if (bookmarks_with_titles && bookmarks_with_titles.length > 0 && !(bookmarks_with_titles.length == 1 && bookmarks_with_titles[0].id == bookmark_id)) {
        console.error(`ERROR: dataBookmarkSave - Attempted to save duplicate bookmark title -> ${bookmark_title}`);
        console.dir(bookmarks_with_titles);
        return false;
    }
    */

    if (!bookmark_id) {
        data_last_bookmark_id++;
        const newBookmark = {
            id: `bookmark_${data_last_bookmark_id}`,
            tab_id: bookmark_tab_id,
            parent_id: bookmark_parent_id,
            title: bookmark_title,
            url: bookmark_url,
            target: bookmark_target,
            note: bookmark_note
        };
        data_bookmarks.push(newBookmark);
        localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));
        console.info(`Added Bookmark ${newBookmark}`, newBookmark);
        return true;
    }
    else {
        if (!bookmarks_with_ids || bookmarks_with_ids.length != 1) {
            console.error(`ERROR: dataBookmarkSave - Saving bookmark failed. Zero or more than one bookmark found with id -> ${bookmark_id}`);
            console.dir(bookmarks_with_ids);
            return false;
        }

        let saved = false;
        let data_changed = false;
        for (const bookmark of data_bookmarks) {
            if (bookmark.id == bookmark_id) {
                bookmark.tab_id = bookmark_tab_id;
                bookmark.parent_id = bookmark_parent_id;
                bookmark.title = bookmark_title;
                bookmark.url = bookmark_url;
                bookmark.target = bookmark_target;
                bookmark.note = bookmark_note;
                data_changed = true;
            }
            else if (bookmark.parent_id == bookmark_id) {
                if (bookmark.tab_id != bookmark_tab_id) {
                    bookmark.tab_id = bookmark_tab_id;
                    data_changed = true;
                }
            }
        }

        if (data_changed) {
            localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));
            saved = true;
        }

        if (saved) {
            console.info(`Saved Bookmark {id: ${bookmark_id > 0 ? bookmark_id : data_last_bookmark_id}, title: "${bookmark_title}}"`);
        }
        else {
            console.error(`ERROR: dataBookmarkSave - Unknown error saving bookmark. id -> ${bookmark_id}, title -> ${bookmark_title}`);
        }

        return saved;
    }
}

function dataClear() {
    const hasItems = data_tabs.length > 0 || data_bookmarks.length > 0;
    const prompt_clear = `Delete the existing tabs and bookmarks. Are you sure?`;

    if (hasItems) {
        if (confirm(prompt_clear) == false)
            return;
    }
    localStorage.clear();

    dataLoad();
    uiUpdate();
}

function dataExport() {
    // Create an object to store properly parsed key-value pairs
    const parsedData = {};

    // Iterate over all keys in localStorage
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            try {
                // Try to parse the value as JSON
                parsedData[key] = JSON.parse(localStorage[key]);
            } catch (e) {
                // If parsing fails, store the raw value
                parsedData[key] = localStorage[key];
            }
        }
    }

    // Convert the parsed data to a clean JSON string
    const localStorageCopy = JSON.stringify(parsedData, null, 4); // Add indentation for readability
    const a = document.createElement('a');
    const file = new Blob([localStorageCopy], { type: "application/json" });

    a.href = URL.createObjectURL(file);
    a.download = "bookmarks.json";
    a.click();
    URL.revokeObjectURL(a.href);
}

function dataImport() {
    const hasItems = data_tabs.length > 0 || data_bookmarks.length > 0;
    const prompt_import = `Importing data will delete the existing tabs and bookmarks. Are you sure you want to replace your bookmarks?`;

    if (hasItems) {
        if (confirm(prompt_import) == false)
            return;
    }

    const inputFile = document.createElement('input');
    inputFile.type = "file";
    inputFile.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const contents = e.target.result;
            let data;

            try {
                data = JSON.parse(contents);

                // Check if the data is in the new format
                for (const key of Object.keys(data)) {
                    // Handle new format (values are objects or arrays)
                    if (typeof data[key] === "object" && data[key] !== null) {
                        console.log("Importing new format data", MESSAGE_WARNING);
                        // Always stringify the value for localStorage
                        localStorage.setItem(key, convertLineBreaks(JSON.stringify(data[key])));
                    } else {
                        console.log("Importing old format data", MESSAGE_WARNING);
                        // Old format (values are already strings)
                        localStorage.setItem(key, data[key]);
                    }
                }
            } catch (err) {
                console.error("Failed to parse JSON:", err);
                alert("Error importing data: Invalid JSON format.");
                return;
            }

            tab_selected = null;
            bookmark_selected = null;
            dataLoad();
            uiUpdate();
        };
        reader.readAsText(file);
    });
    inputFile.click();
}

function dataFindItemsById(items, item_id) {
    let found;

    if (items && items.length > 0) {
        found = items.filter(obj => {
            return obj.id === item_id;
        });
    }

    return found;
}

function dataFindItemsByTitle(items, item_title) {
    let found;

    if (items && items.length > 0) {
        found = items.filter(obj => {
            return obj.title === item_title;
        });
    }

    return found;
}

function dataFindItemsByTitleAndTabId(items, item_title, item_tab_id) {
    let found;

    if (items && items.length > 0) {
        found = items.filter(obj => {
            return obj.title === item_title && obj.tab_id == item_tab_id;
        });
    }

    return found;
}

function dataGetLastNumbericId(items) {
    const regex = /(?<=[a-z]_)[0-9]+/gm;
    const ids = [];

    for (const item of items) {
        if (!item.id)
            continue;

        const found = item.id.match(regex);

        if (found.length == 1 && Number(found[0]) !== NaN) {
            ids.push(found[0]);
        }
    }

    if (ids.length == 0) {
        return 0;
    }

    return Math.max(...ids);
}

function dataLoad() {
    data_tabs = JSON.parse(localStorage.getItem(DATA_TABS_KEY));
    data_bookmarks = JSON.parse(localStorage.getItem(DATA_BOOKMARKS_KEY));

    if (!data_tabs || data_tabs.length == 0) {
        data_last_tab_id = 0;
        data_tabs = [];
    }
    else {
        data_last_tab_id = dataGetLastNumbericId(data_tabs);
    }

    console.info("dataLoad - data_last_tab_id ->", data_last_tab_id);

    if (!data_bookmarks || data_bookmarks.length == 0) {
        data_last_bookmark_id = 0;
        data_bookmarks = [];
    }
    else {
        data_last_bookmark_id = dataGetLastNumbericId(data_bookmarks);
    }
    console.info("dataLoad - data_last_bookmark_id ->", data_last_bookmark_id);
}

function dataTabDelete(tab_id) {
    if (!tab_id) {
        console.error(`ERROR: dataTabDelete - The tab_id parameter value is missing.`);
        return false;
    }
    const index = data_tabs.map(obj => obj.id).indexOf(tab_id);

    if (index < 0) {
        console.error(`ERROR: dataTabDelete - Failed to find id in array of tabs. id -> ${tab_id}`);
        return false;
    }

    if (!dataBookmarkDeleteAllForTab(tab_id)) {
        return false;
    }

    data_tabs.splice(index, 1);
    localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));

    return true;
}

function dataTabMove(tab_id, increment) {
    if (!tab_id || !increment) {
        console.error(`ERROR: dataTabMove - One or more parameter values are missing.`);
        return false;
    }

    const index = data_tabs.map(obj => obj.id).indexOf(tab_id);

    if (index < 0) {
        console.error(`ERROR: dataTabMove - Failed to find id in array of tabs. id -> ${tab_id}`);
        return false;
    }
    const newIndex = index + increment;

    if (newIndex < 0 || newIndex > data_tabs.length - 1) {
        console.error(`ERROR: dataTabMove - New index outside bounds of array. newIndex -> ${newIndex}`);
        return false;
    }

    data_tabs.splice(newIndex, 0, data_tabs.splice(index, 1)[0]);
    localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));

    return true;
}

function dataTabSave(tab_id, tab_title) {
    if (!tab_title || tab_title.length == 0) {
        console.error(`ERROR: dataTabSave - Called without tab title`);
        return false;
    }

    const tabs_with_titles = dataFindItemsByTitle(data_tabs, tab_title);
    const tabs_with_ids = dataFindItemsById(data_tabs, tab_id);

    if (tabs_with_titles && tabs_with_titles.length > 0 && !(tabs_with_titles.length == 1 && tabs_with_titles[0].id == tab_id)) {
        console.error(`ERROR: dataTabSave - Attempted to save duplicate tab title -> ${tab_title}`);
        console.dir(tabs_with_titles);
        return false;
    }

    if (!tab_id) {
        data_last_tab_id++;
        const newTab = {
            id: `tab_${data_last_tab_id}`,
            title: tab_title
        };
        data_tabs.push(newTab);
        localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));
        console.info(`Added Tab ${newTab}`);
        return true;
    }
    else {
        if (!tabs_with_ids || tabs_with_ids.length != 1) {
            console.error(`ERROR: dataTabSave - Saving tab failed. Zero or more than one tab found with id -> ${tab_id}`);
            console.dir(tabs_with_ids);
            return false;
        }

        let saved = false;
        for (const tab of data_tabs) {
            if (tab.id == tab_id) {
                tab.title = tab_title;
                localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));
                saved = true;
                break;
            }
        }

        if (saved) {
            console.info(`Saved Tab {id: ${tab_id > 0 ? tab_id : data_last_tab_id}, title: "${tab_title}}"`);
        }
        else {
            console.error(`ERROR: dataTabSave - Unknown error saving tab. id -> ${tab_id}, title -> ${tab_title}`);
        }

        return saved;
    }
}

/*************************************************************************/
/******************************** DIALOGS ********************************/
/*************************************************************************/
const DIALOG_OVERLAY = document.getElementById("dialog_overlay");
const DIALOG_TAB = document.getElementById("dialog_tab_edit");
const DIALOG_BOOKMARK = document.getElementById("dialog_bookmark_edit");

const DIALOGS = [DIALOG_TAB, DIALOG_BOOKMARK];

function dialogsInit() {
    if (typeof myDragMove === "undefined" || !myDragMove) {
        console.log("myDragMove script not loaded yet - come back in 0.1 seconds");
        setTimeout(function () { dialogsInit(); }, 100);
        return;
    }

    for (const dialog of DIALOGS) {
        dialog.addEventListener("mousedown", function (e) {
            console.log("mousedown - startMoving");
            console.dir(e.target.type);
            const eTagName = e.target.tagName.toUpperCase();
            if (eTagName == "INPUT" || eTagName == "SELECT" || eTagName == "BUTTON" || eTagName == "TEXTAREA" || eTagName == "A" || eTagName == "LABEL")
                return;
            myDragMove.startMoving(this, "dialog_overlay", e);
        });
        dialog.addEventListener("mouseup", function (e) {
            myDragMove.stopMoving("dialog_overlay");
        });
    }
}

function dialogBookmarkParentListChanged() {
    const parentList_elem = document.getElementById("dialog_bookmark_edit_parent");
    const parentId_elem = document.getElementById("dialog_bookmark_parent_id");

    parentId_elem.value = parentList_elem.value;
    console.log(`Bookmark Parent changed to ${parentId_elem.value} / ${parentList_elem.options[parentList_elem.selectedIndex].text}`);
}

function dialogBookmarkPopulateParentList() {
    const tabsList_elem = document.getElementById("dialog_bookmark_edit_tab");
    const tabId_elem = document.getElementById("dialog_bookmark_tab_id");
    const parentList_elem = document.getElementById("dialog_bookmark_edit_parent");
    const parentId_elem = document.getElementById("dialog_bookmark_parent_id");

    if (!tabsList_elem || !tabId_elem || !parentList_elem || !parentId_elem) {
        console.error("ERROR: dialogBookmarkPopulateParentList - Did not find required elements");
        return;
    }

    while (parentList_elem.firstChild) {
        parentList_elem.firstChild.remove()
    }

    var opt = document.createElement('option');
    opt.value = "";
    opt.textContent = "<None/Root>";
    if (parentId_elem.value == "") {
        opt.selected = true;
    }
    parentList_elem.appendChild(opt);

    dialogBookmarkPopulateParentListRecursive(parentList_elem, tabId_elem.value, "", "", parentId_elem.value);
}

function dialogBookmarkPopulateParentListRecursive(select_elem, tab_id, parent_id, path, selected_id) {
    const current_level_bookmarks = data_bookmarks.filter(b => { return b.tab_id == tab_id && b.parent_id == parent_id });

    for (const bm of current_level_bookmarks) {
        var opt = document.createElement('option');
        opt.value = bm.id;
        opt.textContent = path + (path.length > 0 ? " > " : "") + bm.title;
        if (bm.id == selected_id) {
            opt.selected = true;
        }
        select_elem.appendChild(opt);

        dialogBookmarkPopulateParentListRecursive(select_elem, tab_id, bm.id, opt.textContent, selected_id)
    }
}

function dialogBookmarkPopulateTabsList() {
    const tabsList_elem = document.getElementById("dialog_bookmark_edit_tab");
    const tabId_elem = document.getElementById("dialog_bookmark_tab_id");

    if (!tabsList_elem) {
        console.error("ERROR: dialogBookmarkPopulateTabsList - Did not find required elements");
        return;
    }

    while (tabsList_elem.firstChild) {
        tabsList_elem.firstChild.remove()
    }

    for (const tab of data_tabs) {
        var opt = document.createElement('option');
        opt.value = tab.id;
        opt.innerHTML = tab.title;
        if (tab.id == tabId_elem.value) {
            opt.selected = true;
        }
        tabsList_elem.appendChild(opt);
    }

    dialogBookmarkPopulateParentList();
}

function dialogBookmarkShowAdvanced() {
    const link = document.getElementById("dialog_bookmark_edit_showadvanced").getElementsByTagName("a")[0];
    const advancedDiv = document.getElementById("dialog_bookmark_edit_advanced");

    if (!link || !advancedDiv) {
        console.error("ERROR: dialogBookmarkShowAdvanced - Did not find required elements");
        return;
    }

    if (advancedDiv.style.display == "none") {
        advancedDiv.style.display = "block";
        link.textContent = "Hide Advanced";
    }
    else {
        advancedDiv.style.display = "none";
        link.textContent = "Show Advanced";
    }
}

function dialogsHide() {
    DIALOG_OVERLAY.style.display = "none";

    for (const dialog of DIALOGS) {
        if (dialog) {
            dialog.style.display = "none";
        }
    }
}

function dialogBookmarkTabListChanged() {
    const tabsList_elem = document.getElementById("dialog_bookmark_edit_tab");
    const tabId_elem = document.getElementById("dialog_bookmark_tab_id");
    const parentId_elem = document.getElementById("dialog_bookmark_parent_id");

    tabId_elem.value = tabsList_elem.value;
    console.log(`Bookmark Tab changed to ${tabId_elem.value} / ${tabsList_elem.options[tabsList_elem.selectedIndex].text}`);

    parentId_elem.value = "";
    dialogBookmarkPopulateParentList();
}

function dialogsSave(e) {
    e.stopPropagation();

    console.info(`dialogsSave - Command -> ${e.target.getAttribute("command")}`);

    const msgBox = dialogsGetMessageBox(e.target);
    const command = e.target.getAttribute("command").toLowerCase();
    let hide_dialog = false;

    switch (command) {
        case "tab_save":
            const tab_title = document.getElementById("dialog_tab_edit_title").value;
            const tab_id = document.getElementById("dialog_tab_id").value;

            if (dataTabSave(tab_id, tab_title)) {
                hide_dialog = true;
                messageShow("Saved Tab", MESSAGE_SUCCESS);
            }
            else {
                msgBox.textContent = "Failed to Save";
                msgBox.style.display = "block";
                console.warn("WARNING: Tab already exists");
                return;
            }
            break;
        case "bookmark_save":
            const bookmark_id = document.getElementById("dialog_bookmark_id").value;
            const bookmark_tab_id = document.getElementById("dialog_bookmark_tab_id").value;
            const bookmark_parent_id = document.getElementById("dialog_bookmark_parent_id").value;
            const bookmark_title = document.getElementById("dialog_bookmark_edit_title").value;
            const bookmark_url = document.getElementById("dialog_bookmark_edit_url").value;
            const bookmark_target = document.getElementById("dialog_bookmark_edit_target").checked ? "_blank" : "";
            const bookmark_note = document.getElementById("dialog_bookmark_edit_notes").value;

            if (dataBookmarkSave(bookmark_id, bookmark_tab_id, bookmark_parent_id, bookmark_title, bookmark_url, bookmark_target, bookmark_note)) {
                hide_dialog = true;
                messageShow("Saved Bookmark", MESSAGE_SUCCESS);
            }
            else {
                msgBox.textContent = "Failed to Save";
                msgBox.style.display = "block";
                console.warn("WARNING: Bookmark already exists");
                return;
            }
            break;
        default:
            console.warn(`WARNING: Command -> ${command} not handled`);
            break;
    }

    if (hide_dialog) {
        dialogsHide();

        setTimeout(function () { messageShow(""); }, 1500);

        dataLoad();
        uiUpdate();
    }
}

function dialogsGetMessageBox(dialogbox_element) {
    //const msgBox = dialogbox_element.closest(".dialog_content").getElementsByClassName("message")[0];
    const msgBox = dialogbox_element.getElementsByClassName("message")[0];

    console.dir(msgBox);


    if (msgBox)
        msgBox.style.display = "none";

    return msgBox;
}

function dialogsShowEditBookmark(id, parent_id = "") {
    // get the viewport width and height  
    const viewPortWidth = window.innerWidth || self.innerWidth || parent.innerWidth || top.innerWidth;
    const viewPortHeight = window.innerHeight || self.innerHeight || parent.innerHeight || top.innerHeight;
    const title = DIALOG_BOOKMARK.getElementsByClassName("dialog_title")[0];
    const bookmark_id_elem = document.getElementById("dialog_bookmark_id");
    const bookmark_tab_id_elem = document.getElementById("dialog_bookmark_tab_id");
    const bookmark_parent_id_elem = document.getElementById("dialog_bookmark_parent_id");
    const bookmark_title_elem = document.getElementById("dialog_bookmark_edit_title");
    const bookmark_url_elem = document.getElementById("dialog_bookmark_edit_url");
    const bookmark_url_target_elem = document.getElementById("dialog_bookmark_edit_target");
    const bookmark_notes_elem = document.getElementById("dialog_bookmark_edit_notes");


    // const msgBox = dialogsGetMessageBox(title);
    const msgBox = dialogsGetMessageBox(DIALOG_BOOKMARK);

    console.dir({
        DIALOG_OVERLAY: DIALOG_OVERLAY,
        DIALOG_BOOKMARK: DIALOG_BOOKMARK,
        title: title,
        bookmark_id_elem: bookmark_id_elem,
        bookmark_tab_id_elem: bookmark_tab_id_elem,
        bookmark_parent_id_elem: bookmark_parent_id_elem,
        bookmark_title_elem: bookmark_title_elem,
        bookmark_url_elem: bookmark_url_elem,
        bookmark_url_target_elem: bookmark_url_target_elem,
        bookmark_notes_elem: bookmark_notes_elem,
        msgBox: msgBox
    });

    if (!DIALOG_OVERLAY || !DIALOG_BOOKMARK || !title || !bookmark_id_elem || !bookmark_tab_id_elem || !bookmark_parent_id_elem ||
        !bookmark_title_elem || !bookmark_url_elem || !bookmark_notes_elem || !msgBox) {
        console.error("ERROR: dialogsShowEditBookmark - Failed to get required document elements")
        return;
    }

    if (!id) {
        title.textContent = "Add Bookmark";
        bookmark_id_elem.value = "";
        bookmark_tab_id_elem.value = tab_selected.id;
        bookmark_parent_id_elem.value = parent_id;
        bookmark_title_elem.value = "";
        bookmark_url_elem.value = "";
        bookmark_url_target_elem.checked = true;
        bookmark_notes_elem.value = "";
    }
    else {
        title.textContent = "Edit Bookmark"
        const bookmark = dataFindItemsById(data_bookmarks, id)[0];
        console.dir(bookmark);
        bookmark_id_elem.value = id;
        bookmark_tab_id_elem.value = bookmark.tab_id;
        bookmark_parent_id_elem.value = bookmark.parent_id;
        bookmark_title_elem.value = bookmark.title;
        bookmark_url_elem.value = bookmark.url;
        bookmark_url_target_elem.checked = bookmark.target == "_blank";
        bookmark_notes_elem.value = bookmark.note;
    }

    dialogBookmarkPopulateTabsList();

    // Show dialog
    DIALOG_BOOKMARK.style.display = "block";

    // calculate the values for center alignment
    var dialogLeft = (viewPortWidth - Number(DIALOG_BOOKMARK.offsetWidth)) / 2;
    var dialogTop = (viewPortHeight - Number(DIALOG_BOOKMARK.offsetHeight)) / 2;

    // Show DIALOG_OVERLAY
    DIALOG_OVERLAY.style.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    DIALOG_OVERLAY.style.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    DIALOG_OVERLAY.style.display = "block";

    // Position dialog
    DIALOG_BOOKMARK.style.left = dialogLeft + "px";
    DIALOG_BOOKMARK.style.top = dialogTop + "px";
    DIALOG_BOOKMARK.style.display = "block";
}

function dialogsShowEditTab(id) {
    // get the viewport width and height  
    const viewPortWidth = window.innerWidth || self.innerWidth || parent.innerWidth || top.innerWidth;
    const viewPortHeight = window.innerHeight || self.innerHeight || parent.innerHeight || top.innerHeight;
    const title = DIALOG_TAB.getElementsByClassName("dialog_title")[0];
    const title_textbox = document.getElementById("dialog_tab_edit_title");
    const tab_id_elem = document.getElementById("dialog_tab_id");

    const msgBox = dialogsGetMessageBox(DIALOG_TAB);

    if (!DIALOG_OVERLAY || !DIALOG_TAB || !title || !title_textbox || !msgBox || !tab_id_elem) {
        console.error("ERROR: dialogsShowEditTab - Failed to get required document elements")
        return;
    }

    if (!id) {
        title.textContent = "Add Tab";
        title_textbox.value = "";
        tab_id_elem.value = "";
    }
    else {
        title.textContent = "Rename Tab"
        title_textbox.value = tab_selected.textContent;
        tab_id_elem.value = id;
    }

    // Show dialog
    DIALOG_TAB.style.display = "block";

    // calculate the values for center alignment
    var dialogLeft = (viewPortWidth - Number(DIALOG_TAB.offsetWidth)) / 2;
    var dialogTop = (viewPortHeight - Number(DIALOG_TAB.offsetHeight)) / 2;

    // Show DIALOG_OVERLAY
    DIALOG_OVERLAY.style.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    DIALOG_OVERLAY.style.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    DIALOG_OVERLAY.style.display = "block";

    // Position dialog
    DIALOG_TAB.style.left = dialogLeft + "px";
    DIALOG_TAB.style.top = dialogTop + "px";
    DIALOG_TAB.style.display = "block";
}

for (const button of document.getElementsByClassName("button_cancel")) {
    button.addEventListener("click", dialogsHide);
}

for (const button of document.getElementsByClassName("button_save")) {
    button.addEventListener("click", dialogsSave);
}


/*************************************************************************/
/***************************** MESSAGE AREA ******************************/
/*************************************************************************/
// These constants are to be assigned the CSS classes for each message type
const MESSAGE_CLASS = "message";
const MESSAGE_ERROR = "error";
const MESSAGE_WARNING = "warning";
const MESSAGE_SUCCESS = "success";
const MESSAGE_INFORMATION = "information";
let message_container;

function messageInit(message_container_id) {
    message_container = document.getElementById(message_container_id);

    if (!message_container) {
        console.error("ERROR: messageInit - Failed to find message container");
        return false;
    }

    messageShow();

    return true;
}

function messageShow(message, message_type = MESSAGE_ERROR) {
    message_container.textContent = "";
    message_container.className = MESSAGE_CLASS;

    if (!message || message.length == 0) {
        message_container.style.display = "none";
        return;
    }

    switch (message_type) {
        case MESSAGE_ERROR:
            console.error(message);
            break;
        case MESSAGE_WARNING:
            console.warn(message);
            break;
        default:
            console.info(message);
            break;
    }

    message_container.style.display = "inline-block";
    message_container.textContent = `${message_type.toUpperCase()}: ${message}`;
    message_container.classList.add(message_type);
}

/*************************************************************************/
/********************************* TABS **********************************/
/*************************************************************************/
let tabs_container, tabs_left_button, tabs_right_button, tab_items, tabs_command_button, tabs_command_menu, tabs_scroll_step;
let tab_selected = null;

function tabsInit(tabs_container_id, tabs_left_button_id, tabs_right_button_id, tab_items_id, tabs_command_button_id, tabs_command_menu_id, scroll_step) {
    tabs_container = document.getElementById(tabs_container_id);
    tabs_left_button = document.getElementById(tabs_left_button_id);
    tabs_right_button = document.getElementById(tabs_right_button_id);
    tab_items = document.getElementById(tab_items_id);
    tabs_command_button = document.getElementById(tabs_command_button_id);
    tabs_command_menu = document.getElementById(tabs_command_menu_id);
    tabs_scroll_step = Math.abs(scroll_step);

    if (!tabs_scroll_step) {
        tabs_scroll_step = 200;
        console.info(`The tabs_scroll_step variable set to the default value of ${tabs_scroll_step}`);
    }

    if (!tabs_container || !tabs_left_button || !tabs_right_button || !tab_items || !tabs_command_button || !tabs_command_menu) {
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

    tabs_command_button.addEventListener("click", function (e) {
        e.stopPropagation();
        contextMenuShow(tabs_command_menu, { X: e.pageX, Y: e.pageY })
    });

    for (const item of tabs_command_menu.getElementsByTagName("button")) {
        item.addEventListener("click", function (e) {
            commandButtonClicked(e);
        });
    }

    CONTEXT_MENUS.push(tabs_command_menu);

    return true;
}

function tabAllowDrop(e) {
    e.preventDefault();
}

function tabDrag(e) {
    e.dataTransfer.setData("target_id", e.target.id);
}

function tabDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const data = e.dataTransfer.getData("target_id");
    const target_li_id = e.target.closest("li").id;

    if (data && target_li_id) {
        const dropped_item = dataFindItemsById(data_tabs, data)[0];
        const target_item = dataFindItemsById(data_tabs, target_li_id)[0];

        if (dropped_item && target_item) {
            console.info("tabDrop - Reorder")
            const dropped_index = data_tabs.map(obj => obj.id).indexOf(dropped_item.id);
            const target_index = data_tabs.map(obj => obj.id).indexOf(target_item.id);

            const move_item = data_tabs.splice(dropped_index, 1)[0];
            data_tabs.splice(target_index, 0, move_item);

            localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));
            dataLoad();
            uiUpdate();
        }
    }
}

function tabsDisplayItems() {
    tab_items.replaceChildren();

    if (!data_tabs) {
        messageShow("No tab data found", MESSAGE_WARNING);
        tabsUpdateScrollButtonsDisabledState();
        return false;
    }
    for (const tab of data_tabs) {
        if (!tab.title)
            continue;

        const li = document.createElement("li");
        li.textContent = tab.title;
        li.id = tab.id;
        li.draggable = true;
        li.addEventListener("dragstart", tabDrag);
        li.addEventListener("drop", tabDrop);
        li.addEventListener("dragover", tabAllowDrop);
        li.addEventListener("click", function (e) {
            e.stopPropagation();
            if (e.target.id) {
                tab_selected = e.target;
                tabsSelectedTabChanged();
            }
        });

        tab_items.appendChild(li);
    }
    tabsUpdateScrollButtonsDisabledState();
    tabsSelectedTabChanged();

    if (!tab_selected && data_tabs.length > 0) {
        document.getElementById(data_tabs[0].id).click();
    }
}

function tabsSelectedTabChanged() {
    // Update tabs context menu
    const disable_selected_items = !tab_selected;

    for (const item of tabs_command_menu.getElementsByTagName("button")) {
        item.disabled = false;
        if (!tab_selected && (item.textContent.toUpperCase().includes("SELECTED") || item.textContent.toUpperCase().includes("BOOKMARK"))) {
            item.disabled = disable_selected_items;
        }
    }

    // Update tab styles
    for (const tab of tab_items.getElementsByTagName("li")) {
        tab.classList.remove("selected");
        if (tab_selected && tab.id == tab_selected.id) {
            tab.classList.add("selected");
        }
    }
    bookmarksDisplayItems(!tab_selected ? "" : tab_selected.id);

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
/********************************** UI ***********************************/
/*************************************************************************/
function uiUpdate() {
    tabsDisplayItems();
    bookmarksDisplayItems(!tab_selected ? "" : tab_selected.id);
}


/*************************************************************************/
/**************************** INTITIALIZATION ****************************/
/*************************************************************************/
let initialized = true;
const main_content_area = document.getElementById("outer-parent");
const search_text = document.getElementById("search_text");
const search_results = document.getElementById("search_results");
const clear_search_text = document.getElementById("clear_search_text");
const NO_SEARCH_RESULTS = "No Search Results Found";

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
search_text.addEventListener("keyup", function (e) {
    searchBookmarks();
});

clear_search_text.addEventListener("click", function (e) {
    search_text.value = '';
    searchBookmarks();
});
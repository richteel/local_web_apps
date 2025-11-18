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
    }

    CONTEXT_MENUS.push(bookmarks_command_menu);

    return true;
}

function dataBookmarkDelete(bookmark_id) {
    if (!bookmark_id) {
        console.error(`ERROR: dataBookmarkDelete - The bookmark_id parameter value is missing.`);
        return false;
    }
    const index = data_bookmarks.findIndex(obj => obj.id === bookmark_id);

    if (index < 0) {
        console.error(`ERROR: dataBookmarkDelete - Failed to find id in array of bookmarks. id -> ${bookmark_id}`);
        return false;
    }

    for (let i = data_bookmarks.length - 1; i > -1; i--) {
        if (data_bookmarks[i].parent_id === bookmark_id) {
            data_bookmarks.splice(i, 1);
        }
    }

    data_bookmarks.splice(index, 1);
    
    try {
        localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));
    } catch (err) {
        console.error("ERROR: dataBookmarkDelete - Failed to save to localStorage:", err);
        messageShow("Error: Failed to save changes (quota exceeded?)", MESSAGE_ERROR);
        return false;
    }

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

    for (const bookmark of data_bookmarks) {
        if (!bookmark.title || bookmark.tab_id !== tab_id)
            continue;

        if (parent_id && bookmark.parent_id !== parent_id)
            continue;

        if (!parent_id && bookmark.parent_id)
            continue;

        // Create items to display the bookmark
        const bookmark_li = document.createElement("li");
        const bookmark_div_outer = document.createElement("div");
        const bookmark_div_inner = document.createElement("div");
        const bookmark_link = document.createElement("a");
        const bookmark_break = document.createElement("br");
        const bookmark_span_note = document.createElement("span");
        const bookmark_button = document.createElement("button");

        // Configure list item
        bookmark_li.draggable = true;
        bookmark_li.id = bookmark.id;

        bookmark_li.addEventListener("dragstart", bookmarkDrag);
        bookmark_li.addEventListener("dragend", bookmarkDragEnd);
        bookmark_li.addEventListener("drop", bookmarkDrop);
        bookmark_li.addEventListener("dragover", bookmarkAllowDrop);

        bookmark_li.addEventListener("click", function (e) {
            e.stopPropagation();
            if (e.target.getElementsByTagName('a').length > 0) {
                e.target.getElementsByTagName('a')[0].click();
            }
        });

        bookmark_div_outer.className = "bookmark_outer";
        bookmark_div_inner.className = "bookmark_inner";
        bookmark_link.className = "bookmark_link";
        bookmark_span_note.className = "bookmark_note";

        bookmark_button.type = "button";
        bookmark_button.innerHTML = "&#8230;"; // Horizontal ellipsis
        bookmark_button.className = "bookmark_button";
        bookmark_button.addEventListener("click", function (e) {
            e.stopPropagation();

            bookmark_selected = e.target.closest("li");
            contextMenuShow(bookmarks_command_menu, { X: e.pageX, Y: e.pageY })
        });

        // Append bookmark elements to the document

        // - Add link and notes to inner div
        if (bookmark.url) {
            bookmark_link.textContent = bookmark.title;
            bookmark_link.href = bookmark.url;
            bookmark_link.target = bookmark.target;
            bookmark_div_inner.appendChild(bookmark_link);
        }
        else {
            bookmark_div_inner.textContent = bookmark.title;
        }
        if (bookmark.note) {
            bookmark_span_note.innerHTML = sanitizeHTML(bookmark.note);
            bookmark_div_inner.appendChild(bookmark_break);
            bookmark_div_inner.appendChild(bookmark_span_note);
        }

        // - Add inner & button to outer
        bookmark_div_outer.appendChild(bookmark_div_inner);
        bookmark_div_outer.appendChild(bookmark_button);

        // - Add items to li
        bookmark_li.appendChild(bookmark_div_outer);
        // - Add items to ul
        if (parent_elem.tagName === "UL") {
            parent_elem.appendChild(bookmark_li);
        }
        else {
            if (!parent_elem_ul) {
                parent_elem_ul = document.createElement("ul");
                parent_elem.appendChild(parent_elem_ul);
            }

            parent_elem_ul.appendChild(bookmark_li);
        }
        bookmarksDisplayItems(tab_id, bookmark_li, bookmark.id);
    }
}

// https://www.w3schools.com/html/tryit.asp?filename=tryhtml5_draganddrop

// --- Drop indicator for bookmarks ---
let bookmarkDropIndicator = null;

function createBookmarkDropIndicator() {
    if (!bookmarkDropIndicator) {
        bookmarkDropIndicator = document.createElement('div');
        bookmarkDropIndicator.className = 'bookmark-drop-indicator';
        bookmarkDropIndicator.style.position = 'absolute';
        bookmarkDropIndicator.style.height = '2px';
        bookmarkDropIndicator.style.background = '#0078d4';
        bookmarkDropIndicator.style.zIndex = 9999;
        bookmarkDropIndicator.style.pointerEvents = 'none';
        document.body.appendChild(bookmarkDropIndicator);
    }
    bookmarkDropIndicator.style.display = 'block';
}

function hideBookmarkDropIndicator() {
    if (bookmarkDropIndicator) {
        bookmarkDropIndicator.style.display = 'none';
    }
}

// --- Enhanced drag/drop handlers ---

function bookmarkAllowDrop(e) {
    e.preventDefault();
    // Visual indicator logic
    const li = e.target.closest('li');
    if (!li) {
        hideBookmarkDropIndicator();
        return;
    }
    createBookmarkDropIndicator();
    const rect = li.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let position;
    if (offsetY < rect.height / 3) {
        // Drop above
        bookmarkDropIndicator.style.top = (rect.top - 1) + 'px';
        position = 'above';
    } else if (offsetY > rect.height * 2 / 3) {
        // Drop below
        bookmarkDropIndicator.style.top = (rect.bottom - 1) + 'px';
        position = 'below';
    } else {
        // Drop as child
        bookmarkDropIndicator.style.top = (rect.top + rect.height / 2 - 1) + 'px';
        position = 'child';
    }
    bookmarkDropIndicator.style.left = rect.left + 'px';
    bookmarkDropIndicator.style.width = rect.width + 'px';
    bookmarkDropIndicator.dataset.position = position;
    bookmarkDropIndicator.dataset.targetId = li.id;
}

function bookmarkDrag(e) {
    e.dataTransfer.setData("target_id", e.target.id);
    // Optionally, add a dragging class for styling
    e.target.classList.add('dragging');
}

function bookmarkDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    hideBookmarkDropIndicator();

    const data = e.dataTransfer.getData("target_id");
    const li = e.target.closest("li");
    if (!data || !li) return;

    const target_li_id = li.id;
    const droppedItems = dataFindItemsById(data_bookmarks, data);
    const targetItems = dataFindItemsById(data_bookmarks, target_li_id);
    
    if (!droppedItems || droppedItems.length === 0 || !targetItems || targetItems.length === 0) return;
    
    const dropped_item = droppedItems[0];
    const target_item = targetItems[0];

    // Determine drop position
    let position = 'child';
    if (bookmarkDropIndicator && bookmarkDropIndicator.dataset.targetId === target_li_id) {
        position = bookmarkDropIndicator.dataset.position;
    } else {
        // fallback: use mouse position
        const rect = li.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        if (offsetY < rect.height / 3) position = 'above';
        else if (offsetY > rect.height * 2 / 3) position = 'below';
        else position = 'child';
    }

    // Prevent dropping onto itself or its descendants
    if (dropped_item.id === target_item.id) return;
    let parent = target_item;
    while (parent && parent.parent_id) {
        if (parent.parent_id === dropped_item.id) return;
        const parentItems = dataFindItemsById(data_bookmarks, parent.parent_id);
        if (!parentItems || parentItems.length === 0) break;
        parent = parentItems[0];
    }

    // Remove from current position
    const dropped_index = data_bookmarks.findIndex(obj => obj.id === dropped_item.id);
    if (dropped_index < 0) return;
    data_bookmarks.splice(dropped_index, 1);

    if (position === 'above') {
        // Insert before target
        const target_index = data_bookmarks.findIndex(obj => obj.id === target_item.id);
        dropped_item.parent_id = target_item.parent_id;
        data_bookmarks.splice(target_index, 0, dropped_item);
    } else if (position === 'below') {
        // Insert after target
        const target_index = data_bookmarks.findIndex(obj => obj.id === target_item.id);
        dropped_item.parent_id = target_item.parent_id;
        data_bookmarks.splice(target_index + 1, 0, dropped_item);
    } else {
        // As child
        dropped_item.parent_id = target_item.id;
        // Insert after last child of target_item
        let insert_index = data_bookmarks.findIndex(obj => obj.id === target_item.id) + 1;
        // Find last child in sequence
        for (let i = insert_index; i < data_bookmarks.length; i++) {
            if (data_bookmarks[i].parent_id !== target_item.id) break;
            insert_index = i + 1;
        }
        data_bookmarks.splice(insert_index, 0, dropped_item);
    }

    try {
        localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));
    } catch (err) {
        console.error("ERROR: bookmarkDrop - Failed to save to localStorage:", err);
        messageShow("Error: Failed to save bookmark position", MESSAGE_ERROR);
        return;
    }
    dataLoad();
    uiUpdate();
}

function bookmarkDragEnd(e) {
    hideBookmarkDropIndicator();
    e.target.classList.remove('dragging');
}

function searchBookmarks() {
    if (search_text.value.length === 0) {
        search_results.style.display = "none";
        return;
    }
    // Clear all results
    while (search_results.firstChild) {
        search_results.removeChild(search_results.firstChild);
    }

    let result_count = 0;

    const searchQuery = search_text.value.toLowerCase();
    let dataBookmarks, dataTabs;
    
    try {
        dataBookmarks = JSON.parse(localStorage.getItem('bookmarks'));
        dataTabs = JSON.parse(localStorage.getItem('tabs'));
    } catch (err) {
        console.error("ERROR: searchBookmarks - Failed to parse data from localStorage:", err);
        messageShow("Error loading bookmark data", MESSAGE_ERROR);
        return;
    }
    
    if (!dataBookmarks || !dataTabs) {
        console.warn("WARNING: searchBookmarks - No data available to search");
        return;
    }
    
    const tabsMap = new Map(dataTabs.map(tab => [tab.id, tab.title]));

    // Filter bookmarks based on search query
    const filteredBookmarks = dataBookmarks.filter(bookmark => {
        if (!bookmark) return false;
        const title = bookmark.title ? bookmark.title.toLowerCase() : '';
        const note = bookmark.note ? bookmark.note.toLowerCase() : '';
        return title.includes(searchQuery) || note.includes(searchQuery);
    });
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
                tabSection.innerHTML = `<h3>${sanitizeHTML(tabTitle)}</h3>`;

                const ul = document.createElement('ul');
                groupedResults.get(tab.id).forEach(bookmark => {
                    if (!bookmark) return;
                    
                    const li = document.createElement('li');
                    const url = bookmark.url || '';
                    const title = bookmark.title || 'Untitled';
                    const note = bookmark.note || '';
                    const target = bookmark.target || '_self';
                    
                    if (url.length > 0) {
                        li.innerHTML = `<a href="${sanitizeHTML(url)}" target="${sanitizeHTML(target)}">${sanitizeHTML(title)}</a>`;
                    } else {
                        li.innerHTML = sanitizeHTML(title);
                    }
                    if (note.length > 0) {
                        li.innerHTML += `<br><span class="bookmark_note">${sanitizeHTML(note)}</span>`;
                    }
                    ul.appendChild(li);
                });

                tabSection.appendChild(ul);
                search_results.appendChild(tabSection);
            }
        });
    }

    // Show no results message
    if (result_count === 0) {
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
            const parentItems = dataFindItemsById(data_bookmarks, bookmark_selected.id);
            if (!parentItems || parentItems.length === 0) {
                messageShow("Unable to find selected bookmark", MESSAGE_ERROR);
                setTimeout(function () { messageShow(""); }, MESSAGE_TIMEOUT_SHORT);
                break;
            }
            const parent_id = parentItems[0].parent_id;
            dialogsShowEditBookmark("", parent_id);
            break;
        case "bookmark_delete":
            const bookmarkItems = dataFindItemsById(data_bookmarks, bookmark_selected.id);
            if (!bookmarkItems || bookmarkItems.length === 0) {
                messageShow("Unable to find selected bookmark", MESSAGE_ERROR);
                setTimeout(function () { messageShow(""); }, MESSAGE_TIMEOUT_SHORT);
                break;
            }
            const bookmark = bookmarkItems[0];
            const prompt_bookmark = `Are you sure you want to delete the "${bookmark.title}" bookmark and child bookmarks?`;
            if (confirm(prompt_bookmark) === true) {
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
        case "edit_data":
            dialogsShowEditData();
            break;
        case "export":
            dataExport();
            break;
        case "import":
            // Use setTimeout to clear the context menu when displaying the prompt.
            // The click event needs to complete first.
            setTimeout(dataImport, CONTEXT_MENU_DELAY);
            break;
        case "merge_import":
            setTimeout(dataMergeImport, CONTEXT_MENU_DELAY);
            break;
        case "printview":
            printViewTab();
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
            if (confirm(prompt) === true) {
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
/************************** HTML SANITIZATION ****************************/
/*************************************************************************/
function sanitizeHTML(html) {
    if (!html) return '';
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Remove all script tags
    const scripts = temp.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // Remove dangerous event handlers
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(element => {
        // Remove all on* attributes (onclick, onerror, etc.)
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
                element.removeAttribute(attr.name);
            }
        });
        
        // Sanitize href and src to prevent javascript: URLs
        if (element.hasAttribute('href')) {
            const href = element.getAttribute('href');
            if (href.toLowerCase().trim().startsWith('javascript:')) {
                element.removeAttribute('href');
            }
        }
        if (element.hasAttribute('src')) {
            const src = element.getAttribute('src');
            if (src.toLowerCase().trim().startsWith('javascript:')) {
                element.removeAttribute('src');
            }
        }
    });
    
    return temp.innerHTML;
}

/*************************************************************************/
/****************************** PRINT VIEW *******************************/
function printViewTab() {
    if (!tab_selected) {
        messageShow("No tab selected", MESSAGE_WARNING);
        setTimeout(function () { messageShow(""); }, MESSAGE_TIMEOUT_SHORT);
        return;
    }

    const tabTitle = tab_selected.textContent;
    const tabId = tab_selected.id;
    
    // Generate HTML for bookmarks
    let bookmarksHTML = generateBookmarksHTML(tabId, "");
    
    // Create the complete HTML document
    const printHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tabTitle}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        ul {
            list-style-type: none;
            padding-left: 0;
        }
        ul ul {
            padding-left: 30px;
            margin-top: 5px;
        }
        li {
            margin: 8px 0;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .bookmark-note {
            color: #666;
            font-size: 0.9em;
            font-style: italic;
            display: block;
            margin-top: 3px;
        }
        .bookmark-folder {
            font-weight: bold;
            color: #333;
        }
        @media print {
            body {
                margin: 0;
            }
            a {
                color: #000;
            }
        }
    </style>
</head>
<body>
    <h1>${tabTitle}</h1>
    ${bookmarksHTML}
</body>
</html>`;
    
    // Open in new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
    } else {
        messageShow("Failed to open print view. Please allow popups.", MESSAGE_ERROR);
        setTimeout(function () { messageShow(""); }, MESSAGE_TIMEOUT_LONG);
    }
}

function generateBookmarksHTML(tabId, parentId) {
    const bookmarksAtLevel = data_bookmarks.filter(bookmark => 
        bookmark.tab_id === tabId && bookmark.parent_id === parentId
    );
    
    if (bookmarksAtLevel.length === 0) {
        return '';
    }
    
    let html = '<ul>';
    
    for (const bookmark of bookmarksAtLevel) {
        if (!bookmark.title) continue;
        
        html += '<li>';
        
        if (bookmark.url) {
            html += `<a href="${sanitizeHTML(bookmark.url)}" target="${sanitizeHTML(bookmark.target)}">${sanitizeHTML(bookmark.title)}</a>`;
        } else {
            html += `<span class="bookmark-folder">${sanitizeHTML(bookmark.title)}</span>`;
        }
        
        if (bookmark.note) {
            html += `<span class="bookmark-note">${sanitizeHTML(bookmark.note)}</span>`;
        }
        
        // Recursively add child bookmarks
        const childrenHTML = generateBookmarksHTML(tabId, bookmark.id);
        if (childrenHTML) {
            html += childrenHTML;
        }
        
        html += '</li>';
    }
    
    html += '</ul>';
    return html;
}

/*************************************************************************/
/********************************* DATA **********************************/
/*************************************************************************/
const DATA_BOOKMARKS_KEY = "bookmarks";
const DATA_TABS_KEY = "tabs";
const DATA_LAST_EXPORT_FILENAME_KEY = "last_export_filename";
const DEFAULT_TAB_SCROLL_STEP = 200;
const MESSAGE_TIMEOUT_SHORT = 1500;
const MESSAGE_TIMEOUT_LONG = 3000;
const CONTEXT_MENU_DELAY = 10;
const DIALOG_INIT_RETRY_DELAY = 100;
let data_tabs = [];
let data_bookmarks = [];
let data_last_tab_id = 0;
let data_last_bookmark_id = 0;

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
        if (data_bookmarks[i].tab_id === tab_id) {
            data_bookmarks.splice(i, 1);
        }
    }

    try {
        localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));
    } catch (err) {
        console.error("ERROR: dataBookmarkDeleteAllForTab - Failed to save to localStorage:", err);
        messageShow("Error: Failed to save changes", MESSAGE_ERROR);
        return false;
    }

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
        
        try {
            localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));
        } catch (err) {
            console.error("ERROR: dataBookmarkSave - Failed to save to localStorage:", err);
            messageShow("Error: Failed to save bookmark (quota exceeded?)", MESSAGE_ERROR);
            data_bookmarks.pop(); // Rollback
            return false;
        }
        
        console.info(`Added Bookmark ${newBookmark}`, newBookmark);
        return true;
    }
    else {
        if (!bookmarks_with_ids || bookmarks_with_ids.length !== 1) {
            console.error(`ERROR: dataBookmarkSave - Saving bookmark failed. Zero or more than one bookmark found with id -> ${bookmark_id}`);
            console.dir(bookmarks_with_ids);
            return false;
        }

        let saved = false;
        let data_changed = false;
        if (!data_bookmarks || data_bookmarks.length === 0) {
            console.error(`ERROR: dataBookmarkSave - No bookmarks data available`);
            return false;
        }
        for (const bookmark of data_bookmarks) {
            if (bookmark.id === bookmark_id) {
                bookmark.tab_id = bookmark_tab_id;
                bookmark.parent_id = bookmark_parent_id;
                bookmark.title = bookmark_title;
                bookmark.url = bookmark_url;
                bookmark.target = bookmark_target;
                bookmark.note = bookmark_note;
                data_changed = true;
            }
            else if (bookmark.parent_id === bookmark_id) {
                if (bookmark.tab_id !== bookmark_tab_id) {
                    bookmark.tab_id = bookmark_tab_id;
                    data_changed = true;
                }
            }
        }

        if (data_changed) {
            try {
                localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));
                saved = true;
            } catch (err) {
                console.error("ERROR: dataBookmarkSave - Failed to save to localStorage:", err);
                messageShow("Error: Failed to save bookmark changes", MESSAGE_ERROR);
                return false;
            }
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
        if (confirm(prompt_clear) === false)
            return;
    }
    localStorage.clear();

    dataLoad();
    uiUpdate();
}

function getCurrentDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getExportFilename() {
    const currentDate = getCurrentDateString();
    const lastFilename = localStorage.getItem(DATA_LAST_EXPORT_FILENAME_KEY);
    
    if (lastFilename) {
        // Replace existing date pattern (YYYY-MM-DD) with current date
        // Match pattern: 4 digits, dash, 2 digits, dash, 2 digits
        const datePattern = /\d{4}-\d{2}-\d{2}/;
        if (datePattern.test(lastFilename)) {
            return lastFilename.replace(datePattern, currentDate);
        }
        // If no date pattern found, insert date before .json extension
        return lastFilename.replace(/\.json$/i, ` ${currentDate}.json`);
    }
    
    // Default filename with current date
    return `bookmarks ${currentDate}.json`;
}

function dataExport() {
    // Create an object to store properly parsed key-value pairs
    const parsedData = {};

    // Iterate over all keys in localStorage
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key) && (key === DATA_BOOKMARKS_KEY || key === DATA_TABS_KEY)) {
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
    
    const filename = getExportFilename();

    a.href = URL.createObjectURL(file);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    
    // Save the filename for next export
    try {
        localStorage.setItem(DATA_LAST_EXPORT_FILENAME_KEY, filename);
    } catch (err) {
        console.warn("WARNING: dataExport - Failed to save last export filename:", err);
        // Non-critical error, continue
    }
}

function dataImport() {
    const hasItems = data_tabs.length > 0 || data_bookmarks.length > 0;
    const prompt_import = `Importing data will delete the existing tabs and bookmarks. Are you sure you want to replace your bookmarks?`;

    if (hasItems) {
        if (confirm(prompt_import) === false)
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
                        console.info("Importing new format data");
                        // Always stringify the value for localStorage
                        try {
                            localStorage.setItem(key, JSON.stringify(data[key]));
                        } catch (err) {
                            console.error("ERROR: dataImport - Failed to save to localStorage:", err);
                            alert("Error importing data: Storage quota exceeded.");
                            return;
                        }
                    } else {
                        console.info("Importing old format data");
                        // Old format (values are already strings)
                        try {
                            localStorage.setItem(key, data[key]);
                        } catch (err) {
                            console.error("ERROR: dataImport - Failed to save to localStorage:", err);
                            alert("Error importing data: Storage quota exceeded.");
                            return;
                        }
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
    if (!items || items.length === 0) {
        return [];
    }
    
    return items.filter(obj => {
        return obj && obj.id === item_id;
    });
}

function dataFindItemsByTitle(items, item_title) {
    if (!items || items.length === 0) {
        return [];
    }
    
    return items.filter(obj => {
        return obj && obj.title === item_title;
    });
}

function dataFindItemsByTitleAndTabId(items, item_title, item_tab_id) {
    if (!items || items.length === 0) {
        return [];
    }
    
    return items.filter(obj => {
        return obj && obj.title === item_title && obj.tab_id === item_tab_id;
    });
}

/**
 * Normalize a URL for comparison (removes protocol, www, and trailing slash)
 */
function normalizeUrl(url) {
    if (!url) return "";
    return url.toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "")
        .trim();
}

/**
 * Build ID mappings for tabs from imported data to existing data
 * Returns: { importedTabId: existingTabId, ... }
 */
function buildTabIdMapping(importedTabs, existingTabs) {
    const mapping = {};
    
    for (const importedTab of importedTabs) {
        const normalizedTitle = importedTab.title.toLowerCase().trim();
        const existingTab = existingTabs.find(tab => 
            tab.title.toLowerCase().trim() === normalizedTitle
        );
        
        if (existingTab) {
            mapping[importedTab.id] = existingTab.id;
        }
    }
    
    return mapping;
}

/**
 * Check if a bookmark already exists based on tab, parent, title, and URL
 */
function bookmarkExists(bookmark, existingBookmarks) {
    const normalizedUrl = normalizeUrl(bookmark.url);
    const normalizedTitle = bookmark.title.toLowerCase().trim();
    
    return existingBookmarks.some(existing => 
        existing.tab_id === bookmark.tab_id &&
        existing.parent_id === bookmark.parent_id &&
        existing.title.toLowerCase().trim() === normalizedTitle &&
        normalizeUrl(existing.url) === normalizedUrl
    );
}

/**
 * Analyze merge without modifying data - returns preview information
 */
function analyzeMergeData(importedData) {
    const importedTabs = importedData.tabs || [];
    const importedBookmarks = importedData.bookmarks || [];
    
    const tabIdMapping = buildTabIdMapping(importedTabs, data_tabs);
    const bookmarkIdMapping = {};
    
    const newTabs = [];
    const newBookmarks = [];
    const tabTitles = {};
    
    // Build tab titles map for display
    for (const tab of data_tabs) {
        tabTitles[tab.id] = tab.title;
    }
    
    // Analyze tabs
    for (const importedTab of importedTabs) {
        if (!tabIdMapping[importedTab.id]) {
            newTabs.push(importedTab);
            // Add to mapping for bookmark analysis
            tabIdMapping[importedTab.id] = `preview_tab_${newTabs.length}`;
            tabTitles[tabIdMapping[importedTab.id]] = importedTab.title;
        }
    }
    
    // Analyze bookmarks
    for (let i = 0; i < importedBookmarks.length; i++) {
        const importedBookmark = importedBookmarks[i];
        const translatedTabId = tabIdMapping[importedBookmark.tab_id];
        if (!translatedTabId) {
            continue;
        }
        
        let translatedParentId = importedBookmark.parent_id;
        if (translatedParentId && bookmarkIdMapping[translatedParentId]) {
            translatedParentId = bookmarkIdMapping[translatedParentId];
        }
        
        const translatedBookmark = {
            tab_id: translatedTabId,
            parent_id: translatedParentId,
            title: importedBookmark.title,
            url: importedBookmark.url
        };
        
        if (!bookmarkExists(translatedBookmark, data_bookmarks)) {
            newBookmarks.push({
                ...importedBookmark,
                tab_id: translatedTabId,
                parent_id: translatedParentId,
                _originalIndex: i
            });
            bookmarkIdMapping[importedBookmark.id] = `preview_bm_${newBookmarks.length}`;
        }
    }
    
    return {
        newTabs,
        newBookmarks,
        newTabsCount: newTabs.length,
        newBookmarksCount: newBookmarks.length,
        tabTitles,
        originalTabs: importedTabs,
        originalBookmarks: importedBookmarks
    };
}

/**
 * Merge imported data into existing data without creating duplicates
 * Only merges items specified by the analysis results and selected indices
 */
function mergeDataSelective(mergeAnalysis, selectedTabIndices, selectedBookmarkIndices) {
    const tabIdMapping = buildTabIdMapping(mergeAnalysis.originalTabs, data_tabs);
    const bookmarkIdMapping = {};
    
    let newTabsCount = 0;
    let newBookmarksCount = 0;
    
    // Process only selected new tabs
    for (let i = 0; i < mergeAnalysis.newTabs.length; i++) {
        if (!selectedTabIndices.includes(i)) {
            continue;
        }
        
        const tab = mergeAnalysis.newTabs[i];
        const newTabId = `tab_${++data_last_tab_id}`;
        const newTab = {
            id: newTabId,
            title: tab.title
        };
        data_tabs.push(newTab);
        tabIdMapping[tab.id] = newTabId;
        newTabsCount++;
    }
    
    // Process only selected new bookmarks
    for (let i = 0; i < mergeAnalysis.newBookmarks.length; i++) {
        if (!selectedBookmarkIndices.includes(i)) {
            continue;
        }
        
        const bookmark = mergeAnalysis.newBookmarks[i];
        
        // Translate tab_id
        const translatedTabId = tabIdMapping[mergeAnalysis.originalBookmarks[bookmark._originalIndex].tab_id];
        if (!translatedTabId) {
            console.info(`Skipping bookmark "${bookmark.title}" - tab not found or not selected`);
            continue;
        }
        
        // Translate parent_id if it exists
        let translatedParentId = bookmark.parent_id;
        if (translatedParentId && bookmarkIdMapping[translatedParentId]) {
            translatedParentId = bookmarkIdMapping[translatedParentId];
        }
        
        // Add new bookmark
        const newBookmarkId = `bookmark_${++data_last_bookmark_id}`;
        const newBookmark = {
            id: newBookmarkId,
            tab_id: translatedTabId,
            parent_id: translatedParentId,
            title: bookmark.title,
            url: bookmark.url,
            target: bookmark.target || "_blank",
            note: bookmark.note || ""
        };
        data_bookmarks.push(newBookmark);
        bookmarkIdMapping[mergeAnalysis.originalBookmarks[bookmark._originalIndex].id] = newBookmarkId;
        newBookmarksCount++;
    }
    
    return { newTabsCount, newBookmarksCount };
}

/**
 * Import data and merge with existing data (no duplicates)
 */
function dataMergeImport() {
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
            let importedData;

            try {
                const parsedData = JSON.parse(contents);
                
                // Handle both old and new format
                if (parsedData.tabs && parsedData.bookmarks) {
                    // New format - direct object with tabs and bookmarks
                    importedData = parsedData;
                } else {
                    // Old format - localStorage dump
                    importedData = {
                        tabs: [],
                        bookmarks: []
                    };
                    
                    for (const key of Object.keys(parsedData)) {
                        if (key === DATA_TABS_KEY || key === "tabs") {
                            const tabsData = typeof parsedData[key] === "string" 
                                ? JSON.parse(parsedData[key]) 
                                : parsedData[key];
                            importedData.tabs = tabsData || [];
                        } else if (key === DATA_BOOKMARKS_KEY || key === "bookmarks") {
                            const bookmarksData = typeof parsedData[key] === "string" 
                                ? JSON.parse(parsedData[key]) 
                                : parsedData[key];
                            importedData.bookmarks = bookmarksData || [];
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to parse JSON:", err);
                alert("Error importing data: Invalid JSON format.");
                return;
            }

            // Analyze what would be merged (without modifying data)
            const mergeAnalysis = analyzeMergeData(importedData);
            
            // Show preview dialog
            dialogMergePreviewShow(mergeAnalysis, function(selectedTabIndices, selectedBookmarkIndices) {
                // User accepted - perform actual merge with selected items
                const result = mergeDataSelective(mergeAnalysis, selectedTabIndices, selectedBookmarkIndices);
                
                // Save to localStorage
                try {
                    localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));
                    localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(data_bookmarks));
                } catch (err) {
                    console.error("ERROR: dataMergeImport - Failed to save to localStorage:", err);
                    alert("Error saving merged data: Storage quota exceeded.");
                    return;
                }

                // Update UI
                tab_selected = null;
                bookmark_selected = null;
                dataLoad();
                uiUpdate();
                
                // Show success message
                const message = `Merge complete!\nAdded ${result.newTabsCount} new tab(s) and ${result.newBookmarksCount} new bookmark(s).`;
                alert(message);
            });
        };
        reader.readAsText(file);
    });
    inputFile.click();
}

function dataGetLastNumbericId(items) {
    if (!items || items.length === 0) {
        return 0;
    }
    
    const regex = /(?<=[a-z]_)[0-9]+/gm;
    const ids = [];

    for (const item of items) {
        if (!item || !item.id)
            continue;

        const found = item.id.match(regex);

        if (found && found.length === 1 && !isNaN(Number(found[0]))) {
            ids.push(Number(found[0]));
        }
    }

    if (ids.length === 0) {
        return 0;
    }

    return Math.max(...ids);
}

function dataLoad() {
    dialog_bookmark_edit_tabs.value = localStorage.getItem(DATA_TABS_KEY);
    dialog_bookmark_edit_bookmarks.value = localStorage.getItem(DATA_BOOKMARKS_KEY);
    
    try {
        data_tabs = JSON.parse(localStorage.getItem(DATA_TABS_KEY));
        data_bookmarks = JSON.parse(localStorage.getItem(DATA_BOOKMARKS_KEY));
    } catch (err) {
        console.error("ERROR: dataLoad - Failed to parse data from localStorage:", err);
        messageShow("Error loading bookmark data. Data may be corrupted.", MESSAGE_ERROR);
        data_tabs = [];
        data_bookmarks = [];
        return;
    }

    if (!data_tabs || data_tabs.length === 0) {
        data_last_tab_id = 0;
        data_tabs = [];
    }
    else {
        data_last_tab_id = dataGetLastNumbericId(data_tabs);
    }

    console.info("dataLoad - data_last_tab_id ->", data_last_tab_id);

    if (!data_bookmarks || data_bookmarks.length === 0) {
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
    const index = data_tabs.findIndex(obj => obj.id === tab_id);

    if (index < 0) {
        console.error(`ERROR: dataTabDelete - Failed to find id in array of tabs. id -> ${tab_id}`);
        return false;
    }

    if (!dataBookmarkDeleteAllForTab(tab_id)) {
        return false;
    }

    data_tabs.splice(index, 1);
    
    try {
        localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));
    } catch (err) {
        console.error("ERROR: dataTabDelete - Failed to save to localStorage:", err);
        messageShow("Error: Failed to save tab deletion", MESSAGE_ERROR);
        return false;
    }

    return true;
}

function dataTabMove(tab_id, increment) {
    if (!tab_id || !increment) {
        console.error(`ERROR: dataTabMove - One or more parameter values are missing.`);
        return false;
    }

    const index = data_tabs.findIndex(obj => obj.id === tab_id);

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
    
    try {
        localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));
    } catch (err) {
        console.error("ERROR: dataTabMove - Failed to save to localStorage:", err);
        messageShow("Error: Failed to save tab order", MESSAGE_ERROR);
        return false;
    }

    return true;
}

function dataTabSave(tab_id, tab_title) {
    if (!tab_title || tab_title.length === 0) {
        console.error(`ERROR: dataTabSave - Called without tab title`);
        return false;
    }

    const tabs_with_titles = dataFindItemsByTitle(data_tabs, tab_title);
    const tabs_with_ids = dataFindItemsById(data_tabs, tab_id);

    if (tabs_with_titles && tabs_with_titles.length > 0 && !(tabs_with_titles.length === 1 && tabs_with_titles[0].id === tab_id)) {
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
        
        try {
            localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));
        } catch (err) {
            console.error("ERROR: dataTabSave - Failed to save to localStorage:", err);
            messageShow("Error: Failed to save tab (quota exceeded?)", MESSAGE_ERROR);
            data_tabs.pop(); // Rollback
            return false;
        }
        
        console.info(`Added Tab ${newTab}`);
        return true;
    }
    else {
        if (!tabs_with_ids || tabs_with_ids.length !== 1) {
            console.error(`ERROR: dataTabSave - Saving tab failed. Zero or more than one tab found with id -> ${tab_id}`);
            console.dir(tabs_with_ids);
            return false;
        }

        let saved = false;
        if (!data_tabs || data_tabs.length === 0) {
            console.error(`ERROR: dataTabSave - No tabs data available`);
            return false;
        }
        for (const tab of data_tabs) {
            if (tab.id === tab_id) {
                tab.title = tab_title;
                
                try {
                    localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));
                    saved = true;
                } catch (err) {
                    console.error("ERROR: dataTabSave - Failed to save to localStorage:", err);
                    messageShow("Error: Failed to save tab changes", MESSAGE_ERROR);
                    return false;
                }
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
const DIALOG_MERGE_PREVIEW = document.getElementById("dialog_merge_preview");

const DIALOGS = [DIALOG_TAB, DIALOG_BOOKMARK, DIALOG_MERGE_PREVIEW];

function dialogsInit() {
    // Add event listener for Show Advanced link
    const showAdvancedLink = document.getElementById("show_advanced_link");
    if (showAdvancedLink) {
        showAdvancedLink.addEventListener("click", function(e) {
            e.preventDefault();
            dialogBookmarkShowAdvanced();
        });
    }
    
    // Add event listener for tab dropdown
    const tabDropdown = document.getElementById("dialog_bookmark_edit_tab");
    if (tabDropdown) {
        tabDropdown.addEventListener("change", dialogBookmarkTabListChanged);
    }
    
    // Add event listener for parent dropdown
    const parentDropdown = document.getElementById("dialog_bookmark_edit_parent");
    if (parentDropdown) {
        parentDropdown.addEventListener("change", dialogBookmarkParentListChanged);
    }
}

function dialogBookmarkParentListChanged() {
    const parentList_elem = document.getElementById("dialog_bookmark_edit_parent");
    const parentId_elem = document.getElementById("dialog_bookmark_parent_id");

    parentId_elem.value = parentList_elem.value;
    console.info(`Bookmark Parent changed to ${parentId_elem.value} / ${parentList_elem.options[parentList_elem.selectedIndex].text}`);
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

    const opt = document.createElement('option');
    opt.value = "";
    opt.textContent = "<None/Root>";
    if (parentId_elem.value === "") {
        opt.selected = true;
    }
    parentList_elem.appendChild(opt);

    dialogBookmarkPopulateParentListRecursive(parentList_elem, tabId_elem.value, "", "", parentId_elem.value);
}

function dialogBookmarkPopulateParentListRecursive(select_elem, tab_id, parent_id, path, selected_id) {
    const current_level_bookmarks = data_bookmarks.filter(b => { return b.tab_id === tab_id && b.parent_id === parent_id });

    for (const bm of current_level_bookmarks) {
        const opt = document.createElement('option');
        opt.value = bm.id;
        opt.textContent = path + (path.length > 0 ? " > " : "") + bm.title;
        if (bm.id === selected_id) {
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
        const opt = document.createElement('option');
        opt.value = tab.id;
        opt.textContent = tab.title;
        if (tab.id === tabId_elem.value) {
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

    if (advancedDiv.style.display === "none") {
        advancedDiv.style.display = "block";
        link.textContent = "Hide Advanced";
        link.setAttribute("aria-expanded", "true");
    }
    else {
        advancedDiv.style.display = "none";
        link.textContent = "Show Advanced";
        link.setAttribute("aria-expanded", "false");
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

function dialogMergePreviewShow(mergeAnalysis, onAccept) {
    DIALOG_OVERLAY.style.display = "block";
    DIALOG_MERGE_PREVIEW.style.display = "block";
    
    // Generate summary
    const summary = document.getElementById("merge_preview_summary");
    summary.textContent = `${mergeAnalysis.newTabsCount} new tab(s) and ${mergeAnalysis.newBookmarksCount} new bookmark(s) available to add.`;
    
    // Generate preview content with checkboxes
    const content = document.getElementById("merge_preview_content");
    let html = "";
    
    // Show new tabs with checkboxes
    if (mergeAnalysis.newTabs.length > 0) {
        html += "<h3>New Tabs:</h3><ul style='list-style: none; padding-left: 0;'>";
        for (let i = 0; i < mergeAnalysis.newTabs.length; i++) {
            const tab = mergeAnalysis.newTabs[i];
            const tabCheckId = `merge_tab_${i}`;
            html += `<li><label><input type="checkbox" checked class="merge-tab-checkbox" data-tab-index="${i}" id="${tabCheckId}"> <strong>${sanitizeHTML(tab.title)}</strong></label></li>`;
        }
        html += "</ul>";
    }
    
    // Show new bookmarks grouped by tab with checkboxes
    if (mergeAnalysis.newBookmarks.length > 0) {
        html += "<h3>New Bookmarks:</h3>";
        
        // Group bookmarks by tab
        const bookmarksByTab = {};
        for (let i = 0; i < mergeAnalysis.newBookmarks.length; i++) {
            const bookmark = mergeAnalysis.newBookmarks[i];
            bookmark._index = i; // Store index for checkbox ID
            const tabTitle = mergeAnalysis.tabTitles[bookmark.tab_id] || "Unknown Tab";
            if (!bookmarksByTab[tabTitle]) {
                bookmarksByTab[tabTitle] = [];
            }
            bookmarksByTab[tabTitle].push(bookmark);
        }
        
        // Display grouped bookmarks with checkboxes
        for (const [tabTitle, bookmarks] of Object.entries(bookmarksByTab)) {
            html += `<h4>${sanitizeHTML(tabTitle)}</h4><ul style='list-style: none; padding-left: 0;'>`;
            for (const bookmark of bookmarks) {
                const bmCheckId = `merge_bm_${bookmark._index}`;
                const indent = bookmark.parent_id ? "margin-left: 25px;" : "";
                const urlDisplay = bookmark.url ? ` - <em>${sanitizeHTML(bookmark.url)}</em>` : "";
                const parentClass = bookmark.parent_id ? 'merge-bookmark-child' : 'merge-bookmark-parent';
                const parentAttr = bookmark.parent_id ? `data-parent-id="${sanitizeHTML(bookmark.parent_id)}"` : '';
                html += `<li style="${indent}"><label><input type="checkbox" checked class="merge-bookmark-checkbox ${parentClass}" data-bookmark-index="${bookmark._index}" id="${bmCheckId}" ${parentAttr}> ${sanitizeHTML(bookmark.title)}${urlDisplay}</label></li>`;
            }
            html += "</ul>";
        }
    }
    
    if (mergeAnalysis.newTabsCount === 0 && mergeAnalysis.newBookmarksCount === 0) {
        html = "<p><em>No new items to add. All items already exist in your bookmarks.</em></p>";
    }
    
    content.innerHTML = html;
    
    // Add checkbox event handlers for parent-child relationships
    const bookmarkCheckboxes = content.querySelectorAll('.merge-bookmark-checkbox');
    bookmarkCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const bookmarkIndex = this.dataset.bookmarkIndex;
            const bookmark = mergeAnalysis.newBookmarks[bookmarkIndex];
            
            // If unchecking a parent, uncheck all children
            if (!this.checked && !bookmark.parent_id) {
                const children = content.querySelectorAll(`.merge-bookmark-child[data-parent-id="${bookmark.id}"]`);
                children.forEach(child => {
                    child.checked = false;
                });
            }
        });
    });
    
    // Set up event handlers
    const acceptBtn = document.getElementById("merge_preview_accept");
    const cancelBtn = document.getElementById("merge_preview_cancel");
    
    // Remove old listeners by cloning
    const newAcceptBtn = acceptBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Add new listeners
    newAcceptBtn.addEventListener("click", () => {
        // Get selected items
        const selectedTabIndices = [];
        const selectedBookmarkIndices = [];
        
        content.querySelectorAll('.merge-tab-checkbox:checked').forEach(checkbox => {
            selectedTabIndices.push(parseInt(checkbox.dataset.tabIndex));
        });
        
        content.querySelectorAll('.merge-bookmark-checkbox:checked').forEach(checkbox => {
            selectedBookmarkIndices.push(parseInt(checkbox.dataset.bookmarkIndex));
        });
        
        dialogsHide();
        onAccept(selectedTabIndices, selectedBookmarkIndices);
    });
    
    newCancelBtn.addEventListener("click", () => {
        dialogsHide();
    });
}

function dialogBookmarkTabListChanged() {
    const tabsList_elem = document.getElementById("dialog_bookmark_edit_tab");
    const tabId_elem = document.getElementById("dialog_bookmark_tab_id");
    const parentId_elem = document.getElementById("dialog_bookmark_parent_id");

    tabId_elem.value = tabsList_elem.value;
    console.info(`Bookmark Tab changed to ${tabId_elem.value} / ${tabsList_elem.options[tabsList_elem.selectedIndex].text}`);

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

        setTimeout(function () { messageShow(""); }, MESSAGE_TIMEOUT_SHORT);

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
        const bookmarkItems = dataFindItemsById(data_bookmarks, id);
        if (!bookmarkItems || bookmarkItems.length === 0) {
            console.error("ERROR: dialogsShowEditBookmark - Bookmark not found with id:", id);
            messageShow("Bookmark not found", MESSAGE_ERROR);
            return;
        }
        const bookmark = bookmarkItems[0];
        console.dir(bookmark);
        bookmark_id_elem.value = id;
        bookmark_tab_id_elem.value = bookmark.tab_id;
        bookmark_parent_id_elem.value = bookmark.parent_id;
        bookmark_title_elem.value = bookmark.title;
        bookmark_url_elem.value = bookmark.url;
        bookmark_url_target_elem.checked = bookmark.target === "_blank";
        bookmark_notes_elem.value = bookmark.note;
    }

    dialogBookmarkPopulateTabsList();

    // Show DIALOG_OVERLAY
    DIALOG_OVERLAY.style.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    DIALOG_OVERLAY.style.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    DIALOG_OVERLAY.style.display = "block";

    // Show dialog
    DIALOG_BOOKMARK.style.display = "block";
}

// Fix for systems with inability to import bookmarks

function cancel_bookmark_data_edit() {
    showBookmarksScreen();
}

function reload_bookmark_data_edit() {
    let tabs_data, bookmarks_data;
    
    try {
        tabs_data = JSON.parse(localStorage.getItem(DATA_TABS_KEY));
        bookmarks_data = JSON.parse(localStorage.getItem(DATA_BOOKMARKS_KEY));
    } catch (err) {
        console.error("ERROR: reload_bookmark_data_edit - Failed to parse data from localStorage:", err);
        messageShow("Error loading bookmark data for editing", MESSAGE_ERROR);
        return;
    }

    dialog_bookmark_edit_tabs.value = JSON.stringify(tabs_data, null, 4);
    dialog_bookmark_edit_bookmarks.value = JSON.stringify(bookmarks_data, null, 4);
}


function save_bookmark_data_edit() {
    let tabs_data_text, bookmarks_data_text;
    
    try {
        tabs_data_text = JSON.parse(dialog_bookmark_edit_tabs.value);
        bookmarks_data_text = JSON.parse(dialog_bookmark_edit_bookmarks.value);
    } catch (err) {
        console.error("ERROR: save_bookmark_data_edit - Failed to parse edited data:", err);
        messageShow("Error: Invalid JSON format in edited data", MESSAGE_ERROR);
        return;
    }

    try {
        localStorage.setItem(DATA_TABS_KEY, JSON.stringify(tabs_data_text));
        localStorage.setItem(DATA_BOOKMARKS_KEY, JSON.stringify(bookmarks_data_text));
    } catch (err) {
        console.error("ERROR: save_bookmark_data_edit - Failed to save to localStorage:", err);
        messageShow("Error: Failed to save data (quota exceeded?)", MESSAGE_ERROR);
        return;
    }

    // dataLoad();
    tab_selected = null;
    bookmark_selected = null;
    dataLoad();
    uiUpdate();
    showBookmarksScreen();
}

function dialogsShowEditData() {
    // hide the bookmarks and show the edit data dialog
    const bookmarks_screen = document.getElementById("bookmarks_screen");
    const search_screen = document.getElementById("search_screen");
    const bookmark_edit_screen = document.getElementById("bookmark_edit_screen");

    if (!bookmarks_screen || !search_screen || !bookmark_edit_screen) {
        console.error("ERROR: dialogsShowEditData - Failed to get required document elements");
        return;
    }
    bookmarks_screen.style.display = "none";
    search_screen.style.display = "none";
    bookmark_edit_screen.style.display = "block";

    reload_bookmark_data_edit();
}

function showBookmarksScreen() {
    // hide the edit data dialog and show the bookmarks screen
    const bookmarks_screen = document.getElementById("bookmarks_screen");
    const search_screen = document.getElementById("search_screen");

    const bookmark_edit_screen = document.getElementById("bookmark_edit_screen");
    if (!bookmarks_screen || !search_screen || !bookmark_edit_screen) {
        console.error("ERROR: showBookmarksScreen - Failed to get required document elements");
        return;
    }
    bookmarks_screen.style.display = "block";
    search_screen.style.display = "none";
    bookmark_edit_screen.style.display = "none";
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

    // Show DIALOG_OVERLAY
    DIALOG_OVERLAY.style.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    DIALOG_OVERLAY.style.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    DIALOG_OVERLAY.style.display = "block";

    // Show dialog
    DIALOG_TAB.style.display = "block";
}

// Add CSS for drop indicator (inject if not present)
(function addDropIndicatorStyle() {
    if (!document.getElementById('bookmark-drop-indicator-style')) {
        const style = document.createElement('style');
        style.id = 'bookmark-drop-indicator-style';
        style.textContent = `
            .bookmark-drop-indicator {
                transition: top 0.05s, left 0.05s, width 0.05s;
            }
            li.dragging {
                opacity: 0.5;
            }
        `;
        document.head.appendChild(style);
    }
})();


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

    if (!message || message.length === 0) {
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
        tabs_scroll_step = DEFAULT_TAB_SCROLL_STEP;
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
        const droppedTabItems = dataFindItemsById(data_tabs, data);
        const targetTabItems = dataFindItemsById(data_tabs, target_li_id);
        
        if (!droppedTabItems || droppedTabItems.length === 0 || !targetTabItems || targetTabItems.length === 0) return;
        
        const dropped_item = droppedTabItems[0];
        const target_item = targetTabItems[0];

        if (dropped_item && target_item) {
            console.info("tabDrop - Reorder")
            const dropped_index = data_tabs.findIndex(obj => obj.id === dropped_item.id);
            const target_index = data_tabs.findIndex(obj => obj.id === target_item.id);

            const move_item = data_tabs.splice(dropped_index, 1)[0];
            data_tabs.splice(target_index, 0, move_item);

            try {
                localStorage.setItem(DATA_TABS_KEY, JSON.stringify(data_tabs));
            } catch (err) {
                console.error("ERROR: tabDrop - Failed to save to localStorage:", err);
                messageShow("Error: Failed to save tab order", MESSAGE_ERROR);
                return;
            }
            
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
        if (tab_selected && tab.id === tab_selected.id) {
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

    if (tabs_container.scrollLeft === 0) {
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

// Add event listeners for edit data screen buttons
const editDataSaveBtn = document.getElementById("dialog_bookmark_edit_save");
if (editDataSaveBtn) {
    editDataSaveBtn.addEventListener("click", save_bookmark_data_edit);
}

const editDataReloadBtn = document.getElementById("dialog_bookmark_edit_reload");
if (editDataReloadBtn) {
    editDataReloadBtn.addEventListener("click", reload_bookmark_data_edit);
}

const editDataCloseBtn = document.getElementById("dialog_bookmark_edit_close");
if (editDataCloseBtn) {
    editDataCloseBtn.addEventListener("click", cancel_bookmark_data_edit);
}
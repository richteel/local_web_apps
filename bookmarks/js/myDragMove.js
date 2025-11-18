// REF: https://stackoverflow.com/questions/9334084/moveable-draggable-div

class myDragMove {
    static move(divid, xpos, ypos) {
        divid.style.left = xpos + 'px';
        divid.style.top = ypos + 'px';
    }

    static startMoving(divid, container, evt) {
        evt = evt || window.event;
        const posX = evt.clientX;
        const posY = evt.clientY;
        let divTop = divid.style.top;
        let divLeft = divid.style.left;
        const eWi = parseInt(divid.style.width);
        const eHe = parseInt(divid.style.height);
        const cWi = parseInt(document.getElementById(container).style.width);
        const cHe = parseInt(document.getElementById(container).style.height);
        document.getElementById(container).style.cursor = 'move';
        divTop = divTop.replace('px', '');
        divLeft = divLeft.replace('px', '');
        const diffX = posX - divLeft;
        const diffY = posY - divTop;
        document.onmousemove = function (evt) {
            evt = evt || window.event;
            let posX = evt.clientX;
            let posY = evt.clientY;
            let aX = posX - diffX;
            let aY = posY - diffY;
            if (aX < 0) aX = 0;
            if (aY < 0) aY = 0;
            if (aX + eWi > cWi) aX = cWi - eWi;
            if (aY + eHe > cHe) aY = cHe - eHe;
            myDragMove.move(divid, aX, aY);
        }
    }

    static stopMoving(container) {
        document.getElementById(container).style.cursor = 'default';
        document.onmousemove = null;
    }
}

function htmlEncode(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function htmlDecode(str) {
    const temp = document.createElement('textarea');
    temp.innerHTML = str;
    return temp.value;
}

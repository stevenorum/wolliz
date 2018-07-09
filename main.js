sendToWolliz = function(word){
};

chrome.contextMenus.create({
    title: "Grab wolliz data",
    contexts:["selection","image"],
    onclick: sendToWolliz
});

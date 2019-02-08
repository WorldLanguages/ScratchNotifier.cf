// Declare global variables and constants
var noNotifSession = false;
var doubleClick = true;
var msgCount;
var globalSessionTimeout;
var openedTab;
var altAccountsMsgCounts = {};
const bellClickActions = {
  "notifications_on": () => {
    globalSessionTimeout = setTimeout(() => {
      noNotifSession = false;
    }, 86400*1000); // A day
    noNotifSession = true;
    document.getElementById("bell-icon").innerText = "notifications_paused";
    toast({
      type: "info",
      title: "All notifications disabled for this session. Click the bell again to disable them permanently.",
      timer: 3000
    });
  },
  "notifications_paused": () => {
    if(globalSessionTimeout) clearTimeout(globalSessionTimeout);
    noNotifSession = false;
    scratchNotifier.globalNotifications = false;
    updateLocalStorage();
    document.getElementById("bell-icon").innerText = "notifications_off";
    toast({
      type: "info",
      title: "All notifications disabled. Click the bell anytime to enable them again.",
      timer: 3000
    });
  },
  "notifications_off": () => {
    scratchNotifier.globalNotifications = true;
    updateLocalStorage();
    document.getElementById("bell-icon").innerText = "notifications_on";
    toast({
      type: "success",
      title: "All notifications enabled.",
    });
  }
};

// By this point we are sure that the user either has v2 or v3 data in local storage
// If there's v3 local storage...
if(localStorage.getItem("scratchNotifier")) {
  scratchNotifier = JSON.parse(localStorage.getItem("scratchNotifier"));
  checkForUndefinedKeys();
} else {
  // If there's only  v2 local storage
  if(localStorage.getItem("username")) {
    scratchNotifier = {};
    scratchNotifier.mainUsername = localStorage.getItem("username");
    scratchNotifier.altAccounts = [];
    if(Number(localStorage.getItem("altEnabled"))) {
      const alt1 = {};
      alt1.username = localStorage.getItem("altAcc");
      alt1.notifications = localStorage.getItem("altNotifications") === "1" ? true : false;
      scratchNotifier.altAccounts.push(alt1);
      if(localStorage.getItem("alt2")) scratchNotifier.altAccounts.push({"username": localStorage.getItem("alt2"), "notifications": false});
      if(localStorage.getItem("alt3")) scratchNotifier.altAccounts.push({"username": localStorage.getItem("alt3"), "notifications": false});
    }
    scratchNotifier.settings = {};
    if(localStorage.getItem("sfx")) scratchNotifier.settings.sound = localStorage.getItem("sfx");
    if(localStorage.getItem("sound") === "0") scratchNotifier.settings.sound = "none";
    if(localStorage.getItem("notifTimeClose") !== "0") scratchNotifier.settings.closeNotification = 10;
    scratchNotifier.overviewDone = true;
    checkForUndefinedKeys(); // This also saves local storage
    notification("🎉 Scratch Notifier v3 is here!", "Scratch Notifier was completely remade to be way better! Click to take a look at it, and feel free to use the \"Send Feedback\" button!", "images/logo.png", () => window.focus());
  } else
  window.location = "/about.html"; // Shouldn't happen
}

function checkForUndefinedKeys() {
  if(scratchNotifier.globalNotifications === undefined) scratchNotifier.globalNotifications = true;
  if(scratchNotifier.altAccounts === undefined) scratchNotifier.altAccounts = [];
  if(scratchNotifier.settings === undefined) scratchNotifier.settings = {};
  if(scratchNotifier.settings.closeNotification === undefined) scratchNotifier.settings.closeNotification = 0;
  if(scratchNotifier.settings.sound === undefined) scratchNotifier.settings.sound = "system";
  if(scratchNotifier.overviewDone === undefined) {
    scratchNotifier.overviewDone = true;
    //overview();
  }
  updateLocalStorage();
}

// Handle notification when tab is freezed/discarded
if("serviceWorker" in navigator) navigator.serviceWorker.register('/OneSignalSDKWorker.js');
document.addEventListener("freeze", () => navigator.serviceWorker.controller.postMessage("discarded"));

// On body onload
function main() {
  // Handle UI
  if(!scratchNotifier.globalNotifications) document.getElementById("bell-icon").innerText = "notifications_off";
  setProfilePicAndUsername();
  parseAltAccounts();
  document.getElementsByTagName("body")[0].style.display = "block";
  // Handle message counts & settings
  checkMainMessages();
  setInterval(checkMainMessages, 30000);
  checkAltMessages();
  setInterval(checkAltMessages, 60000);
  settings();
}

// Main account messages ↓

async function checkMainMessages() {
  if(msgCount !== null) /* Constant*/ var oldMsgCount = msgCount;
  else oldMsgCount = 10**10; // Message count will be smaller than 10^10, so we won't notify the user at startup
  msgCount = await getMessageCount(scratchNotifier.mainUsername);
  if(oldMsgCount !== msgCount) {
    setFaviconAndTitle(true);
    document.getElementById("msg-count").innerText = msgCount;
    if(scratchNotifier.globalNotifications && !noNotifSession && msgCount > oldMsgCount) notification(`${msgCount} unread message${s(msgCount)}`, "Click to open messages", "/images/logo.png", () => openScratch('/messages'));
  } else setFaviconAndTitle(false);
}


function setFaviconAndTitle(countChanged) {
  if(countChanged) {
    // Change favicon
    document.querySelector("link[rel*='icon']").href = "images/logo.png";
    if(msgCount > 0) {
      const favicon = new Favico({
        type : "rectangle",
      });
      favicon.badge(msgCount);
    }
    // Change title
    if(msgCount === 0) document.title = "Scratch Notifier";
    else document.title = `(${msgCount}) Scratch Notifier`;
  } else {
    if(document.title.endsWith(".")) {
      if(msgCount === 0) document.title = "Scratch Notifier";
      else document.title = `(${msgCount}) Scratch Notifier`;
    } else {
      if(msgCount === 0) document.title = "Scratch Notifier.";
      else document.title = `(${msgCount}) Scratch Notifier.`;
    }
  }
}

// Change main username ↓

async function changeUsernameAlert() {
  const alert = await swal({
    title: "Enter a new username",
    input: "text"
  });
  const username = alert.value;
  if(username) {
    const usernameValid = await getValidUsername(username);
    if(usernameValid) {
      changeMainUsername(usernameValid);
      toast({
        type: "success",
        title: `Hello, ${usernameValid}! 🎉`
      });
    }
    else
    toast({
      type: "error",
      title: "Error: username doesn't exist. 😭"
    });
  }
}

function changeMainUsername(username) {
  scratchNotifier.mainUsername = username;
  updateLocalStorage();
  setProfilePicAndUsername();
  msgCount = 10**10;
  checkMainMessages();
}

// Handle UI ↓

function setProfilePicAndUsername() {
  loadProfilePicture(scratchNotifier.mainUsername, document.getElementById("profile-pic"));
  document.getElementById("username").innerText = scratchNotifier.mainUsername;
}

function settings() {
  // Select correct option on sound effect dropdown
  for (var i = 0; i < document.getElementById("sfx").options.length; i++) {
    if(document.getElementById("sfx").options[i].value === scratchNotifier.settings.sound) {
      document.getElementById("sfx").selectedIndex = i;
      break;
    }
  }
  // Handle changes on sound effect dropdown
  document.getElementById("sfx").onchange = () => {
    const newValue = document.getElementById("sfx").options[document.getElementById("sfx").selectedIndex].value;
    scratchNotifier.settings.sound = newValue;
    updateLocalStorage();
    if(newValue !== "none" && newValue !== "system") {
      new Audio("sounds/" + newValue + ".wav").play();
    }
  };

  // Select correct option on close notification timeout
  for (var i = 0; i < document.getElementById("close-notifications").options.length; i++) {
    if(document.getElementById("close-notifications").options[i].value === String(scratchNotifier.settings.closeNotification)) {
      document.getElementById("close-notifications").selectedIndex = i;
      break;
    }
  }
  // Handle changes on close notification timeout
  document.getElementById("close-notifications").onchange = () => {
    const newValue = document.getElementById("close-notifications").options[document.getElementById("close-notifications").selectedIndex].value;
    scratchNotifier.settings.closeNotification = Number(newValue);
    updateLocalStorage();
  };
}

// Alt accounts ↓

function parseAltAccounts() {
  // Show "add alt" button only if necessary
  if(scratchNotifier.altAccounts.length < 3) document.getElementById("add-alt").style.display = "block";
  else document.getElementById("add-alt").style.display = "none";
  // Hide alt rows without user
  for (var i = 0; i < document.getElementsByClassName("alt-row").length; i++) {
    document.getElementsByClassName("alt-row")[i].style.display = "none";
  }
  // Parse and show correct settings
  for (var i = 0; i < scratchNotifier.altAccounts.length; i++) {
    if(scratchNotifier.altAccounts[i].username !== document.getElementsByClassName("alt")[i].innerText) loadProfilePicture(scratchNotifier.altAccounts[i].username, document.getElementsByClassName("alt-profile-pic")[i])
    document.getElementsByClassName("alt")[i].innerText = scratchNotifier.altAccounts[i].username;
    const altBell = document.getElementsByClassName("alt-row")[i].getElementsByClassName("alt-bell")[0];
    if(scratchNotifier.altAccounts[i].notifications) altBell.innerText = "notifications_on"
    else altBell.innerText = "notifications_off";
    document.getElementsByClassName("alt-row")[i].style.display = "block";
  }
}

function editAltUsernameTo(i, username){
  scratchNotifier.altAccounts[i] = {"username": username, "notifications": scratchNotifier.altAccounts[i].notifications};
  updateLocalStorage();
  parseAltAccounts();
  checkAltMessages();
  toast({
    type: "success",
    title: "Changed username succesfully."
  });
}

async function editAltUsernameAlert(i) {
  const oldUsername = scratchNotifier.altAccounts[i].username;
  const alert = await swal({
    title: "Enter a new username",
    input: "text"
  });
  const username = alert.value;
  if(username) {
    const usernameValid = await getValidUsername(username);
    if(usernameValid) {
      editAltUsernameTo(i, usernameValid);
    }
    else
    toast({
      type: "error",
      title: "Error: username doesn't exist."
    });
  }
}

function deleteAlt(i) {
  scratchNotifier.altAccounts.splice(i, 1);
  updateLocalStorage();
  parseAltAccounts();
}

function switchAlt(i) {
  const altUsername = scratchNotifier.altAccounts[i].username;
  const mainUsername = scratchNotifier.mainUsername;
  editAltUsernameTo(i, mainUsername);
  changeMainUsername(altUsername);
}

function altNotificationChange(i) {
  const notificationsWereTurnedOn = document.getElementsByClassName("alt-bell")[i].innerText === "notifications_on";
  document.getElementsByClassName("alt-bell")[i].innerText = `notifications_${notificationsWereTurnedOn ? "off" : "on"}`;
  scratchNotifier.altAccounts[i].notifications = !notificationsWereTurnedOn;
  updateLocalStorage();
}

async function addAltAlert() {
  const alert = await swal({
    title: "Enter a Scratch username",
    input: "text"
  });
  const username = alert.value;
  if(username) {
    const usernameValid = await getValidUsername(username);
    if(usernameValid) {
      // Add alt
      scratchNotifier.altAccounts.push({"username": username, "notifications": false});
      updateLocalStorage();
      parseAltAccounts();
    }
    else
    toast({
      type: "error",
      title: "Error: username doesn't exist. 😭"
    });
  }
}

function checkAltMessages() {
  for (index in scratchNotifier.altAccounts) checkSingleAltMessages(index);
}

async function checkSingleAltMessages(i) {
  const altUsername = scratchNotifier.altAccounts[i].username;
  const msgCountAlt = await getMessageCount(altUsername);
  if(document.getElementsByClassName("alt")[i].innerText === altUsername) document.getElementsByClassName("alt-msg-count")[i].innerText = msgCountAlt;
  if(altAccountsMsgCounts[altUsername]) {
    const previousAltMsgCount = altAccountsMsgCounts[altUsername];
    altAccountsMsgCounts[altUsername] = msgCountAlt;
    if(scratchNotifier.altAccounts[i].notifications && msgCountAlt > previousAltMsgCount) notification(`${username}: ${altMsgCount} message${s(altMsgCount)}`, "Click to close this notification", profilePic);
  } else altAccountsMsgCounts[altUsername] = msgCountAlt;
}

// General functions ↓

function getMessageCount(username) {
  return new Promise(async resolve => {
    const req = await fetch(`https://cors.io/?https://api.scratch.mit.edu/users/${username}/messages/count?${Math.floor(Date.now())}`);
    const res = await req.json();
    resolve(res.count);
  });
}

function notification(title, body, icon, onClickDo) {
  if(noNotifSession || !scratchNotifier.globalNotifications) return;
  const notification = new Notification(title, {
    body: body,
    icon: icon,
    requireInteraction: scratchNotifier.settings.closeNotification === 0,
    silent: scratchNotifier.settings.sound !== "system"
  });
  notification.onclick = () => {
    notification.close();
    onClickDo();
  };
  if(scratchNotifier.settings.sound !== "system" && scratchNotifier.settings.sound !== "none") {
    notification.onshow = () => {
      new Audio(`/sounds/${scratchNotifier.settings.sound}.wav`).play();
    }
  }
  if(scratchNotifier.settings.closeNotification) {
    setTimeout(() => {
      notification.close();
    }, scratchNotifier.settings.closeNotification*1000); // Seconds to milliseconds
  }
}

async function loadProfilePicture(username, imageElement) {
  imageElement.style.visibility = "hidden";
  const req = await fetch(`https://cors.io/?https://api.scratch.mit.edu/users/${username}`);
  const res = await req.json();
  imageElement.src = `https://cdn2.scratch.mit.edu/get_image/user/${res.id}_256x256.png`;
  imageElement.style.visibility = "visible";
}

function getValidUsername(username) {
  if(username[0] === "@") /* Constant */ var username = username.substring(1,username.length);
  return new Promise(async resolve => {
    const req = await fetch(`https://cors.io/?https://api.scratch.mit.edu/users/${username}`);
    if(req.status === 200) resolve((await req.json()).username);
    else resolve(false);
  });
}

function openScratch(url) {
  const fullURL = `https://scratch.mit.edu${url}`;
  if(openedTab) {
    if(openedTab.closed || window.chrome) openedTab = window.open(fullURL);
    else {
      openedTab.focus();
      openedTab.location.replace(fullURL);
    }
  } else
  openedTab = window.open(fullURL);
}

function updateLocalStorage() {
  localStorage.setItem("scratchNotifier", JSON.stringify(scratchNotifier));
}

// Returns "s" only if the number should go with a plural noun
function s(value) {
  if(value === 1) return "";
  else return "s";
}

// Sweetalert toast
const toast = swal.mixin({
  toast: true,
  position: "center",
  showConfirmButton: false,
  timer: 3000
});

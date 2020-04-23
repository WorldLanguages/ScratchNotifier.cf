// Declare global variables and constants
var noNotifSession = false;
var doubleClick = true;
var lastMainCheck = 0;
var msgCount;
var globalSessionTimeout;
var openedTab;
var altAccountsMsgCounts = {};
var corsIoWorks = true;
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
const bgUploadOnChange = () => {
  const getBase64Image = function getBase64Image(img) {var canvas=document.createElement("canvas");canvas.width=img.width;canvas.height=img.height;var ctx=canvas.getContext("2d");ctx.drawImage(img,0,0);var dataURL=canvas.toDataURL("image/png");return dataURL;}
  const uploadedImage = document.createElement("img");
  const imageReader = new FileReader();
  imageReader.readAsDataURL(document.getElementById("bg-upload").files[0]);
  imageReader.onload = e => {
    localStorage.setItem("customBg",  e.target.result);
    setBackground(true);
  }
}
const privacy = `
Scratch Notifier uses the following services. They may collect data according to their Terms of Service and Privacy Policies.
<br>Hosting services: GitHub (Pages), Cloudflare (free plan).
<br>Other services: Scratch API, Google Analytics, OneSignal (free plan), Google font CDN.
<br><br>Scratch Notifier also currently uses proxy services to interact with the Scratch API because of the temporal removal of the Access-Control-Allow-Origin HTTP header.
<br>By default, the CORS proxy used is cors.io, ran by Dean Pierce.
<br>However, sometimes that proxy cannot be used by some users because it's blocked by parental controls or similar software.
In those scenarios, api.scratchnotifier.cf (ran by Scratcher DatOneLefty) will be used instead.
`;

// Handle freezes and discards
document.addEventListener("freeze", () => {
  navigator.serviceWorker.controller.postMessage("discarded");
  scratchNotifier.freezeCount += 1;
  updateLocalStorage();
});
if(document.wasDiscarded) {
  scratchNotifier.discardCount += 1;
  // Local storage will be updated later by another script
}


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
  if(scratchNotifier.settings.background === undefined) scratchNotifier.settings.background = "none";
  if(scratchNotifier.overviewDone === undefined) {
    scratchNotifier.overviewDone = true;
    window.addEventListener("load", overview);
  }
  if(scratchNotifier.freezeCount === undefined) scratchNotifier.freezeCount = 0;
  if(scratchNotifier.discardCount === undefined) scratchNotifier.discardCount = 0;
  updateLocalStorage();
}

// On body onload
function main() {
  // Handle UI
  if(!scratchNotifier.globalNotifications) document.getElementById("bell-icon").innerText = "notifications_off";
  setProfilePicAndUsername();
  parseAltAccounts();
  setBackground();
  document.body.style.display = "block";
  // Handle message counts & settings
  checkMainMessages();
  setInterval(checkMainMessages, 20000);
  // Note: if you change this ↑ interval, please also take a look at the first line on checkMainMessages()
  checkAltMessages();
  setInterval(checkAltMessages, 60000);
  settingsHTML = document.getElementById("notifier-settings").innerHTML;
  document.getElementById("notifier-settings").remove();
  // OneSignal tags
  OneSignal.push(function() {
    OneSignal.sendTag("freezeCount", scratchNotifier.freezeCount);
    OneSignal.sendTag("discardCount", scratchNotifier.discardCount);
    OneSignal.sendTag("ram", navigator.deviceMemory); // RAM size - only works on Chrome
    OneSignal.sendTag("corsIoWorks", "1");
  });
}

function setBackground(calledFromSettings) {
  if(scratchNotifier.settings.background === "none") document.body.style.backgroundImage = "";
  if(scratchNotifier.settings.background === "random") {
    toast({
      type: "info",
      text: "Loading background...",
      timer: null
    });
    const bgImg = new Image();
    bgImg.src = 'https://picsum.photos/'+ screen.width +'/' + screen.height + '/?random';
    bgImg.onload = () => {
      document.body.style.backgroundImage = `url(${bgImg.src})`;
      document.getElementById("scratch-notifier").style.backgroundColor = "rgba(241,241,241,0.3)";
      swal.close();
      if(calledFromSettings) settings();
    }
  }
  if(scratchNotifier.settings.background === "custom") {
    if(!localStorage.getItem("customBg")) {
      document.body.style.backgroundImage = "";
      return;
    }
    const bgImg = localStorage.getItem("customBg");
    document.body.style.backgroundImage = `url(${bgImg})`;
    document.getElementById("scratch-notifier").style.backgroundColor = "rgba(241,241,241,0.3)";
  }
}

// Main account messages ↓

async function checkMainMessages(ignoreLastMainCheck) {
  // Avoid computer sleep causing many calls to this function at once, sending many notifications
  // ignoreLastMainCheck is true only when an alt is being switched with main
  if(!ignoreLastMainCheck && (new Date().getTime() - lastMainCheck) < 5000) return;
  lastMainCheck = new Date().getTime();

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
  checkMainMessages(true);
}

// Handle UI ↓

function setProfilePicAndUsername() {
  loadProfilePicture(scratchNotifier.mainUsername, document.getElementById("profile-pic"));
  document.getElementById("username").innerText = scratchNotifier.mainUsername;
}

function settings() {
  // Add sweetalert
  swal({
    title: "Settings",
    html: settingsHTML,
    confirmButtonText: "Close"
  });

  // Select correct option on sound effect dropdown
  for (var i in document.getElementById("sfx").options) {
    if(document.getElementById("sfx").options[i].value === scratchNotifier.settings.sound) {
      document.getElementById("sfx").selectedIndex = i;
      break;
    }
  }
  // Handle changes on sound effect dropdown
  document.getElementById("sfx").onchange = () => {
    const newValue = document.getElementById("sfx").value;
    scratchNotifier.settings.sound = newValue;
    updateLocalStorage();
    if(newValue !== "none" && newValue !== "system") {
      new Audio("sounds/" + newValue + ".wav").play();
    }
  };

  // Select correct option on close notification timeout
  for (var i in document.getElementById("close-notifications").options) {
    if(document.getElementById("close-notifications").options[i].value === String(scratchNotifier.settings.closeNotification)) {
      document.getElementById("close-notifications").selectedIndex = i;
      break;
    }
  }

  // Handle changes on background setting
  document.getElementById("background-setting").onchange = () => {
    const newValue = document.getElementById("background-setting").value;
    scratchNotifier.settings.closeNotification = Number(newValue);
    updateLocalStorage();
  };

  // Select correct option on background setting
  for (var i in document.getElementById("background-setting").options) {
    if(document.getElementById("background-setting").options[i].value === scratchNotifier.settings.background) {
      document.getElementById("background-setting").selectedIndex = i;
      break;
    }
  }
  if(scratchNotifier.settings.background === "custom") document.getElementById("bg-upload").style.display = "inline-block";
  // Handle changes on close notification timeout
  document.getElementById("background-setting").onchange = () => {
    document.getElementById("bg-upload").style.display = "none";
    const newValue = document.getElementById("background-setting").value;
    scratchNotifier.settings.background = newValue;
    updateLocalStorage();
    setBackground(true);
    if(newValue === "custom") document.getElementById("bg-upload").style.display = "inline-block";
  };
}

async function overview() {
  await swal({
    title: "Welcome to Scratch Notifier!",
    text: "Let me teach you the basics.",
    type: "info",
    confirmButtonText: "Okay :D",
    allowOutsideClick: false,
  });
  await swal({
    title: "Double click anywhere in the page to open your Scratch messages.",
    type: "info",
    confirmButtonText: "Got it!",
    allowOutsideClick: false,
  });
  await swal({
    title: "Disable all Scratch Notifier notifications anytime by clicking the bell on the top right.",
    type: "info",
    confirmButtonText: "Gotcha!",
    allowOutsideClick: false,
  });
  await swal({
    title: "Change the username you're getting notifications from in the top left.",
    text: "You can also access the settings from there.",
    type: "info",
    confirmButtonText: "Got it!",
    allowOutsideClick: false,
  });
  await swal({
    title: "Have secondary/alt accounts? Add them here!",
    text: "Click the \"Add alt account\" button, and get notified when your alt accounts get new messages!",
    type: "info",
    confirmButtonText: "Gotcha!",
    allowOutsideClick: false,
  });
  await swal({
    title: "IMPORTANT: Make sure to keep the notifier open at all times!",
    text: "Please remember to not close the notifier tab, or you'll stop receiving notifications!",
    type: "warning",
    confirmButtonText: "Got it!",
    allowOutsideClick: false,
  });
  await swal({
    title: "We're done - but we need you to do one last *IMPORTANT* step!",
    text: "Please right click this tab and select \"Pin\". This will automatically open Scratch Notifier the next time you launch your browser, and will also help your browser know message notifications are important to you.",
    confirmButtonText: "I pinned it! Let's go!",
    allowOutsideClick: false,
    imageUrl: "images/pintab.gif",
    imageHeight: (screen.height/100)*33 // SweetAlert2 only accepts pixel values
  });
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
    if(document.getElementsByClassName("alt")[i] && (scratchNotifier.altAccounts[i].username !== document.getElementsByClassName("alt")[i].innerText)) loadProfilePicture(scratchNotifier.altAccounts[i].username, document.getElementsByClassName("alt-profile-pic")[i])
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
      scratchNotifier.altAccounts.push({"username": usernameValid, "notifications": false});
      updateLocalStorage();
      parseAltAccounts();
      checkAltMessages();
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
    if(scratchNotifier.altAccounts[i].notifications && msgCountAlt > previousAltMsgCount) notification(`${altUsername}: ${msgCountAlt} message${s(msgCountAlt)}`, "Click to close this notification", document.getElementsByClassName("alt-profile-pic")[i].src);
  } else altAccountsMsgCounts[altUsername] = msgCountAlt;
}

// General functions ↓

function getMessageCount(username) {
  return new Promise(async resolve => {
    // const res = await requestAPI(`users/${username}/messages/count`);
    const res = await requestAPI(`msgcount/${username}`);
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
  const res = await requestAPI(`users/${username}`);
  imageElement.src = `https://cdn2.scratch.mit.edu/get_image/user/${res.id}_256x256.png`;
  imageElement.style.visibility = "visible";
}

function getValidUsername(username) {
  if(username[0] === "@") /* Constant */ var username = username.substring(1,username.length);
  return new Promise(async resolve => {
    const res = await requestAPI(`users/${username}`);
    if(!res.code) resolve(res.username);
    else resolve(false);
  });
}

async function requestAPI(endpoint) {
  return new Promise(async resolve => {
      //const req = /*corsIoWorks ? await fetch(`https://cors.io/?https://api.scratch.mit.edu/${endpoint}`) :*/ 
      let url;
      if(endpoint.startsWith("msgcount")) url = `https://scratchproxy.hampton.pw/notifications/v1/${endpoint.slice(9)}?avoidcache=${Date.now()}`;
      else url = `https://notifier.worldxlanguages.workers.dev/${endpoint}`;
      const req = await fetch(url);
      const res = await req.json();
      resolve(res);
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

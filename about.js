function askNotificationPermission() {
  if(Notification.permission === "default") {
    Notification.requestPermission();
    swal({
      title: "Please let us send notifications",
      text: "Don't worry, you'll be able to disable them anytime later.",
    });
    notificationInterval = setInterval(function() {
      if(Notification.permission === "granted") {
        askForUsername(false);
        clearInterval(notificationInterval);
      }
    }, 500);
  }
  if(Notification.permission === "granted") {
    askForUsername(false);
  }
  if(Notification.permission === "denied") {
    swal({
      title: "Oh no! We can't ask you for the notification permission!",
      text: "To use Scratch Notifier, please allow us to send notifications. This can be often be changed by clicking on the lock next to the address bar.",
      type: "error"
    });
  }
}

async function askForUsername(error) {
  const callback = await swal({
    title: error === false ? "Please enter your Scratch username" : "Oh oh! That username doesn't seem to exist. Try again!",
    text: "You'll be able to change this later :)",
    input: "text",
    inputPlaceholder: "griffpatch",
    type: error === false ? "" : "error"
  });
  const username = callback.value;
  if(!username) return;
  const validUsername = await getValidUsername(username);
  if(validUsername) setUsername(validUsername);
  else askForUsername(true);
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
    try {
      if(corsIoWorks) var req = await fetch(`https://cors.io/?https://api.scratch.mit.edu/${endpoint}`);
      else var req = await fetch(`https://api.scratchnotifier.cf/scratch/${endpoint}`);
      const res = await req.json();
      resolve(res);
    } catch(err) {
      console.log(err);
      if(corsIoWorks) {
        corsIoWorks = false;
        resolve(await requestAPI(endpoint));
      }
    }
  });
}

corsIoWorks = true;
function setUsername(username) {
  var scratchNotifier = {};
  scratchNotifier.mainUsername = username;
  localStorage.setItem("scratchNotifier", JSON.stringify(scratchNotifier));
  window.location.href = "/";
}

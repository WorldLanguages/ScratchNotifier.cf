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

function askForUsername(error) {
  swal({
    title: error === false ? "Please enter your Scratch username" : "Oh oh! That username doesn't seem to exist. Try again!",
    text: "You'll be able to change this later :)",
    input: "text",
    inputPlaceholder: "griffpatch",
    type: error === false ? "" : "error"
  })
  .then(function(callback) {
    var username = callback.value;
    if(username[0] === "@") var username = username.substring(1,username.length);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "https://cors.io/?https://api.scratch.mit.edu/users/" + username, true);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState === 4) {
        if(xmlhttp.status === 200) setUsername(JSON.parse(xmlhttp.responseText).username);
        else askForUsername(true);
      }
    };
  });
}

function setUsername(username) {
  var scratchNotifier = {};
  scratchNotifier.mainUsername = username;
  localStorage.setItem("scratchNotifier", JSON.stringify(scratchNotifier));
  window.location.href = "/";
}

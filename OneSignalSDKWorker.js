importScripts('https://cdn.onesignal.com/sdks/OneSignalSDK.js');

self.addEventListener('message', function(event){
  if(event.data === "discarded")
  self.registration.showNotification("Oh oh! Your browser killed us!", {
    body: "Please click (focus) the Scratch Notifier tab in your browser! If you don't do this, you'll stop receiving new message notifications!",
    tag: "discardNotif",
    requireInteraction: true,
    icon: "/images/crying.png"
});
});

self.addEventListener('notificationclick', function(event) {
  if(event.notification.tag === "discardNotif")
  event.notification.close();
});

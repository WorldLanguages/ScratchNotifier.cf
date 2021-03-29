// Initialize scratchNotifier.status
scratchNotifier.status=scratchNotifier.status||{}
scratchNotifier.status.loggedIn=scratchNotifier.status.loggedIn||false;
scratchNotifier.status.hasLoggedInEver=scratchNotifier.status.hasLoggedInEver||false;

// Set up elements

// Only show the new feature indicator for first-time users from now until May 1st 2021
document.querySelector("#status-new").style.display=(Date.now()<1619841600000 && !scratchNotifier.status.hasLoggedInEver)?"inline":"none";

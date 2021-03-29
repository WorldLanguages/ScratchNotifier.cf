(function(){
  // Used throughout the whole script
  let domReady, slo, sli
  // Used for events.
  window.scratchStatus={};
  // Initialize scratchNotifier.status
  scratchNotifier.status=scratchNotifier.status||{}
  scratchNotifier.status.tokens=scratchNotifier.status.tokens||{};
  scratchNotifier.status.hasLoggedInEver=scratchNotifier.status.hasLoggedInEver||false;
  scratchNotifier.status.invisible=scratchNotifier.status.invisible||false;
  updateLocalStorage()
  window.scratchStatus.onUserChange=function onUserChange(){
    if(domReady)
      if(scratchNotifier.status.tokens[scratchNotifier.mainUsername]){
        slo.style.display="inline"
        sli.style.display="none"
      } else {
        sli.style.display="inline"
        slo.style.display="none"
      }
  }
  document.addEventListener("DOMContentLoaded", function(){
    domReady=true;
    // Set up elements
    // Only show the new feature indicator for first-time users from now until May 1st 2021
    document.querySelector("#status-new").style.display=(Date.now()<1619841600000 && !scratchNotifier.status.hasLoggedInEver)?"inline":"none";
    slo = document.querySelector("#status-logged-out")
    sli = document.querySelector("#status-logged-in")
    window.scratchStatus.onUserChange()
  })
})();

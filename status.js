(function(){
  // Used throughout the whole script
  let isDomReady, slo, sli, domReady;
  domReady=new Promise(cb=>{
    document.addEventListener("DOMContentLoaded", cb)
  })
  // Used for events.
  window.scratchStatus={};
  window.scratchStatus.onUserChange=function onUserChange(){
    if(isDomReady)
      if(scratchNotifier.status.tokens[scratchNotifier.mainUsername]){
        sli.style.display="inline"
        slo.style.display="none"
      } else {
        slo.style.display="inline"
        sli.style.display="none"
      }
  }
  
  // Initialize scratchNotifier.status
  scratchNotifier.status=scratchNotifier.status||{}
  scratchNotifier.status.tokens=scratchNotifier.status.tokens||{};
  scratchNotifier.status.hasLoggedInEver=scratchNotifier.status.hasLoggedInEver||false;
  scratchNotifier.status.invisible=scratchNotifier.status.invisible||false;
  updateLocalStorage()
  
  // Check if we just logged in
  let usp=new URLSearchParams(location.search)
  if(usp.get("statusLogin")){
    history.pushState("","",location.origin+location.pathname) // strip hash and query
    if(usp.get("status")=="success"&&usp.get("token")){
      scratchNotifier.status.tokens[scratchNotifier.mainUsername]=usp.get("token")
      scratchNotifier.status.hasLoggedInEver=true;
      updateLocalStorage()
      window.scratchStatus.onUserChange()
    } else {
      domReady.then(()=>swal({text:"Looks like you denied permission to update your status. Please log in again."}))
    }
  }
  
  function login(){
    location.href="https://scratchstatus-api.glitch.me/v1/auth/" + encodeURIComponent(scratchNotifier.mainUsername) + "/" + encodeURIComponent(location.origin+location.pathname+"?statusLogin=1");
  }
  
  document.addEventListener("DOMContentLoaded", function(){
    isDomReady=true;
    // Set up elements
    // Only show the new feature indicator for first-time users from now until May 1st 2021
    document.querySelector("#status-new").style.display=(Date.now()<1619841600000 && !scratchNotifier.status.hasLoggedInEver)?"inline":"none";
    slo = document.querySelector("#status-logged-out")
    sli = document.querySelector("#status-logged-in")
    document.querySelector("#status-login").addEventListener("click", login);
    window.scratchStatus.onUserChange()
  })
})();

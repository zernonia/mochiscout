// Tracking script founders add to their own site. It reports a visit when a
// page opens with ?ref=ms_<code>, remembers the code for 30 days, and reports
// a sign-up when the site calls mochiscout('signup'). No cookies, no IPs kept.
const SCRIPT = `(function(){
var s=document.currentScript;if(!s)return;
var p=s.getAttribute('data-project'),h=new URL(s.src).origin,K='ms_ref';
function send(e,c){var b=JSON.stringify({p:p,c:c,e:e});try{if(navigator.sendBeacon&&navigator.sendBeacon(h+'/api/t',b))return}catch(x){}fetch(h+'/api/t',{method:'POST',body:b,keepalive:true,mode:'no-cors'})}
try{var m=location.search.match(/[?&]ref=ms_([a-z0-9]{4,12})/i);if(m){var c=m[1].toLowerCase();localStorage.setItem(K,c+'|'+Date.now());if(!sessionStorage.getItem(K+c)){sessionStorage.setItem(K+c,'1');send('visit',c)}}}catch(x){}
window.mochiscout=function(ev){if(ev!=='signup')return;try{var r=(localStorage.getItem(K)||'').split('|');if(r[0]&&Date.now()-Number(r[1])<2592e6){send('signup',r[0]);localStorage.removeItem(K)}}catch(x){}};
})();`

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
  })
  return SCRIPT
})

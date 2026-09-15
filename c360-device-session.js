(function(){
  'use strict';
  var MAIN_SESSION='controla_beta_session';
  var DEVICE_SESSION='c360_device_session';
  var DEVICE_MODE='c360_device_mode';
  var LEGACY_DEVICE_MODE='controla_device_mode';
  function read(key){try{return localStorage.getItem(key)||'';}catch(_){return '';}}
  function write(key,value){try{localStorage.setItem(key,value);}catch(_){}}
  function marked(){return read(DEVICE_MODE)==='1'||read(LEGACY_DEVICE_MODE)==='1';}
  function restore(){var saved=read(DEVICE_SESSION);if(saved&&marked()&&read(MAIN_SESSION)!==saved)write(MAIN_SESSION,saved);}
  function preserve(){var current=read(MAIN_SESSION);if(!current)return;write(DEVICE_SESSION,current);write(DEVICE_MODE,'1');write(LEGACY_DEVICE_MODE,'1');}
  restore();
  function watch(){
    if(!document.body)return;
    if(document.body.classList.contains('device-mode'))preserve();
    new MutationObserver(function(){if(document.body.classList.contains('device-mode'))preserve();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();

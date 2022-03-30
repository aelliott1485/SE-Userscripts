// ==UserScript==
// @name        Admin Flag Notifier
// @namespace   https://github.com/Glorfindel83/
// @description Refreshes the flag dashboard automatically and sends desktop notifications when there are new flags.
// @author      Glorfindel & aelliott1485
// @updateURL   https://raw.githubusercontent.com/aelliott1485/SE-Userscripts/update-admin-flag-notifier/admin-flag-notifier/admin-flag-notifier.user.js
// @downloadURL https://raw.githubusercontent.com/aelliott1485/SE-Userscripts/update-admin-flag-notifier/admin-flag-notifier/admin-flag-notifier.user.js
// @version     0.4
// @match       *://*.stackexchange.com/admin/dashboard*
// @match       *://stackoverflow.com/admin/dashboard*
// @match       *://*.stackoverflow.com/admin/dashboard*
// @match       *://superuser.com/admin/dashboard*
// @match       *://*.superuser.com/admin/dashboard*
// @match       *://serverfault.com/admin/dashboard*
// @match       *://*.serverfault.com/admin/dashboard*
// @match       *://askubuntu.com/admin/dashboard*
// @match       *://*.askubuntu.com/admin/dashboard*
// @match       *://*.stackapps.com/admin/dashboard*
// @match       *://mathoverflow.net/admin/dashboard*
// @match       *://*.mathoverflow.net/admin/dashboard*
// @grant       none
// ==/UserScript==

(function () {
  "use strict";
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
  //change to false to auto-hide time filters
  const LIMIT_NOTIFICAITON_HOURS = false;
  //emailJS configuration values
  const service_id = 'service_********';
  const template_id = 'template_********';
  const user_id = 'user_********';

  // Determine site name
  const host = window.location.host;
  const [sitename] = host.split(".");

  // Determine current amount of flags
  const currentTitle = $("title").text();
  let currentFlags = parseInt(currentTitle);
  let mailSent = false;
  const table = $('div[data-can-be="flag-table-of-contents"]');
  const notification = $('<div></div>')
  notification.html('starting timer')
  table.before(notification);
  const limitNotificationCheckbox = $(`<input/>`)
      .attr({id: 'limitByTime', type: 'checkbox'});
  LIMIT_NOTIFICAITON_HOURS && limitNotificationCheckbox.attr('checked', 1);
  const limitContainer = $('<div></div>');
  const label = $('<label for="limitByTime">Limit sending notifications</label>');
  table.before([limitNotificationCheckbox, label, limitContainer.toggle(LIMIT_NOTIFICAITON_HOURS)])
  limitNotificationCheckbox.click(_ => limitContainer.toggle(limitNotificationCheckbox.prop('checked')));
  limitContainer.append($('<div>send notifications between:</div>'));
  limitContainer.append($('<input type="time" id="minTime" value="07:00" />'));
  limitContainer.append($('<input type="time" id="maxTime" value="22:00" />'));
  const sendMailNotification = async flags => {
    const URL = 'https://api.emailjs.com/api/v1.0/email/send';
    const data = {
      service_id,
      template_id,
      user_id,
      template_params: {
        message_html: location.href + ' flags: ' + flags,
        message_subject: location.pathname.split('/')[2]
      }
    };
    try {
      const response = await $.post({
        url: URL,
        data: JSON.stringify(data),
        contentType: 'application/json'
      });
      mailSent = true;
      console.log('response from email send: ', response);
    } catch(error) { notification.text(error.message); }
  };
  setInterval(function () {
    let checkbox = document.getElementById("chk-apply-filters");
    if (checkbox == null) {
      checkbox = document.getElementsByClassName("js-toggle-apply-filters")[0];
    }
    const url = `https://${host}/admin/dashboard`;//?filtered=' + !checkbox.checked;
    const date = new Date();
    notification.html(` ${date.toLocaleTimeString()} Calling: ${url}`);
    function shouldSendNotification() {
      if (mailSent) {
        return false;
      }
      if (limitNotificationCheckbox.is(':checked')) {
        const minTime = new Date()
        minTime.setHours(...$('#minTime').val().split(':'));
        const maxTime = new Date();
        maxTime.setHours(...$('#maxTime').val().split(':'));
        return date.getTime() >= minTime.getTime() && date.getTime() <= maxTime.getTime();
      }
      return true;
    }
    $.get(url, function (data) {
      const updatedTitle = $("<html/>").html(data).find("title").text();
      const updatedFlags = parseInt(updatedTitle);
      console.log("Update: " + updatedFlags);

      // TODO: check on flag IDs instead
      if (updatedFlags < currentFlags) {
        console.log("Less flags.");
        // presumably, some flags have been handled and the page needs to be reloaded
        window.location.reload();
      } else if (updatedFlags > currentFlags) {
        console.log("More flags.");
        if (shouldSendNotification()) {
          sendMailNotification(currentFlags);
        }

        // new flags, create a notification. Remember the current number, so that we don't send a notification twice for the same flag
        currentFlags = updatedFlags;
        if (Notification.permission === "granted") {
          const notification = new Notification("New flags (total: " + updatedFlags + ")", {
            icon: "https://cdn.sstatic.net/Sites/" + sitename + "/img/apple-touch-icon.png",
            requireInteraction: true // on macOS, this only has effect when you set the notification types of your browser to 'Alert' instead of 'Banner'.
          });
          console.log("Notification created.");
          notification.onclick = function () {
            console.log("Notification clicked.");
            window.focus();
            // reload only here, otherwise the notification will be dismissed
            window.location.reload();
          };
        }
      }
    });
  }, 60000);
})();

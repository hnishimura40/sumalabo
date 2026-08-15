You are the Phase 0 environment probe. Do not post, reply, upload, type, or change any setting.
Use only the Chrome browser selected by the Chrome plugin. Create one fresh tab and open https://x.com/home.
Wait for DOM content to load, then read the DOM. Confirm the final URL is exactly https://x.com/home and count anchors whose href equals /suma_labo case-insensitively.
X renders the account navigation asynchronously. If the count is zero or the DOM is not yet readable, wait 5 seconds and retry the DOM read, for up to 12 total attempts (60 seconds maximum). Do not return failure after only the first read.
For cold-start diagnosis, also count the compose textbox and account-menu button, and report the total attempts used. Do not include page text, cookies, storage, or credentials.
Return exactly one JSON object on one line and no Markdown:
{"domRead":true,"url":"https://x.com/home","accountHref":"/suma_labo","hrefCount":1,"composeTextboxCount":1,"accountMenuCount":1,"attempts":2}
Use domRead=false and hrefCount=0 only if the condition still cannot be proven after all 12 attempts. Still report composeTextboxCount, accountMenuCount, and attempts so the cold-start failure can be distinguished without exposing page content. Close only the tab you created before finishing.

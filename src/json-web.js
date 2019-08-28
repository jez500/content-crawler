// const JSONPrettyHtml = require("json-pretty-html").default;
// const JSONView = require("json-view");
const RenderJSON = require("renderjson");

// We expose this function globally so it can be called inline from the Vue.js page
// to render the JSON.
/**
 * Take a raw JSON string and return the HTML.
 *
 * @param {string} raw
 * @return {string} html
 */
window.jsonToHtml = function(raw) {
  return RenderJSON(raw);
};

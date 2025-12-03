window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag("js", new Date());
gtag("config", "UA-152720878-1");

var browserHasLocalStorage = typeof Storage !== "undefined";

// Date.now() polyfill
if (!Date.now) {
  Date.now = function now() {
    return new Date().getTime();
  };
}

const cyrb53 = function (str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

var LOCALSTORAGE_SHEET_TIMESTAMP = "sheet_timestamp";
var LOCALSTORAGE_VID_DB = "vid_db";
var LOCALSTORAGE_BOOTLEG_SHEET_TIMESTAMP = "bootleg_sheet_timestamp";
var LOCALSTORAGE_BOOTLEG_VID_DB = "bootleg_vid_db";
var LOCALSTORAGE_SHOW_TWITTER_TIMESTAMP = "twitter_ignore_timestamp";
var LOCALSTORAGE_WATCHED_VID_IDS = "watched_vid_ids";
var LOCALSTORAGE_RANDOM_VID = "random_vid";

var TESTING_KEY = "AIzaSyAUpx3K3IcUsPAIicY8CSPbtUTjFVw7BSA";
var PUBLIC_SHEETS_API_KEY = "AIzaSyAzQyLBAF5kiOZHVLVMLfs_rn1wdCMVnmM";
var isLocal =
  window.location.href.split(":")[0] == "file" ||
  window.location.hostname == "localhost" ||
  window.location.hostname == "127.0.0.1" ||
  window.location.hostname == "0.0.0.0";
var API_KEY = isLocal ? TESTING_KEY : PUBLIC_SHEETS_API_KEY;
var SHEET_ID = "1B7b9jEaWiqZI8Z8CzvFN1cBvLVYwjb5xzhWtrgs4anI";
var BOOTLEG_SHEET_ID = "1Q_L84zZ2rzS57ZcDcCdmxMsguqjpnbLGr5_QVX5LVKA";
var RANGES = [
  "SiIvaGunner!A2:K",
  "TimmyTurnersGrandDad!A2:K",
  "VvvvvaVvvvvvr!A2:K",
];
var SHEETS_QUERY = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?key=${API_KEY}&ranges=${RANGES.join("&ranges=")}`;
var BOOTLEG_SHEET_QUERY = `https://sheets.googleapis.com/v4/spreadsheets/${BOOTLEG_SHEET_ID}?key=${API_KEY}`;
var BOOTLEG_SHEETS_BATCH_QUERY = `https://sheets.googleapis.com/v4/spreadsheets/${BOOTLEG_SHEET_ID}/values:batchGet?key=${API_KEY}`;

var KFAD_FILTERS = [
  "king for a day",
  "king for another day",
  "king for yet another day",
  "host for a day",
  "king for a gay",
  "teacher for a day",
  "queen for another day",
  "king for a week",
  "king 4 a day",
];
var CHANNEL_BLOCKLIST = [7792455746889010, 1256373471545759];
var RIP_BLOCKLIST = [];
var iso8601DurationRegex =
  /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;

var skewed_distribution = (x, c) => ((1 + c) * x) / (1 + c * x);

var currentVidId;
var previousVidId;
var currentVidTitle;
var isCurrentVidKFAD;
var previousChannel;
var currentChannel;
var isPreviousVidKFAD;
var isInfoReady = false;
var isAutoplay = true;
var allowRepeats = false;
var allowRepeatLock = false;
var isSkipKFAD = false;
var isNoWiki = false;
var isSiivaCheck = true;
var isTTGDCheck = false;
var isVAVRCheck = false;
var isBootlegCheck = false;
var durationOfVidToSkip = Number.MAX_SAFE_INTEGER;
var yearFilterSelected = Number.NaN;
var watchedVidIds;
var skipDurations = [
  ["☒", Number.MAX_SAFE_INTEGER],
  [">5 HR", 18000],
  [">2 HR", 7200],
  [">1 HR", 3600],
  [">30 MIN", 1800],
  [">15 MIN", 900],
  [">10 MIN", 600],
  [">5 MIN", 300],
  [">2 MIN", 120],
  [">1 MIN", 60],
  [">30 SEC", 30],
];
var skipDurationIndex = 0;
var yearFilterYears = Array.from(
  Array(new Date().getUTCFullYear() - 2016 + 1).keys(),
).map((x) => 2016 + x);
var yearFilterOptions = ["ALL"].concat(yearFilterYears);
var yearFilterIndex = 0;
// vid info map: 0 id, 1 title, 2 wiki status bool, 3 date posted as unix timestamp, 4 length, 5 views, 6 likes, 7 dislikes, 8 comments
var sortOptions = [
  ["RANDOM", (v) => v[3], Math.random, (v) => v[3]],
  [
    "RANDOM NEWER",
    (v) => v[3],
    () => 1 - skewed_distribution(Math.random(), 100),
    (v) => v[3],
  ],
  [
    "RANDOM OLDER",
    (v) => v[3],
    () => skewed_distribution(Math.random(), 100),
    (v) => v[3],
  ],
  ["OLDEST", (v) => v[3], Math.min, (v) => v[3]],
  ["NEWEST", (v) => v[3], Math.max, (v) => v[3]],
  ["SHORTEST", (v) => v[4], Math.min, (v) => v[4]],
  ["LONGEST", (v) => v[4], Math.max, (v) => v[4]],
  ["LEAST VIEWS", (v) => v[5], Math.min, (v) => v[5]],
  ["MOST VIEWS", (v) => v[5], Math.max, (v) => v[5]],
  ["BEST L/D", (v) => v[6] / (v[7] + 1), Math.max, (v) => v[6] && v[7]],
  ["WORST L/D", (v) => v[6] / (v[7] + 1), Math.min, (v) => v[6] && v[7]],
  ["MOST CMNTS", (v) => v[8], Math.max, (v) => v[5]],
  ["LEAST CMNTS", (v) => v[8], Math.min, (v) => v[5]],
];
var sortIndex = 0;
var sortOption = "RANDOM";

var autoWikiWindow;
var siiva_vids, ttgd_vids, vavr_vids, bootleg_vids;
var unwatched_siiva_vids,
  unwatched_ttgd_vids,
  unwatched_vavr_vids,
  unwatched_bootleg_vids;
var vid_db, bootleg_vid_db;
var first_vid_promise;
var sheets_checked;
var sheetsjson;

// optimization for first video loading
first_vid_promise = window.localStorage.getItem(LOCALSTORAGE_RANDOM_VID);
if (!first_vid_promise) {
  //returning user who doesn't have current vid stored
  first_vid_promise = new Promise(async (resolve, reject) => {
    try {
      vid_db = await idbKeyval.get(LOCALSTORAGE_VID_DB);
      if (vid_db) {
        siiva_vids = vid_db[0];
        if (
          browserHasLocalStorage &&
          window.localStorage.getItem(LOCALSTORAGE_WATCHED_VID_IDS)
        ) {
          try {
            watchedVidIds = JSON.parse(
              window.localStorage.getItem(LOCALSTORAGE_WATCHED_VID_IDS),
            );
          } catch (error) {
            watchedVidIds = [];
          }
        } else {
          watchedVidIds = [];
        }
        var differenceWatched = (x) => !watchedVidIds.includes(x[0]);
        unwatched_siiva_vids = siiva_vids.filter(differenceWatched);
        //store a random unwatched vid for quick loading next time
        window.localStorage.setItem(
          LOCALSTORAGE_RANDOM_VID,
          unwatched_siiva_vids[
            Math.floor(unwatched_siiva_vids.length * Math.random())
          ][0],
        );
        resolve(
          unwatched_siiva_vids[
            Math.floor(unwatched_siiva_vids.length * Math.random())
          ][0],
        );
      } else {
        throw "No cached db";
      }
    } catch (e) {
      //first time user or cache miss
      var Httpreq = new XMLHttpRequest();
      Httpreq.open("GET", SHEETS_QUERY, false);
      Httpreq.onload = (e) => {
        if (Httpreq.status !== 200) {
          console.error(
            "Error fetching siiva rip database: " + Httpreq.status,
          );
          resolve("rEcOzjg7vBU");
          return;
        }
        try {
          sheetsjson = JSON.parse(Httpreq.responseText);
          vid_db = processSheetsJSON(sheetsjson);
          //store a random siiva vid for quick loading next time
          window.localStorage.setItem(
            LOCALSTORAGE_RANDOM_VID,
            vid_db[0][Math.floor(vid_db[0].length * Math.random())][0],
          );
          resolve(
            vid_db[0][Math.floor(vid_db[0].length * Math.random())][0],
          );
        } catch (parseError) {
          console.error("Error parsing siiva rip database: ", parseError);
          resolve("rEcOzjg7vBU");
        }
      };
      Httpreq.onerror = (e) => {
        console.error("Error fetching siiva rip database");
        console.error(Httpreq.statusText);
        resolve("rEcOzjg7vBU");
      };
      Httpreq.send(null);
    }
  });
}

function makeGetRequest(url) {
  var Httpreq = new XMLHttpRequest(); // a new request
  Httpreq.open("GET", url, false);
  Httpreq.send(null);
  if (Httpreq.status !== 200) {
    throw new Error("HTTP error " + Httpreq.status);
  }
  return Httpreq.responseText;
}

function makeJSONRequest(url) {
  try {
    return JSON.parse(makeGetRequest(url));
  } catch (e) {
    console.error("Request failed for " + url + ": " + e);
    return null;
  }
}

async function checkSheets() {
  // Check timestamp in localStorage (timestamps are small, fine to keep in sync storage)
  // But the data itself is in IDB
  let storedTimestamp = window.localStorage.getItem(
    LOCALSTORAGE_SHEET_TIMESTAMP,
  );
  let dbHasData = false;
  try {
    let data = await idbKeyval.get(LOCALSTORAGE_VID_DB);
    if (data) dbHasData = true;
  } catch (e) {}

  if (
    !browserHasLocalStorage ||
    !dbHasData ||
    !(storedTimestamp && parseInt(storedTimestamp) > Date.now())
  ) {
    if (!sheetsjson) {
      sheetsjson = makeJSONRequest(SHEETS_QUERY);
      if (sheetsjson) {
        vid_db = processSheetsJSON(sheetsjson);
      } else {
        // fallback if request fails? or just don't update
        if (dbHasData) {
          vid_db = await idbKeyval.get(LOCALSTORAGE_VID_DB); // use stale data if available
        } else {
          // Critical failure, maybe empty list or some default
          console.error(
            "Could not load sheet data and no cache available.",
          );
          return;
        }
      }
    }
    if (browserHasLocalStorage && sheetsjson) {
      await idbKeyval.set(LOCALSTORAGE_VID_DB, vid_db);
      window.localStorage.setItem(
        LOCALSTORAGE_SHEET_TIMESTAMP,
        Date.now() + 86400000,
      ); // one day
    }
  } else {
    try {
      vid_db = await idbKeyval.get(LOCALSTORAGE_VID_DB);
      if (!vid_db) {
        throw "empty db from indexeddb";
      }
    } catch (e) {
      await idbKeyval.delete(LOCALSTORAGE_VID_DB);
      window.localStorage.removeItem(LOCALSTORAGE_SHEET_TIMESTAMP);
      checkSheets();
      return;
    }
  }
  siiva_vids = vid_db[0];
  ttgd_vids = vid_db[1];
  vavr_vids = vid_db[2];
}

function chunk(arr, size) {
  if (arr.length <= size) {
    return [arr];
  } else {
    return [arr.slice(0, size), ...chunk(arr.slice(size), size)];
  }
}

async function checkBootlegSheets() {
  let storedTimestamp = window.localStorage.getItem(
    LOCALSTORAGE_BOOTLEG_SHEET_TIMESTAMP,
  );
  let dbHasData = false;
  try {
    let data = await idbKeyval.get(LOCALSTORAGE_BOOTLEG_VID_DB);
    if (data) dbHasData = true;
  } catch (e) {}

  if (
    !browserHasLocalStorage ||
    !dbHasData ||
    !(storedTimestamp && parseInt(storedTimestamp) > Date.now())
  ) {
    var bootlegSheetNameJSON = makeJSONRequest(BOOTLEG_SHEET_QUERY);
    if (bootlegSheetNameJSON && bootlegSheetNameJSON["sheets"]) {
      var bootlegSheetNames = bootlegSheetNameJSON["sheets"]
        .map((sheet) => sheet.properties["title"])
        .filter(
          (title) =>
            !["Summary", "Template"].includes(title) &&
            !CHANNEL_BLOCKLIST.includes(cyrb53(title)),
        );
      // too many bootleg channels, gotta bach the queries
      var bootlegSheetNameBatches = chunk(bootlegSheetNames, 100);
      var bootlegSheetsJSONs = bootlegSheetNameBatches.map((names) =>
        makeJSONRequest(
          BOOTLEG_SHEETS_BATCH_QUERY +
            names
              .map(
                (name) => "&ranges=" + encodeURIComponent(name) + "!A2:K",
              )
              .join(""),
        ),
      );
      // merge the multiple queries into one JSON
      var bootlegSheetsJSON = bootlegSheetsJSONs.reduce(
        (retval, bootlegJSON) => {
          if (!bootlegJSON) return retval;
          retval["spreadsheetId"] = bootlegJSON["spreadsheetId"];
          retval["valueRanges"] = (
            retval["valueRanges"] ? retval["valueRanges"] : []
          ).concat(bootlegJSON["valueRanges"]);
          return retval;
        },
        {},
      );
      if (bootlegSheetsJSON.valueRanges) {
        bootleg_vid_db = processBootlegSheetsJSON(bootlegSheetsJSON);
        if (browserHasLocalStorage) {
          await idbKeyval.set(
            LOCALSTORAGE_BOOTLEG_VID_DB,
            bootleg_vid_db,
          );
          window.localStorage.setItem(
            LOCALSTORAGE_BOOTLEG_SHEET_TIMESTAMP,
            Date.now() + 172800000,
          ); // two days
        }
      } else {
        if (dbHasData) {
          bootleg_vid_db = await idbKeyval.get(
            LOCALSTORAGE_BOOTLEG_VID_DB,
          );
        } else {
          bootleg_vid_db = [];
        }
      }
    } else {
      if (dbHasData) {
        bootleg_vid_db = await idbKeyval.get(LOCALSTORAGE_BOOTLEG_VID_DB);
      } else {
        bootleg_vid_db = [];
      }
    }
  } else {
    try {
      bootleg_vid_db = await idbKeyval.get(LOCALSTORAGE_BOOTLEG_VID_DB);
      if (!bootleg_vid_db) {
        throw "empty bootleg db from indexeddb";
      }
    } catch (e) {
      await idbKeyval.delete(LOCALSTORAGE_BOOTLEG_VID_DB);
      window.localStorage.removeItem(
        LOCALSTORAGE_BOOTLEG_SHEET_TIMESTAMP,
      );
      checkBootlegSheets();
      return;
    }
  }
  bootleg_vids = bootleg_vid_db;
}

function parseISO8601Duration(iso8601Duration) {
  var matches = iso8601Duration.match(iso8601DurationRegex);

  return {
    sign: matches[1] === undefined ? "+" : "-",
    years: matches[2] === undefined ? 0 : matches[2],
    months: matches[3] === undefined ? 0 : matches[3],
    weeks: matches[4] === undefined ? 0 : matches[4],
    days: matches[5] === undefined ? 0 : matches[5],
    hours: matches[6] === undefined ? 0 : matches[6],
    minutes: matches[7] === undefined ? 0 : matches[7],
    seconds: matches[8] === undefined ? 0 : matches[8],
  };
}

function parseISO8601DurationToSeconds(iso8601Duration) {
  var matches = iso8601Duration.match(iso8601DurationRegex);

  return matches
    ? (matches[1] === undefined ? 1 : -1) *
        ((matches[2] === undefined ? 0 : parseInt(matches[2])) *
          31536000 +
          (matches[3] === undefined ? 0 : parseInt(matches[3])) *
            2592000 +
          (matches[4] === undefined ? 0 : parseInt(matches[4])) * 604800 +
          (matches[5] === undefined ? 0 : parseInt(matches[5])) * 86400 +
          (matches[6] === undefined ? 0 : parseInt(matches[6])) * 3600 +
          (matches[7] === undefined ? 0 : parseInt(matches[7])) * 60 +
          (matches[8] === undefined ? 0 : parseInt(matches[8])))
    : 0;
}

function processSheetsJSON(sheetsjson) {
  // column map: 0 id, 1 title, 2 wiki status, 3 video status, 4 upload date utc, 5 length, 6 description, 7 views, 8 likes, 9 dislikes, 10 comments
  // vid info map: 0 id, 1 title, 2 wiki status bool, 3 date posted as unix timestamp, 4 length, 5 views, 6 likes, 7 dislikes, 8 comments
  var filter_func = (row) => !["Private", "Deleted"].includes(row[3]);
  var mapping_func = (row) => [
    row[0],
    row[1].replaceAll(/\s{2,}/g, " "),
    row[2] == "Documented"
      ? true
      : row[2] == "Undocumented"
        ? false
        : null,
    Date.parse(row[4].replace(/\s+/, " ")),
    parseISO8601DurationToSeconds(row[5]),
    parseInt(row[7]),
    parseInt(row[8]),
    parseInt(row[9]),
    parseInt(row[10]),
  ];
  var outer_mapping_func = (n) =>
    sheetsjson["valueRanges"][n]["values"]
      .filter(filter_func)
      .map(mapping_func);
  return [0, 1, 2].map(outer_mapping_func);
}

function processBootlegSheetsJSON(bootlegSheetsJSON) {
  var filter_func = (row) =>
    !["Private", "Deleted"].includes(row[3]) &&
    row[5] != null &&
    row[1] != null;
  var mapping_func = (row) => [
    row[0],
    row[1].replaceAll(/\s{2,}/g, " "),
    false,
    Date.parse(row[4].replace(/\s+/, " ")),
    parseISO8601DurationToSeconds(row[5]),
    parseInt(row[7]),
    parseInt(row[8]),
    parseInt(row[9]),
    parseInt(row[10]),
  ];
  var outer_mapping_func = (n) =>
    bootlegSheetsJSON["valueRanges"][n]["values"]
      .filter(filter_func)
      .map(mapping_func);
  return [].concat.apply(
    [],
    Array.from(Array(bootlegSheetsJSON["valueRanges"].length).keys()).map(
      outer_mapping_func,
    ),
  );
}

function initWatchedVids() {
  if (
    browserHasLocalStorage &&
    window.localStorage.getItem(LOCALSTORAGE_WATCHED_VID_IDS)
  ) {
    try {
      watchedVidIds = JSON.parse(
        window.localStorage.getItem(LOCALSTORAGE_WATCHED_VID_IDS),
      );
    } catch (error) {
      watchedVidIds = [];
    }
  } else {
    watchedVidIds = [];
  }
  var differenceWatched = (x) => !watchedVidIds.includes(x[0]);
  unwatched_siiva_vids = siiva_vids.filter(differenceWatched);
  unwatched_ttgd_vids = ttgd_vids.filter(differenceWatched);
  unwatched_vavr_vids = vavr_vids.filter(differenceWatched);
  unwatched_bootleg_vids = bootleg_vids.filter(differenceWatched);
  updateWatchPercentages();
}

document.addEventListener("DOMContentLoaded", function (event) {
  if (
    browserHasLocalStorage &&
    window.localStorage.getItem(LOCALSTORAGE_SHOW_TWITTER_TIMESTAMP) &&
    parseInt(
      window.localStorage.getItem(LOCALSTORAGE_SHOW_TWITTER_TIMESTAMP),
    ) > Date.now()
  ) {
    document.querySelector("h3#twitter").style.display = "none";
  } else {
    document.querySelector("h3#twitter").style.display = "";
  }

  var dark_link = document.getElementById("dark");
  var theme_switch = (should_dark_mode_func) => {
    if (should_dark_mode_func()) {
      document.body.style.background = "black";
      document.body.style.color = "white";
      document.cookie = "theme=dark; SameSite=Strict";
      document.getElementById("dark").children[0].text = "LIGHT";
    } else {
      document.body.style.background = "white";
      document.body.style.color = "black";
      document.cookie = "theme=light; SameSite=Strict";
      document.getElementById("dark").children[0].text = "DARK";
    }
  };
  var is_background_white = () =>
    document.body.style.background.includes("white");

  if (is_background_white()) {
    document.getElementById("dark").children[0].text = "DARK";
  } else {
    document.getElementById("dark").children[0].text = "LIGHT";
  }
  theme_switch(
    () =>
      !document.cookie
        .split(";")
        .filter((item) => item.includes("theme=light")).length,
  );

  [
    ["h4#homepage > a", undefined, "visit my homepage!"],
    [
      "li#rip_wiki_link > a",
      undefined,
      "opens link to the wiki page for this rip (if it exists) in a new tab. (consider making one if it doesn't!) (hotkey: ctrl-shift-f)",
    ],
    [
      "li#copy > a",
      copyRipLink,
      "copies this rip's youtube url to your clipboard!",
    ],
    [
      "li#copyplaylist > a",
      copyDiscordPlaylist,
      "copies a max length, discord music bot compatible, youtube playlist url to your clipboard! (rips generated based on your current filters)",
    ],
    [
      "li#dark > a",
      theme_switch.bind(null, is_background_white),
      "toggle light/dark mode",
    ],
    [
      "li#previous > a",
      previousVid,
      "go back to the previous rip (hotkeys: ctrl+left shift-p)",
    ],
    [
      "li#skip > a",
      skipVid,
      "pulls up the next random rip according to your filters and sorting (hotkeys: ctrl+right shift-n)",
    ],
    [
      "li#autoplay > a",
      toggleAutoplay,
      "pull up a new random rip (according to filters and sorting) when the current rip ends",
    ],
    [
      "li#allowrepeats > a",
      toggleAllowRepeats,
      "allow rips to be repeated (only available when unsorted) (rip watch history is stored in your localstorage)",
    ],
    [
      "li#autowiki > a",
      autoWikiPopup,
      "creates a popup that will automatically navigate to the currently playing rip's wiki page! (automatic joke lists!)",
    ],
    [
      "li#skipduration > a",
      skipDurationClicked,
      "skip rips that are over the specified duration (click to cycle through durations)",
    ],
    [
      "li#yearfilter > a",
      yearFilterClicked,
      "view only rips from the selected year",
    ],
    [
      "li#sort > a",
      sortClicked,
      "order rips in various ways (click to cycle through order options)",
    ],
    [
      "li#skipkfad > a",
      skipKFADClicked,
      "skip rips that have variants of 'king for a day' in the title",
    ],
    [
      "li#nowiki > a",
      noWikiClicked,
      "only plays rips in need of a wiki article",
    ],
    [
      "li#channels > a",
      () => toggleChannel(""),
      "select specific ripping channels to play random rips from (click this to toggle all channels)",
    ],
    [
      "li#siiva > a",
      () => toggleChannel("siiva"),
      "play rips from SiIvaGunner",
    ],
    [
      "li#ttgd > a",
      () => toggleChannel("ttgd"),
      "play rips from TimmyTurnersGrandDad",
    ],
    [
      "li#vavr > a",
      () => toggleChannel("vavr"),
      "play rips from VvvvvaVvvvvvr",
    ],
    [
      "li#bootleg > a",
      () => toggleChannel("bootleg"),
      "play vids from all other fan channels (inclusion previously based on the siiva wiki list of fan channels) i do not endorse anything here lol",
    ],
    ["a#hidetwitter", () => hideTwitter(false), ""],
    ["a#permahidetwitter", () => hideTwitter(true), ""],
  ].forEach((entry) => {
    let [selector, toCall, tooltipMessage] = entry;
    let element = document.querySelector(selector);
    element.onclick = toCall;
    if (toCall) {
      element.onkeydown = (event) => {
        switch (event.code) {
          case "Space":
          case "Enter":
            toCall();
        }
      };
    }
    element.onmouseenter = tooltip.bind(null, tooltipMessage);
    element.onmouseout = tooltip.bind(null, "");
    element.onfocus = tooltip.bind(null, tooltipMessage);
    element.onblur = tooltip.bind(null, "");
  });

  navigator.mediaSession.setActionHandler("nexttrack", function () {
    skipVid();
  });

  navigator.mediaSession.setActionHandler("previoustrack", function () {
    previousVid();
  });

  document.addEventListener("keydown", (event) => {
    switch (event.code) {
      case "Space":
      case "KeyK":
        onSpaceBarPressed();
        break;
      case "End":
        player.seekTo(player.getDuration(), true);
        break;
      case "Home":
        player.seekTo(0, true);
        break;
      case "KeyM":
        player.isMuted() ? player.unMute() : player.mute();
        break;
      case "ArrowUp":
        player.setVolume(Math.min(player.getVolume() + 5, 100));
        break;
      case "ArrowDown":
        player.setVolume(Math.max(player.getVolume() - 5, 0));
        break;
      case "ArrowRight":
        if (event.ctrlKey) {
          skipVid();
        } else {
          player.seekTo(
            Math.min(player.getCurrentTime() + 5, player.getDuration()),
            true,
          );
        }
        break;
      case "ArrowLeft":
        if (event.ctrlKey) {
          previousVid();
        } else {
          player.seekTo(Math.max(player.getCurrentTime() - 5, 0), true);
        }
        break;
      case "KeyL":
        player.seekTo(
          Math.min(player.getCurrentTime() + 10, player.getDuration()),
          true,
        );
        break;
      case "KeyJ":
        player.seekTo(Math.max(player.getCurrentTime() - 10, 0), true);
        break;
      case "KeyF":
        if (event.ctrlKey && event.shiftKey)
          window
            .open(
              wikiLinkFromTitle(currentVidTitle, currentChannel),
              "_blank",
            )
            .focus();
        break;
    }
    let rates;
    switch (event.key) {
      case "N":
        skipVid();
        break;
      case "P":
        previousVid();
        break;
      case ">":
        rates = player.getAvailablePlaybackRates();
        player.setPlaybackRate(
          rates[
            Math.min(
              rates.indexOf(player.getPlaybackRate()) + 1,
              rates.length,
            )
          ],
        );
        break;
      case "<":
        rates = player.getAvailablePlaybackRates();
        player.setPlaybackRate(
          rates[Math.max(rates.indexOf(player.getPlaybackRate()) - 1, 0)],
        );
        break;
    }
    if (typeof event.key == Number && event.key >= 0 && event.key <= 9) {
      player.seekTo(Math.floor((player.getDuration() * event.key) / 10));
    }
  });
});

window.addEventListener("beforeunload", function () {
  if (!!autoWikiWindow && !autoWikiWindow.closed) {
    autoWikiWindow.close();
  }
});

function tooltip(msg = "") {
  document.querySelector("h3#tooltip").textContent = msg;
}

function metadataTooltip() {
  if (currentChannel && currentVidTitle) {
    tooltip(`current ${currentChannel} rip: ${currentVidTitle}`);
  }
}

function channelProgressClicked() {
  var pasteAreaElement = document.querySelector("#pastearea");
  var isPasteAreaVisible = pasteAreaElement.style.visibility == "visible";
  document.querySelector("#overwrite").textContent = "OVERWRITE?";
  document.querySelector("#pastearea > textarea").value = btoa(
    watchedVidIds.join(","),
  );
  pasteAreaElement.style.visibility = isPasteAreaVisible
    ? "hidden"
    : "visible";
  document.querySelector("#pastearea > textarea").select();
}

function overWriteClicked() {
  var overwriteText = document.querySelector("#overwrite").textContent;
  switch (overwriteText) {
    case "OVERWRITE?":
      document.querySelector("#overwrite").textContent = "ARE YOU SURE?";
      break;
    case "ARE YOU SURE?":
      document.querySelector("#overwrite").textContent =
        "REALLY REALLY SURE?";
      break;
    case "REALLY REALLY SURE?":
      if (document.querySelector("#pastearea > textarea").value == "") {
        watchedVidIds = [];
        document.querySelector("#overwrite").textContent =
          "WATCH HISTORY CLEARED";
      } else {
        document.querySelector("#overwrite").textContent =
          `PROCESSING...`;
        var importedVidIds = atob(
          document.querySelector("#pastearea > textarea").value,
        ).split(",");
        var importError = importedVidIds.some(
          (vidId) => !/^([a-zA-Z0-9_-]{11}|Unknown|)$/.test(vidId),
        );
        var importWarning = importedVidIds.some((vidId) =>
          /^(Unknown|)$/.test(vidId),
        );
        if (importError) {
          document.querySelector("#overwrite").textContent =
            "SAVE STRING PARSE ERROR";
          console.error(`parse error, unrecognized ID formats:`);
          console.error(
            importedVidIds.filter(
              (vidId) => !/^[a-zA-Z0-9_-]{11}$/.test(vidId),
            ),
          );
        } else {
          if (importWarning) {
            console.warn(`unusual (but recoverable) parse errors found:`);
            console.warn(
              importedVidIds.filter((vidId) =>
                /^(Unknown|)$/.test(vidId),
              ),
            );
            importedVidIds = importedVidIds.filter(
              (vidId) => !/^(Unknown|)$/.test(vidId),
            );
          }
          watchedVidIds = importedVidIds;
          window.localStorage.setItem(
            LOCALSTORAGE_WATCHED_VID_IDS,
            JSON.stringify(watchedVidIds),
          );
        }
      }
      window.setTimeout(() => {
        var differenceWatched = (x) => !watchedVidIds.includes(x[0]);
        unwatched_siiva_vids = siiva_vids.filter(differenceWatched);
        unwatched_ttgd_vids = ttgd_vids.filter(differenceWatched);
        unwatched_vavr_vids = vavr_vids.filter(differenceWatched);
        unwatched_bootleg_vids = bootleg_vids.filter(differenceWatched);
        updateWatchPercentages();
        document.querySelector("#overwrite").textContent =
          `LOADED ${importedVidIds.length} WATCHED VIDS...`;
      }, 0);
      break;
    default:
      document.querySelector("#overwrite").textContent = "OVERWRITE?";
      break;
  }
}

function channelProgressTooltip(channel = "") {
  var num_total_vids, num_unwatched_vids, channelText, parenthetical;
  if (channel == "") {
    num_total_vids =
      siiva_vids.length +
      ttgd_vids.length +
      vavr_vids.length +
      bootleg_vids.length;
    num_unwatched_vids =
      unwatched_siiva_vids.length +
      unwatched_ttgd_vids.length +
      unwatched_vavr_vids.length +
      unwatched_bootleg_vids.length;
    channelText = "siiva and all fan channels";
    parenthetical = "(click to open progress import/export menu)";
  } else if (channel == "siiva") {
    num_total_vids = siiva_vids.length;
    num_unwatched_vids = unwatched_siiva_vids.length;
    channelText = "SiIvaGunner's channel";
    parenthetical = "";
  } else if (channel == "ttgd") {
    num_total_vids = ttgd_vids.length;
    num_unwatched_vids = unwatched_ttgd_vids.length;
    channelText = "TimmyTurnersGrandDad's channel";
    parenthetical = "";
  } else if (channel == "vavr") {
    num_total_vids = vavr_vids.length;
    num_unwatched_vids = unwatched_vavr_vids.length;
    channelText = "VvvvvaVvvvvvr's channel";
    parenthetical = "";
  } else if (channel == "bootleg") {
    num_total_vids = bootleg_vids.length;
    num_unwatched_vids = unwatched_bootleg_vids.length;
    channelText = "all remaining fan channels";
    parenthetical = "";
  }
  tooltip(
    `you've watched ${(num_total_vids - num_unwatched_vids).toLocaleString()} out of ${num_total_vids.toLocaleString()} total rips on ${channelText}, only ${num_unwatched_vids.toLocaleString()} more to go! ${parenthetical}`,
  );
}

function updateCheckboxes() {
  document.querySelector("li#autoplay > a > span.checkbox").textContent =
    isAutoplay ? "☑" : "☐";
  document.querySelector(
    "li#allowrepeats > a > span.checkbox",
  ).textContent = allowRepeats ? "☑" : "☐";
  document.querySelector("li#skipkfad > a > span.checkbox").textContent =
    isSkipKFAD ? "☑" : "☐";
  document.querySelector("li#nowiki > a > span.checkbox").textContent =
    isNoWiki ? "☑" : "☐";
  document.querySelector("li#siiva > a > span.checkbox").textContent =
    isSiivaCheck ? "☑" : "☐";
  document.querySelector("li#ttgd > a > span.checkbox").textContent =
    isTTGDCheck ? "☑" : "☐";
  document.querySelector("li#vavr > a > span.checkbox").textContent =
    isVAVRCheck ? "☑" : "☐";
  document.querySelector("li#bootleg > a > span.checkbox").textContent =
    isBootlegCheck ? "☑" : "☐";
}

function updateWatchPercentages() {
  document.querySelector("li#channels > a.percentcomplete").text =
    `(${(100 * (1 - (unwatched_siiva_vids.length + unwatched_ttgd_vids.length + unwatched_vavr_vids.length) / (siiva_vids.length + ttgd_vids.length + vavr_vids.length))).toFixed(2)}% watched)`;
  document.querySelector("li#siiva > a.percentcomplete").text =
    `(${(100 * (1 - unwatched_siiva_vids.length / siiva_vids.length)).toFixed(2)}% watched)`;
  document.querySelector("li#ttgd > a.percentcomplete").text =
    `(${(100 * (1 - unwatched_ttgd_vids.length / ttgd_vids.length)).toFixed(2)}% watched)`;
  document.querySelector("li#vavr > a.percentcomplete").text =
    `(${(100 * (1 - unwatched_vavr_vids.length / vavr_vids.length)).toFixed(2)}% watched)`;
  document.querySelector("li#bootleg > a.percentcomplete").text =
    `(${(100 * (1 - unwatched_bootleg_vids.length / bootleg_vids.length)).toFixed(2)}% watched)`;
}

function skipDurationClicked() {
  skipDurationIndex = (skipDurationIndex + 1) % skipDurations.length;
  document.querySelector(
    "li#skipduration > a > span.checkbox",
  ).textContent = skipDurations[skipDurationIndex][0];
  durationOfVidToSkip = skipDurations[skipDurationIndex][1];
}

function yearFilterClicked() {
  yearFilterIndex = (yearFilterIndex + 1) % yearFilterOptions.length;
  document.querySelector(
    "li#yearfilter > a > span.checkbox",
  ).textContent = yearFilterOptions[yearFilterIndex];
  yearFilterSelected = parseInt(yearFilterOptions[yearFilterIndex]);
}

function sortClicked() {
  sortIndex = (sortIndex + 1) % sortOptions.length;
  if (sortIndex < 3) {
    allowRepeatLock = false;
  } else {
    allowRepeatLock = true;
    allowRepeats = false;
    updateCheckboxes();
  }
  sortOption = sortOptions[sortIndex][0];
  document.querySelector("li#sort > a > span.sortoption").textContent =
    sortOption;
}

function skipKFADClicked() {
  isSkipKFAD = !isSkipKFAD;
  updateCheckboxes();
  if (isCurrentVidKFAD && isSkipKFAD) {
    newVid(true);
  }
}

function noWikiClicked() {
  isNoWiki = !isNoWiki;
  updateCheckboxes();
}

function pickUniformRandomFromArray(toSample) {
  return toSample[Math.floor(Math.random() * toSample.length)];
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function getVidIds(numVids) {
  filteredSortedVids = [];
  if (isSiivaCheck) {
    filteredSortedVids = filteredSortedVids.concat(
      allowRepeats ? siiva_vids : unwatched_siiva_vids,
    );
  }
  if (isTTGDCheck) {
    filteredSortedVids = filteredSortedVids.concat(
      allowRepeats ? ttgd_vids : unwatched_ttgd_vids,
    );
  }
  if (isVAVRCheck) {
    filteredSortedVids = filteredSortedVids.concat(
      allowRepeats ? vavr_vids : unwatched_vavr_vids,
    );
  }
  if (isBootlegCheck) {
    filteredSortedVids = filteredSortedVids.concat(
      allowRepeats ? bootleg_vids : unwatched_bootleg_vids,
    );
  }
  if (isSkipKFAD) {
    filteredSortedVids = filteredSortedVids.filter(
      (vid_info) =>
        !KFAD_FILTERS.some((filter) =>
          vid_info[1].toLowerCase().includes(filter),
        ),
    );
  }
  if (skipDurationIndex != 0) {
    filteredSortedVids = filteredSortedVids.filter(
      (vid_info) => vid_info[4] < durationOfVidToSkip,
    );
  }
  if (yearFilterIndex != 0) {
    filteredSortedVids = filteredSortedVids.filter(
      (vid_info) =>
        new Date(vid_info[3]).getFullYear() == yearFilterSelected,
    );
  }
  if (isNoWiki) {
    filteredSortedVids = filteredSortedVids.filter(
      (vid_info) => vid_info[2] === false,
    );
  }
  filteredSortedVids = filteredSortedVids.filter(
    (vid_info) => !RIP_BLOCKLIST.includes(cyrb53(vid_info[0])),
  );
  filteredSortedVids = filteredSortedVids.filter(
    (vid_info) => !!vid_info[0],
  );
  if (sortOption.startsWith("RANDOM")) {
    if (sortOption != "RANDOM") {
      // time based random needs sorted
      filteredSortedVids.sort(
        (a, b) =>
          sortOptions[sortIndex][1](b) - sortOptions[sortIndex][1](a),
      );
    }
    var sort_sampler = sortOptions[sortIndex][2];
    return Array(numVids)
      .fill(0)
      .map(() => {
        if (filteredSortedVids.length == 0) return;
        return filteredSortedVids.splice(
          Math.floor(filteredSortedVids.length * sort_sampler()),
          1,
        )[0][0];
      })
      .filter(Boolean);
  } else {
    filteredSortedVids = filteredSortedVids.filter(
      sortOptions[sortIndex][3],
    );
    var mapped_vids = filteredSortedVids.map(sortOptions[sortIndex][1]);
    return Array(numVids)
      .fill(0)
      .map(() => {
        var vid_index = mapped_vids.indexOf(
          sortOptions[sortIndex][2].apply(null, mapped_vids),
        );
        if (vid_index == -1) return;
        return filteredSortedVids.splice(vid_index, 1)[0][0];
      })
      .filter(Boolean);
  }
}

function nextVidId() {
  return getVidIds(1)[0] || "h6Ja9JyXs-I";
}

function getRandomUnwatchedSiivaVid() {
  return pickUniformRandomFromArray(unwatched_siiva_vids)[0];
}

function copyDiscordPlaylistToClipboard(numvids = 500, charlimit = 2000) {
  var url =
    ";;play https://www.youtube.com/watch_videos?video_ids=" +
    getVidIds(numvids).join(",");
  url = url.substring(0, Math.min(url.length, charlimit));
  url = url.substring(0, url.lastIndexOf(","));
  copyToClipboard(url);
}

function wikiLinkFromTitle(title, wiki) {
  if (wiki == "SiIvaGunner") {
    wiki = "siivagunner.wiki";
  } else if (wiki == "TimmyTurnersGrandDad") {
    wiki = "ttgd.fandom.com";
  } else if (wiki == "VvvvvaVvvvvvr") {
    wiki = "vvvvvavvvvvr.fandom.com";
  } else {
    return;
  }
  return (
    "https://" +
    wiki +
    "/wiki/" +
    title
      .replaceAll(" ", "_")
      .replaceAll(/[#|]+/gi, "")
      .replaceAll("[", "(")
      .replaceAll("]", ")")
      .replaceAll("?", "%3F")
  );
}

var tag = document.createElement("script");

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
window.onYouTubeIframeAPIReady = async () => {
  var embedcontainerElement =
    document.querySelector("div.embedcontainer");
  player = new YT.Player("player", {
    height: parseInt(embedcontainerElement.offsetHeight),
    width: parseInt(embedcontainerElement.offsetWidth),
    videoId: await first_vid_promise,
    playerVars: {
      autoplay: 1,
      enablejsapi: 1,
      disablekb: 0,
      modestbranding: 0,
      rel: 0,
      widget_referrer: "https://brubsby.com/randomsiiva",
    },
    origin: "https://brubsby.com",
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onError,
    },
  });
  currentVidId = await first_vid_promise;
};

function onTitleReady() {
  currentVidTitle = player.getVideoData().title;
  isCurrentVidKFAD = KFAD_FILTERS.some((filter) =>
    currentVidTitle.toLowerCase().includes(filter),
  );
  if (isCurrentVidKFAD && isSkipKFAD) {
    newVid(false);
    return;
  }
  currentChannel = player.getVideoData().author || "SiIvaGunner";
  isInfoReady = true;
  updateWikiLink();
  updateNowPlaying();
}

function updateNowPlaying() {
  document.querySelector("h2#nowplaying").textContent = currentVidTitle;
  document.title = currentVidTitle + " - Random Rip Player";
  updateMediaSession();
  document.querySelector("h2#author").textContent = currentChannel;
}

function updateMediaSession() {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: currentVidTitle.match(/^.*?((?=\s[-|]\s)|$)/g),
    artist: currentChannel,
    album: currentVidTitle.match(/(?<=\s[-|]\s).*$/g),
    artwork: [
      {
        src: "https://img.youtube.com/vi/" + currentVidId + "/0.jpg",
        sizes: "480x360",
        type: "image/jpg",
      },
    ],
  });
}

function updateTitleMaxWidth() {
  document.querySelector("h2#nowplaying").style.maxWidth =
    document.querySelector("iframe#player").offsetWidth + "px";
}

async function onPlayerReady(event) {
  updateTitleMaxWidth();
  onTitleReady();
  //player.playVideo();
  if (!sheets_checked) {
    await Promise.all([checkSheets(), checkBootlegSheets()]);
    initWatchedVids();
    window.localStorage.setItem(
      LOCALSTORAGE_RANDOM_VID,
      getRandomUnwatchedSiivaVid(),
    );
    sheets_checked = true;
  }
}

function updateWikiLink() {
  var wikiLink = wikiLinkFromTitle(currentVidTitle, currentChannel);
  var wikiLinkElem = document.querySelector("#rip_wiki_link > a");
  wikiLinkElem.href = wikiLink;
  if (!wikiLink) {
    wikiLinkElem.removeAttribute("href");
  }
  if (!!autoWikiWindow && !autoWikiWindow.closed && !!wikiLink) {
    autoWikiWindow.location.href = wikiLink;
  }
}

function skipVid() {
  newVid(true);
}

function copyToClipboard(text) {
  var input = document.createElement("textarea");
  input.innerHTML = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  return document.body.removeChild(input);
}

function copyRipLink() {
  var yt_link = "https://www.youtube.com/watch?v=" + currentVidId;
  copyToClipboard(yt_link);
  tooltip("rip link copied!");
  document.querySelector("li#copy > a").textContent = "COPIED.......";
  setTimeout(
    () =>
      (document.querySelector("li#copy > a").textContent =
        "COPY RIP LINK"),
    1000,
  );
}

function copyDiscordPlaylist() {
  copyDiscordPlaylistToClipboard();
  tooltip("playlist command copied!");
  document.querySelector("li#copyplaylist > a").textContent =
    "COPIED...........";
  setTimeout(
    () =>
      (document.querySelector("li#copyplaylist > a").textContent =
        "GENERATE PLAYLIST"),
    1000,
  );
}

function newVid(markWatched) {
  if (markWatched) {
    markVidWatched(currentVidId);
  }
  previousVidId = currentVidId;
  currentVidId = nextVidId();
  //store a random vid id in localstorage so we can load fast on refresh
  window.localStorage.setItem(
    LOCALSTORAGE_RANDOM_VID,
    getRandomUnwatchedSiivaVid(),
  );
  previousChannel = currentChannel;
  isPreviousVidKFAD = isCurrentVidKFAD;
  isInfoReady = false;
  player.loadVideoById(currentVidId);
  player.playVideo();
}

function markVidWatched(vidId) {
  if (!watchedVidIds.includes(vidId)) {
    watchedVidIds.push(vidId);
  }
  window.localStorage.setItem(
    LOCALSTORAGE_WATCHED_VID_IDS,
    JSON.stringify(watchedVidIds),
  );
  notVidFilter = (x) => x[0] != vidId;
  unwatched_siiva_vids = unwatched_siiva_vids.filter(notVidFilter);
  unwatched_ttgd_vids = unwatched_ttgd_vids.filter(notVidFilter);
  unwatched_vavr_vids = unwatched_vavr_vids.filter(notVidFilter);
  unwatched_bootleg_vids = unwatched_bootleg_vids.filter(notVidFilter);
  updateWatchPercentages();
}

function onError(event) {
  if (event.data >= 100) {
    newVid(true);
  }
}

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.ENDED) {
    clearTimeOver();
    if (isAutoplay) {
      newVid(true);
    }
  } else if (event.data == YT.PlayerState.PLAYING && !isInfoReady) {
    onTitleReady();
  }
  if (event.data == YT.PlayerState.PLAYING) {
    setTimeOver();
  } else {
    clearTimeOver();
  }
}

function clearTimeOver() {
  document.querySelector("#timeover").textContent = "";
}

function setTimeOver() {
  document.querySelector("#timeover").textContent = Math.floor(
    Date.now() / 1000 - player.getCurrentTime() + player.getDuration(),
  );
}

function previousVid() {
  if (previousVidId) {
    var swap = currentVidId;
    currentVidId = previousVidId;
    previousVidId = swap;
    isInfoReady = false;
    player.loadVideoById(currentVidId);
    player.playVideo();
  }
}

function toggleAutoplay() {
  isAutoplay = !isAutoplay;
  if (isAutoplay && player.getPlayerState() == YT.PlayerState.ENDED) {
    newVid(true);
  }
  updateCheckboxes();
}

function toggleAllowRepeats() {
  if (!allowRepeatLock) {
    allowRepeats = !allowRepeats;
    updateCheckboxes();
  }
}

function toggleChannel(channel) {
  if (channel == "siiva") {
    isSiivaCheck = !isSiivaCheck;
    if (
      !isSiivaCheck &&
      !isTTGDCheck &&
      !isVAVRCheck &&
      !isBootlegCheck
    ) {
      isTTGDCheck = true;
      isVAVRCheck = true;
      isBootlegCheck = true;
    }
  } else if (channel == "ttgd") {
    isTTGDCheck = !isTTGDCheck;
  } else if (channel == "vavr") {
    isVAVRCheck = !isVAVRCheck;
  } else if (channel == "bootleg") {
    isBootlegCheck = !isBootlegCheck;
  } else if (channel == "") {
    if (isSiivaCheck && isTTGDCheck && isVAVRCheck && isBootlegCheck) {
      isSiivaCheck = true;
      isTTGDCheck = false;
      isVAVRCheck = false;
      isBootlegCheck = false;
    } else {
      isSiivaCheck = true;
      isTTGDCheck = true;
      isVAVRCheck = true;
      isBootlegCheck = true;
    }
  }
  if (!isSiivaCheck && !isTTGDCheck && !isVAVRCheck && !isBootlegCheck) {
    isSiivaCheck = true;
  }
  updateCheckboxes();
}

function autoWikiPopup() {
  var wikiLink = wikiLinkFromTitle(currentVidTitle, currentChannel);
  if (!wikiLink) {
    wikiLink = "https://www.siivagunner.wiki/wiki/SiIvaGunner_Wiki";
  }
  autoWikiWindow = window.open(wikiLink, "Auto Updating Wiki Popup", [
    "resizable",
    "scrollbars",
    "status",
  ]);
}

function hideTwitter(perma) {
  document.querySelector("h3#twitter").style.display = "none";
  if (browserHasLocalStorage) {
    window.localStorage.setItem(
      LOCALSTORAGE_SHOW_TWITTER_TIMESTAMP,
      perma ? Number.MAX_SAFE_INTEGER : Date.now() + 80000000,
    );
  }
}

function onSpaceBarPressed() {
  if (document.activeElement.nodeName == "A") {
    return; // don't pause the vid if tab navigating the page and focused on a link
  }
  if (player.getPlayerState() == YT.PlayerState.ENDED && !isAutoplay) {
    newVid(true);
  } else if (
    player.getPlayerState() == YT.PlayerState.PLAYING ||
    player.getPlayerState() == YT.PlayerState.BUFFERING
  ) {
    player.pauseVideo();
  } else if (
    player.getPlayerState() == YT.PlayerState.PAUSED ||
    player.getPlayerState() == YT.PlayerState.CUED ||
    player.getPlayerState() == YT.PlayerState.UNSTARTED
  ) {
    player.playVideo();
  }
}

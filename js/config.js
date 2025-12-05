// Polyfills and Utilities
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag("js", new Date());
gtag("config", "UA-152720878-1");

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

const skewed_distribution = (x, c) => ((1 + c) * x) / (1 + c * x);

// Configuration Constants
const Config = {
  browserHasLocalStorage: typeof Storage !== "undefined",

  StorageKeys: {
    SHEET_TIMESTAMP: "sheet_timestamp",
    VID_DB: "vid_db",
    BOOTLEG_SHEET_TIMESTAMP: "bootleg_sheet_timestamp",
    BOOTLEG_VID_DB: "bootleg_vid_db",
    BOOTLEG_CHANNELS: "bootleg_channels",
    SHOW_TWITTER_TIMESTAMP: "twitter_ignore_timestamp",
    WATCHED_VID_IDS: "watched_vid_ids",
    RANDOM_VID: "random_vid",
  },

  API: {
    TESTING_KEY: "AIzaSyAUpx3K3IcUsPAIicY8CSPbtUTjFVw7BSA",
    PUBLIC_SHEETS_API_KEY: "AIzaSyAzQyLBAF5kiOZHVLVMLfs_rn1wdCMVnmM",
    SHEET_ID: "1B7b9jEaWiqZI8Z8CzvFN1cBvLVYwjb5xzhWtrgs4anI",
    BOOTLEG_SHEET_ID: "1Q_L84zZ2rzS57ZcDcCdmxMsguqjpnbLGr5_QVX5LVKA",
    RANGES: [
      "SiIvaGunner!A2:K",
      "TimmyTurnersGrandDad!A2:K",
      "VvvvvaVvvvvvr!A2:K",
    ],
    CHANNEL_BLOCKLIST: [7792455746889010, 1256373471545759],
    RIP_BLOCKLIST: [],
  },

  Filters: {
    KFAD: [
      "king for a day",
      "king for another day",
      "king for yet another day",
      "host for a day",
      "king for a gay",
      "teacher for a day",
      "queen for another day",
      "king for a week",
      "king 4 a day",
    ],
  },

  Regex: {
    ISO8601Duration:
      /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/,
  },

  Durations: [
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
  ],

  YearFilterStart: 2016,
};

// Computed API Key
const isLocal =
  window.location.href.split(":")[0] == "file" ||
  window.location.hostname == "localhost" ||
  window.location.hostname == "127.0.0.1" ||
  window.location.hostname == "0.0.0.0";

Config.API.KEY = isLocal
  ? Config.API.TESTING_KEY
  : Config.API.PUBLIC_SHEETS_API_KEY;

Config.API.SHEETS_QUERY = `https://sheets.googleapis.com/v4/spreadsheets/${Config.API.SHEET_ID}/values:batchGet?key=${Config.API.KEY}&ranges=${Config.API.RANGES.join("&ranges=")}`;
Config.API.BOOTLEG_SHEET_QUERY = `https://sheets.googleapis.com/v4/spreadsheets/${Config.API.BOOTLEG_SHEET_ID}?key=${Config.API.KEY}`;
Config.API.BOOTLEG_SHEETS_BATCH_QUERY = `https://sheets.googleapis.com/v4/spreadsheets/${Config.API.BOOTLEG_SHEET_ID}/values:batchGet?key=${Config.API.KEY}`;

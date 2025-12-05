class RandomRipPlayer {
  constructor() {
    this.state = {
      currentVidId: null,
      previousVidId: null,
      currentVidTitle: null,
      isCurrentVidKFAD: false,
      previousChannel: null,
      currentChannel: null,
      isPreviousVidKFAD: false,
      isInfoReady: false,
      isAutoplay: true,
      allowRepeats: false,
      allowRepeatLock: false,
      isSkipKFAD: false,
      isNoWiki: false,
      channels: {
        siiva: true,
        ttgd: false,
        vavr: false,
        bootleg: false,
      },
      durationOfVidToSkip: Number.MAX_SAFE_INTEGER,
      yearFilterSelected: Number.NaN,
      watchedVidIds: [],
      skipDurationIndex: 0,
      yearFilterIndex: 0,
      sortIndex: 0,
      sortOption: "RANDOM",

      sheetsChecked: false,
      sheetsJson: null,

      // Data
      siiva_vids: [],
      ttgd_vids: [],
      vavr_vids: [],
      bootleg_vids: [],
      bootleg_channels: {}, // keys: channel name, values: boolean (enabled/disabled)

      unwatched: {
        siiva: [],
        ttgd: [],
        vavr: [],
        bootleg: [],
      },

      vid_db: null,
      bootleg_vid_db: null,
    };

    this.player = null;
    this.autoWikiWindow = null;
    this.firstVidPromise = null;
    this.currentExportChannel = null;

    this.yearFilterYears = Array.from(
      Array(new Date().getUTCFullYear() - Config.YearFilterStart + 1).keys(),
    ).map((x) => Config.YearFilterStart + x);
    this.yearFilterOptions = ["ALL"].concat(this.yearFilterYears);

    this.sortOptions = [
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
  }

  async init() {
    this.cleanupOldStorage();
    this.setupFirstVidPromise();
    this.bindEvents();
    this.loadTwitterPreference();
    this.initTheme();
  }

  cleanupOldStorage() {
    if (Config.browserHasLocalStorage) {
      if (window.localStorage.getItem(Config.StorageKeys.VID_DB)) {
        console.log("Cleaning up legacy localstorage vid_db");
        window.localStorage.removeItem(Config.StorageKeys.VID_DB);
      }
      if (window.localStorage.getItem(Config.StorageKeys.BOOTLEG_VID_DB)) {
        console.log("Cleaning up legacy localstorage bootleg_vid_db");
        window.localStorage.removeItem(Config.StorageKeys.BOOTLEG_VID_DB);
      }
    }
  }

  setupFirstVidPromise() {
    this.firstVidPromise = window.localStorage.getItem(
      Config.StorageKeys.RANDOM_VID,
    );
    if (!this.firstVidPromise) {
      this.firstVidPromise = new Promise(async (resolve) => {
        try {
          const vid_db = await idbKeyval.get(Config.StorageKeys.VID_DB);
          if (vid_db) {
            this.state.siiva_vids = vid_db[0];
            this.initWatchedVids();
            const unwatched = this.state.unwatched.siiva;
            const randomVid =
              unwatched[Math.floor(unwatched.length * Math.random())][0];
            window.localStorage.setItem(
              Config.StorageKeys.RANDOM_VID,
              randomVid,
            );
            resolve(randomVid);
          } else {
            throw "No cached db";
          }
        } catch (e) {
          const responseText = this.makeGetRequest(Config.API.SHEETS_QUERY);
          if (responseText) {
            try {
              this.state.sheetsJson = JSON.parse(responseText);
              this.state.vid_db = this.processSheetsJSON(this.state.sheetsJson);
              const randomVid =
                this.state.vid_db[0][
                  Math.floor(this.state.vid_db[0].length * Math.random())
                ][0];
              window.localStorage.setItem(
                Config.StorageKeys.RANDOM_VID,
                randomVid,
              );
              resolve(randomVid);
            } catch (parseError) {
              console.error("Error parsing sheets", parseError);
              resolve("rEcOzjg7vBU");
            }
          } else {
            resolve("rEcOzjg7vBU");
          }
        }
      });
    }
  }

  bindEvents() {
    document.addEventListener("DOMContentLoaded", () => {
      const bindings = [
        ["h4#homepage > a", undefined, "visit my homepage!"],
        [
          "li#rip_wiki_link > a",
          undefined,
          "opens link to the wiki page for this rip (if it exists) in a new tab. (consider making one if it doesn't!) (hotkey: ctrl-shift-f)",
        ],
        [
          "li#copy > a",
          () => this.copyRipLink(),
          "copies this rip's youtube url to your clipboard!",
        ],
        [
          "li#copyplaylist > a",
          () => this.copyDiscordPlaylist(),
          "copies a max length youtube playlist url to your clipboard! (rips generated based on your current filters)",
        ],
        ["li#dark > a", undefined, "toggle light/dark mode"], // theme handler attached in initTheme
        [
          "li#previous > a",
          () => this.previousVid(),
          "go back to the previous rip (hotkeys: ctrl+left shift-p)",
        ],
        [
          "li#skip > a",
          () => this.skipVid(),
          "pulls up the next random rip according to your filters and sorting (hotkeys: ctrl+right shift-n)",
        ],
        [
          "li#autoplay > a",
          () => this.toggleAutoplay(),
          "pull up a new random rip (according to filters and sorting) when the current rip ends",
        ],
        [
          "li#allowrepeats > a",
          () => this.toggleAllowRepeats(),
          "allow rips to be repeated (only available when unsorted) (rip watch history is stored in your localstorage)",
        ],
        [
          "li#autowiki > a",
          () => this.autoWikiPopup(),
          "creates a popup that will automatically navigate to the currently playing rip's wiki page! (automatic joke lists!)",
        ],
        [
          "li#skipduration > a",
          () => this.skipDurationClicked(),
          "skip rips that are over the specified duration (click to cycle through durations)",
        ],
        [
          "li#yearfilter > a",
          () => this.yearFilterClicked(),
          "view only rips from the selected year",
        ],
        [
          "li#sort > a",
          () => this.sortClicked(),
          "order rips in various ways (click to cycle through order options)",
        ],
        [
          "li#skipkfad > a",
          () => this.skipKFADClicked(),
          "skip rips that have variants of 'king for a day' in the title",
        ],
        [
          "li#nowiki > a",
          () => this.noWikiClicked(),
          "only plays rips in need of a wiki article",
        ],
        [
          "li#channels > a",
          () => this.toggleChannel(""),
          "select specific ripping channels to play random rips from (click this to toggle all channels)",
        ],
        [
          "li#siiva > a",
          () => this.toggleChannel("siiva"),
          "play rips from SiIvaGunner",
        ],
        [
          "li#ttgd > a",
          () => this.toggleChannel("ttgd"),
          "play rips from TimmyTurnersGrandDad",
        ],
        [
          "li#vavr > a",
          () => this.toggleChannel("vavr"),
          "play rips from VvvvvaVvvvvvr",
        ],
        [
          "li#bootleg > a",
          () => this.toggleChannel("bootleg"),
          "play vids from all other fan channels (inclusion previously based on the siiva wiki list of fan channels) i do not endorse anything here lol",
        ],
        ["a#hidetwitter", () => this.hideTwitter(false), ""],
        ["a#permahidetwitter", () => this.hideTwitter(true), ""],
        [
          "li#channels > a.percentcomplete",
          () => this.channelProgressClicked(),
          "",
        ],
        [
          "a#overwrite",
          () => this.overWriteClicked(),
          "save this string to export your watch history, or paste an exported one here, and click OVERWRITE to import (a blank string clears your watch history)",
        ],
        ["a#fc-close", () => this.toggleFanChannelWindow(false), "close window"],
        [
          "a#fc-all",
          () => this.toggleAllBootlegChannels(true),
          "select all fan channels",
        ],
        [
          "a#fc-none",
          () => this.toggleAllBootlegChannels(false),
          "deselect all fan channels",
        ],
      ];

      bindings.forEach(([selector, handler, tooltipMessage]) => {
        const el = document.querySelector(selector);
        if (el) {
          if (handler) {
            el.onclick = handler;
            el.onkeydown = (e) => {
              if (e.code === "Space" || e.code === "Enter") handler();
            };
          }
          if (tooltipMessage) {
            el.onmouseenter = () => this.tooltip(tooltipMessage);
            el.onmouseout = () => this.tooltip("");
            el.onfocus = () => this.tooltip(tooltipMessage);
            el.onblur = () => this.tooltip("");
          }
        }
      });

      // Special cases for complex tooltips
      const channelProgress = document.querySelector(
        "li#channels > a.percentcomplete",
      );
      if (channelProgress) {
        const show = () => this.channelProgressTooltip();
        const hide = () => this.tooltip("");
        channelProgress.onmouseover = show;
        channelProgress.onmouseout = hide;
        channelProgress.onfocus = show;
        channelProgress.onblur = hide;
      }

      const metadata = document.querySelector("div.ripmetadata");
      if (metadata) {
        const show = () => this.metadataTooltip();
        const hide = () => this.tooltip("");
        metadata.onmouseover = show;
        metadata.onmouseout = hide;
        metadata.onfocus = show;
        metadata.onblur = hide;
      }

      // Channel percentage tooltips
      ["siiva", "ttgd", "vavr", "bootleg"].forEach((ch) => {
        const el = document.querySelector(`li#${ch} > a.percentcomplete`);
        if (el) {
          const show = () => this.channelProgressTooltip(ch);
          const hide = () => this.tooltip("");
          el.onmouseenter = show;
          el.onmouseout = hide;
          el.onfocus = show;
          el.onblur = hide;
          el.onclick = () => this.channelProgressClicked(ch);
          el.onkeydown = (e) => {
            if (e.code === "Space" || e.code === "Enter")
              this.channelProgressClicked(ch);
          };
        }
      });

      // Media Session & Keyboard
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        this.skipVid(),
      );
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        this.previousVid(),
      );
      document.addEventListener("keydown", (e) => this.handleKeydown(e));
    });

    window.addEventListener("beforeunload", () => {
      if (!!this.autoWikiWindow && !this.autoWikiWindow.closed) {
        this.autoWikiWindow.close();
      }
    });
  }

  handleKeydown(event) {
    if (
      document.activeElement.nodeName == "A" &&
      (event.code === "Space" || event.code === "Enter")
    ) {
      return; // Let default link action happen
    }

    switch (event.code) {
      case "Space":
      case "KeyK":
        this.onSpaceBarPressed();
        break;
      case "End":
        this.player && this.player.seekTo(this.player.getDuration(), true);
        break;
      case "Home":
        this.player && this.player.seekTo(0, true);
        break;
      case "KeyM":
        this.player &&
          (this.player.isMuted() ? this.player.unMute() : this.player.mute());
        break;
      case "ArrowUp":
        this.player &&
          this.player.setVolume(Math.min(this.player.getVolume() + 5, 100));
        break;
      case "ArrowDown":
        this.player &&
          this.player.setVolume(Math.max(this.player.getVolume() - 5, 0));
        break;
      case "ArrowRight":
        if (event.ctrlKey) {
          this.skipVid();
        } else if (this.player) {
          this.player.seekTo(
            Math.min(
              this.player.getCurrentTime() + 5,
              this.player.getDuration(),
            ),
            true,
          );
        }
        break;
      case "ArrowLeft":
        if (event.ctrlKey) {
          this.previousVid();
        } else if (this.player) {
          this.player.seekTo(
            Math.max(this.player.getCurrentTime() - 5, 0),
            true,
          );
        }
        break;
      case "KeyL":
        this.player &&
          this.player.seekTo(
            Math.min(
              this.player.getCurrentTime() + 10,
              this.player.getDuration(),
            ),
            true,
          );
        break;
      case "KeyJ":
        this.player &&
          this.player.seekTo(
            Math.max(this.player.getCurrentTime() - 10, 0),
            true,
          );
        break;
      case "KeyF":
        if (event.ctrlKey && event.shiftKey) {
          window
            .open(
              this.wikiLinkFromTitle(
                this.state.currentVidTitle,
                this.state.currentChannel,
              ),
              "_blank",
            )
            .focus();
        }
        break;
    }
    // Rate control
    if (this.player) {
      let rates = this.player.getAvailablePlaybackRates();
      if (event.key === "N") this.skipVid();
      if (event.key === "P") this.previousVid();
      if (event.key === ">") {
        this.player.setPlaybackRate(
          rates[
            Math.min(
              rates.indexOf(this.player.getPlaybackRate()) + 1,
              rates.length,
            )
          ],
        );
      }
      if (event.key === "<") {
        this.player.setPlaybackRate(
          rates[Math.max(rates.indexOf(this.player.getPlaybackRate()) - 1, 0)],
        );
      }
      if (event.key >= "0" && event.key <= "9") {
        this.player.seekTo(
          Math.floor((this.player.getDuration() * parseInt(event.key)) / 10),
        );
      }
    }
  }

  onPlayerReady() {
    this.updateTitleMaxWidth();
    this.onTitleReady();
    if (!this.state.sheetsChecked) {
      Promise.all([this.checkSheets(), this.checkBootlegSheets()]).then(() => {
        this.initWatchedVids();
        window.localStorage.setItem(
          Config.StorageKeys.RANDOM_VID,
          this.getRandomUnwatchedSiivaVid(),
        );
        this.state.sheetsChecked = true;
      });
    }
  }

  onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
      this.clearTimeOver();
      if (this.state.isAutoplay) {
        this.newVid(true);
      }
    } else if (
      event.data == YT.PlayerState.PLAYING &&
      !this.state.isInfoReady
    ) {
      this.onTitleReady();
    }
    if (event.data == YT.PlayerState.PLAYING) {
      this.setTimeOver();
    } else {
      this.clearTimeOver();
    }
  }

  onError(event) {
    if (event.data >= 100) this.newVid(true);
  }

  onTitleReady() {
    const data = this.player.getVideoData();
    this.state.currentVidTitle = data.title;
    this.state.isCurrentVidKFAD = Config.Filters.KFAD.some((f) =>
      this.state.currentVidTitle.toLowerCase().includes(f),
    );

    if (this.state.isCurrentVidKFAD && this.state.isSkipKFAD) {
      this.newVid(false);
      return;
    }

    this.state.currentChannel = data.author || "SiIvaGunner";
    this.state.isInfoReady = true;
    this.updateWikiLink();
    this.updateNowPlaying();
  }

  // --- Logic ---

  tooltip(msg = "") {
    const el = document.querySelector("h3#tooltip");
    if (el) el.textContent = msg;
  }

  metadataTooltip() {
    if (this.state.currentChannel && this.state.currentVidTitle) {
      this.tooltip(
        `current ${this.state.currentChannel} rip: ${this.state.currentVidTitle}`,
      );
    }
  }

  channelProgressTooltip(channel = "") {
    var num_total_vids, num_unwatched_vids, channelText, parenthetical;
    if (channel == "") {
      num_total_vids =
        this.state.siiva_vids.length +
        this.state.ttgd_vids.length +
        this.state.vavr_vids.length +
        this.state.bootleg_vids.length;
      num_unwatched_vids =
        this.state.unwatched.siiva.length +
        this.state.unwatched.ttgd.length +
        this.state.unwatched.vavr.length +
        this.state.unwatched.bootleg.length;
      channelText = "siiva and all fan channels";
      parenthetical = "(click to open progress import/export menu)";
    } else if (channel == "siiva") {
      num_total_vids = this.state.siiva_vids.length;
      num_unwatched_vids = this.state.unwatched.siiva.length;
      channelText = "SiIvaGunner's channel";
      parenthetical = "(click to open progress import/export menu)";
    } else if (channel == "ttgd") {
      num_total_vids = this.state.ttgd_vids.length;
      num_unwatched_vids = this.state.unwatched.ttgd.length;
      channelText = "TimmyTurnersGrandDad's channel";
      parenthetical = "(click to open progress import/export menu)";
    } else if (channel == "vavr") {
      num_total_vids = this.state.vavr_vids.length;
      num_unwatched_vids = this.state.unwatched.vavr.length;
      channelText = "VvvvvaVvvvvvr's channel";
      parenthetical = "(click to open progress import/export menu)";
    } else if (channel == "bootleg") {
      num_total_vids = this.state.bootleg_vids.length;
      num_unwatched_vids = this.state.unwatched.bootleg.length;
      channelText = "all remaining fan channels";
      parenthetical = "(click to open progress import/export menu)";
    }
    this.tooltip(
      `you've watched ${(num_total_vids - num_unwatched_vids).toLocaleString()} out of ${num_total_vids.toLocaleString()} total rips on ${channelText}, only ${num_unwatched_vids.toLocaleString()} more to go! ${parenthetical}`,
    );
  }

  updateNowPlaying() {
    document.querySelector("h2#nowplaying").textContent =
      this.state.currentVidTitle;
    document.title = this.state.currentVidTitle + " - Random Rip Player";
    this.updateMediaSession();
    document.querySelector("h2#author").textContent = this.state.currentChannel;
  }

  updateMediaSession() {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.state.currentVidTitle.match(/^.*?((?=\s[-|]\s)|$)/g),
        artist: this.state.currentChannel,
        album: this.state.currentVidTitle.match(/(?<=\s[-|]\s).*$/g),
        artwork: [
          {
            src:
              "https://img.youtube.com/vi/" +
              this.state.currentVidId +
              "/0.jpg",
            sizes: "480x360",
            type: "image/jpg",
          },
        ],
      });
    }
  }

  updateTitleMaxWidth() {
    const playerFrame = document.querySelector("iframe#player");
    if (playerFrame) {
      document.querySelector("h2#nowplaying").style.maxWidth =
        playerFrame.offsetWidth + "px";
    }
  }

  updateWikiLink() {
    const link = this.wikiLinkFromTitle(
      this.state.currentVidTitle,
      this.state.currentChannel,
    );
    const el = document.querySelector("#rip_wiki_link > a");
    if (link) {
      el.href = link;
    } else {
      el.removeAttribute("href");
    }
    if (!!this.autoWikiWindow && !this.autoWikiWindow.closed && !!link) {
      this.autoWikiWindow.location.href = link;
    }
  }

  wikiLinkFromTitle(title, wiki) {
    if (wiki == "SiIvaGunner") wiki = "siivagunner.wiki";
    else if (wiki == "TimmyTurnersGrandDad") wiki = "ttgd.fandom.com";
    else if (wiki == "VvvvvaVvvvvvr") wiki = "vvvvvavvvvvr.fandom.com";
    else return null;

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

  async checkSheets() {
    let storedTimestamp = window.localStorage.getItem(
      Config.StorageKeys.SHEET_TIMESTAMP,
    );
    let dbHasData = false;
    try {
      if (await idbKeyval.get(Config.StorageKeys.VID_DB)) dbHasData = true;
    } catch (e) {}

    if (
      !Config.browserHasLocalStorage ||
      !dbHasData ||
      !(storedTimestamp && parseInt(storedTimestamp) > Date.now())
    ) {
      if (!this.state.sheetsJson) {
        const json = this.makeJSONRequest(Config.API.SHEETS_QUERY);
        if (json) {
          this.state.sheetsJson = json;
          this.state.vid_db = this.processSheetsJSON(json);
        } else if (dbHasData) {
          this.state.vid_db = await idbKeyval.get(Config.StorageKeys.VID_DB);
        } else {
          console.error("Critical: No sheet data");
          return;
        }
      } else if (!this.state.vid_db) {
        this.state.vid_db = this.processSheetsJSON(this.state.sheetsJson);
      }
      if (Config.browserHasLocalStorage && this.state.sheetsJson) {
        await idbKeyval.set(Config.StorageKeys.VID_DB, this.state.vid_db);
        window.localStorage.setItem(
          Config.StorageKeys.SHEET_TIMESTAMP,
          Date.now() + 86400000,
        );
      }
    } else {
      try {
        this.state.vid_db = await idbKeyval.get(Config.StorageKeys.VID_DB);
        if (!this.state.vid_db) throw "empty db";
      } catch (e) {
        await idbKeyval.delete(Config.StorageKeys.VID_DB);
        window.localStorage.removeItem(Config.StorageKeys.SHEET_TIMESTAMP);
        return this.checkSheets();
      }
    }
    this.state.siiva_vids = this.state.vid_db[0];
    this.state.ttgd_vids = this.state.vid_db[1];
    this.state.vavr_vids = this.state.vid_db[2];
  }

  async checkBootlegSheets() {
    let storedTimestamp = window.localStorage.getItem(
      Config.StorageKeys.BOOTLEG_SHEET_TIMESTAMP,
    );
    let dbHasData = false;
    try {
      const db = await idbKeyval.get(Config.StorageKeys.BOOTLEG_VID_DB);
      if (db && db.length > 0 && db[0].length > 9) {
        dbHasData = true;
        this.state.bootleg_vid_db = db; // Pre-load to check validity
      }
    } catch (e) {}

    if (
      !Config.browserHasLocalStorage ||
      !dbHasData ||
      !(storedTimestamp && parseInt(storedTimestamp) > Date.now())
    ) {
      const namesJson = this.makeJSONRequest(Config.API.BOOTLEG_SHEET_QUERY);
      if (namesJson && namesJson["sheets"]) {
        const names = namesJson["sheets"]
          .map((s) => s.properties.title)
          .filter(
            (t) =>
              !["Summary", "Template"].includes(t) &&
              !Config.API.CHANNEL_BLOCKLIST.includes(cyrb53(t)),
          );

        const batches = this.chunk(names, 100);
        const jsons = batches.map((batch) =>
          this.makeJSONRequest(
            Config.API.BOOTLEG_SHEETS_BATCH_QUERY +
              batch
                .map((n) => "&ranges=" + encodeURIComponent(n) + "!A2:K")
                .join(""),
          ),
        );

        const combined = jsons.reduce((acc, curr) => {
          if (!curr) return acc;
          acc.valueRanges = (acc.valueRanges || []).concat(
            curr.valueRanges || [],
          );
          return acc;
        }, {});

        if (combined.valueRanges) {
          this.state.bootleg_vid_db = this.processBootlegSheetsJSON(combined);
          if (Config.browserHasLocalStorage) {
            await idbKeyval.set(
              Config.StorageKeys.BOOTLEG_VID_DB,
              this.state.bootleg_vid_db,
            );
            window.localStorage.setItem(
              Config.StorageKeys.BOOTLEG_SHEET_TIMESTAMP,
              Date.now() + 172800000,
            );
          }
        } else {
          this.state.bootleg_vid_db = dbHasData
            ? await idbKeyval.get(Config.StorageKeys.BOOTLEG_VID_DB)
            : [];
        }
      } else {
        this.state.bootleg_vid_db = dbHasData
          ? await idbKeyval.get(Config.StorageKeys.BOOTLEG_VID_DB)
          : [];
      }
    } else {
      try {
        // Already loaded in the validity check above, but let's ensure consistency
        if (!this.state.bootleg_vid_db) {
          this.state.bootleg_vid_db = await idbKeyval.get(
            Config.StorageKeys.BOOTLEG_VID_DB,
          );
        }
        if (!this.state.bootleg_vid_db) throw "empty bootleg db";
      } catch (e) {
        await idbKeyval.delete(Config.StorageKeys.BOOTLEG_VID_DB);
        window.localStorage.removeItem(
          Config.StorageKeys.BOOTLEG_SHEET_TIMESTAMP,
        );
        return this.checkBootlegSheets();
      }
    }
    this.state.bootleg_vids = this.state.bootleg_vid_db;
    this.initBootlegChannels();
  }

  initBootlegChannels() {
    // Extract all unique channels
    const channels = [
      ...new Set(this.state.bootleg_vids.map((v) => v[9])),
    ].sort((a, b) => a.localeCompare(b));

    // Load saved preferences
    let saved = {};
    try {
      saved = JSON.parse(
        window.localStorage.getItem(Config.StorageKeys.BOOTLEG_CHANNELS) ||
          "{}",
      );
    } catch (e) {}

    channels.forEach((ch) => {
      if (saved.hasOwnProperty(ch)) {
        this.state.bootleg_channels[ch] = saved[ch];
      } else {
        this.state.bootleg_channels[ch] = true; // Default to true
      }
    });

    this.renderFanChannelWindow();
  }


  // --- Helpers ---

  makeGetRequest(url) {
    var Httpreq = new XMLHttpRequest();
    Httpreq.open("GET", url, false);
    Httpreq.send(null);
    if (Httpreq.status !== 200) return null;
    return Httpreq.responseText;
  }

  makeJSONRequest(url) {
    try {
      const text = this.makeGetRequest(url);
      return text ? JSON.parse(text) : null;
    } catch (e) {
      console.error("Request failed", url, e);
      return null;
    }
  }

  chunk(arr, size) {
    if (arr.length <= size) return [arr];
    return [arr.slice(0, size), ...this.chunk(arr.slice(size), size)];
  }

  processSheetsJSON(json) {
    const filter = (row) => !["Private", "Deleted"].includes(row[3]);
    const map = (row) => [
      row[0],
      row[1].replaceAll(/\s{2,}/g, " "),
      row[2] == "Documented" ? true : row[2] == "Undocumented" ? false : null,
      Date.parse(row[4].replace(/\s+/, " ")),
      this.parseISO8601DurationToSeconds(row[5]),
      parseInt(row[7]),
      parseInt(row[8]),
      parseInt(row[9]),
      parseInt(row[10]),
    ];
    const process = (n) =>
      json["valueRanges"][n]["values"].filter(filter).map(map);
    return [0, 1, 2].map(process);
  }

  processBootlegSheetsJSON(json) {
    const filter = (row) =>
      !["Private", "Deleted"].includes(row[3]) &&
      row[5] != null &&
      row[1] != null;
    const map = (row, channelName) => [
      row[0],
      row[1].replaceAll(/\s{2,}/g, " "),
      false,
      Date.parse(row[4].replace(/\s+/, " ")),
      this.parseISO8601DurationToSeconds(row[5]),
      parseInt(row[7]),
      parseInt(row[8]),
      parseInt(row[9]),
      parseInt(row[10]),
      channelName,
    ];
    const process = (n) => {
      const range = json["valueRanges"][n]["range"];
      const match = range.match(/^'?(.*?)'?!/);
      const channelName = match ? match[1] : "Unknown";
      return json["valueRanges"][n]["values"]
        .filter(filter)
        .map((row) => map(row, channelName));
    };
    return [].concat.apply(
      [],
      Array.from(Array(json["valueRanges"].length).keys()).map(process),
    );
  }

  parseISO8601DurationToSeconds(iso8601Duration) {
    var matches = iso8601Duration.match(Config.Regex.ISO8601Duration);
    return matches
      ? (matches[1] === undefined ? 1 : -1) *
          ((matches[2] === undefined ? 0 : parseInt(matches[2])) * 31536000 +
            (matches[3] === undefined ? 0 : parseInt(matches[3])) * 2592000 +
            (matches[4] === undefined ? 0 : parseInt(matches[4])) * 604800 +
            (matches[5] === undefined ? 0 : parseInt(matches[5])) * 86400 +
            (matches[6] === undefined ? 0 : parseInt(matches[6])) * 3600 +
            (matches[7] === undefined ? 0 : parseInt(matches[7])) * 60 +
            (matches[8] === undefined ? 0 : parseInt(matches[8])))
      : 0;
  }

  initWatchedVids() {
    if (
      Config.browserHasLocalStorage &&
      window.localStorage.getItem(Config.StorageKeys.WATCHED_VID_IDS)
    ) {
      try {
        this.state.watchedVidIds = JSON.parse(
          window.localStorage.getItem(Config.StorageKeys.WATCHED_VID_IDS),
        );
      } catch (e) {
        this.state.watchedVidIds = [];
      }
    } else {
      this.state.watchedVidIds = [];
    }
    this.initUnwatched();
  }

  initUnwatched() {
    const watchedSet = new Set(this.state.watchedVidIds);
    const isUnwatched = (x) => !watchedSet.has(x[0]);
    this.state.unwatched.siiva = this.state.siiva_vids.filter(isUnwatched);
    this.state.unwatched.ttgd = this.state.ttgd_vids.filter(isUnwatched);
    this.state.unwatched.vavr = this.state.vavr_vids.filter(isUnwatched);
    this.state.unwatched.bootleg = this.state.bootleg_vids.filter(isUnwatched);
    this.updateWatchPercentages();
  }

  // --- UI Actions ---

  skipVid() {
    this.newVid(true);
  }
  previousVid() {
    if (this.state.previousVidId) {
      [this.state.currentVidId, this.state.previousVidId] = [
        this.state.previousVidId,
        this.state.currentVidId,
      ];
      this.state.isInfoReady = false;
      this.player.loadVideoById(this.state.currentVidId);
      this.player.playVideo();
    }
  }

  newVid(markWatched) {
    if (markWatched) this.markVidWatched(this.state.currentVidId);
    this.state.previousVidId = this.state.currentVidId;
    this.state.currentVidId = this.nextVidId();
    window.localStorage.setItem(
      Config.StorageKeys.RANDOM_VID,
      this.getRandomUnwatchedSiivaVid(),
    );
    this.state.previousChannel = this.state.currentChannel;
    this.state.isPreviousVidKFAD = this.state.isCurrentVidKFAD;
    this.state.isInfoReady = false;
    this.player.loadVideoById(this.state.currentVidId);
    this.player.playVideo();
  }

  markVidWatched(id) {
    if (!this.state.watchedVidIds.includes(id)) {
      this.state.watchedVidIds.push(id);
      window.localStorage.setItem(
        Config.StorageKeys.WATCHED_VID_IDS,
        JSON.stringify(this.state.watchedVidIds),
      );

      const notVidFilter = (x) => x[0] !== id;
      this.state.unwatched.siiva =
        this.state.unwatched.siiva.filter(notVidFilter);
      this.state.unwatched.ttgd =
        this.state.unwatched.ttgd.filter(notVidFilter);
      this.state.unwatched.vavr =
        this.state.unwatched.vavr.filter(notVidFilter);
      this.state.unwatched.bootleg =
        this.state.unwatched.bootleg.filter(notVidFilter);
      this.updateWatchPercentages();
    }
  }

  getRandomUnwatchedSiivaVid() {
    const list = this.state.unwatched.siiva;
    return list.length
      ? list[Math.floor(Math.random() * list.length)][0]
      : "rEcOzjg7vBU";
  }

  nextVidId() {
    const ids = this.getVidIds(1);
    return ids[0] || "h6Ja9JyXs-I";
  }

  getVidIds(num) {
    let list = [];
    const s = this.state;
    if (s.channels.siiva)
      list = list.concat(s.allowRepeats ? s.siiva_vids : s.unwatched.siiva);
    if (s.channels.ttgd)
      list = list.concat(s.allowRepeats ? s.ttgd_vids : s.unwatched.ttgd);
    if (s.channels.vavr)
      list = list.concat(s.allowRepeats ? s.vavr_vids : s.unwatched.vavr);
    if (s.channels.bootleg) {
      const bootlegSource = s.allowRepeats ? s.bootleg_vids : s.unwatched.bootleg;
      const filteredBootleg = bootlegSource.filter((v) => {
        // If v[9] (channel name) exists, check if it's enabled. Default to true if missing.
        const ch = v[9];
        return !ch || s.bootleg_channels[ch] !== false;
      });
      list = list.concat(filteredBootleg);
    }

    if (s.isSkipKFAD) {
      list = list.filter(
        (v) => !Config.Filters.KFAD.some((f) => v[1].toLowerCase().includes(f)),
      );
    }
    if (s.skipDurationIndex !== 0) {
      list = list.filter((v) => v[4] < s.durationOfVidToSkip);
    }
    if (s.yearFilterIndex !== 0) {
      list = list.filter(
        (v) => new Date(v[3]).getFullYear() == s.yearFilterSelected,
      );
    }
    if (s.isNoWiki) {
      list = list.filter((v) => v[2] === false);
    }
    list = list.filter(
      (v) => !Config.API.RIP_BLOCKLIST.includes(cyrb53(v[0])) && !!v[0],
    );

    const opt = this.sortOptions[s.sortIndex];
    if (s.sortOption.startsWith("RANDOM")) {
      if (s.sortOption !== "RANDOM") {
        list.sort((a, b) => opt[1](b) - opt[1](a));
      }
      const sampler = opt[2];
      return Array(num)
        .fill(0)
        .map(() => {
          if (!list.length) return null;
          return list.splice(Math.floor(list.length * sampler()), 1)[0][0];
        })
        .filter(Boolean);
    } else {
      list = list.filter(opt[3]);
      const mapped = list.map(opt[1]);
      return Array(num)
        .fill(0)
        .map(() => {
          const idx = mapped.indexOf(opt[2].apply(null, mapped));
          if (idx === -1) return null;
          return list.splice(idx, 1)[0][0];
        })
        .filter(Boolean);
    }
  }

  toggleAutoplay() {
    this.state.isAutoplay = !this.state.isAutoplay;
    if (
      this.state.isAutoplay &&
      this.player &&
      this.player.getPlayerState() == YT.PlayerState.ENDED
    ) {
      this.newVid(true);
    }
    this.updateCheckboxes();
  }

  toggleAllowRepeats() {
    if (!this.state.allowRepeatLock) {
      this.state.allowRepeats = !this.state.allowRepeats;
      this.updateCheckboxes();
    }
  }

  toggleChannel(ch) {
    const s = this.state;
    if (ch === "siiva") {
      s.channels.siiva = !s.channels.siiva;
      if (
        !s.channels.siiva &&
        !s.channels.ttgd &&
        !s.channels.vavr &&
        !s.channels.bootleg
      ) {
        s.channels.ttgd = s.channels.vavr = s.channels.bootleg = true;
      }
    } else if (ch) {
      s.channels[ch] = !s.channels[ch];
    } else {
      const all =
        s.channels.siiva &&
        s.channels.ttgd &&
        s.channels.vavr &&
        s.channels.bootleg;
      s.channels.siiva =
        s.channels.ttgd =
        s.channels.vavr =
        s.channels.bootleg =
          !all;
    }

    if (
      !s.channels.siiva &&
      !s.channels.ttgd &&
      !s.channels.vavr &&
      !s.channels.bootleg
    ) {
      s.channels.siiva = true;
    }
    this.updateCheckboxes();
    this.toggleFanChannelWindow(s.channels.bootleg);
  }

  toggleFanChannelWindow(show) {
    const win = document.getElementById("fanchannelwindow");
    if (show) {
      win.style.display = "block";
      this.renderFanChannelWindow(); // Re-render to ensure updates
    } else {
      win.style.display = "none";
    }
  }

  renderFanChannelWindow() {
    const list = document.getElementById("fanchannellist");
    list.innerHTML = "";

    Object.keys(this.state.bootleg_channels)
      .sort((a, b) => a.localeCompare(b))
      .forEach((ch) => {
        const div = document.createElement("div");
        div.className = "fc-item";
        div.tabIndex = 0;
        div.onclick = () => this.toggleBootlegChannel(ch);
        div.onkeydown = (e) => {
          if (e.code === "Space" || e.code === "Enter") {
            e.preventDefault();
            this.toggleBootlegChannel(ch);
          }
        };
        div.innerHTML = `<span class="checkbox">${this.state.bootleg_channels[ch] ? "☑" : "☐"}</span> <span>${ch}</span>`;
        list.appendChild(div);
      });
  }

  toggleBootlegChannel(ch) {
    this.state.bootleg_channels[ch] = !this.state.bootleg_channels[ch];
    if (Config.browserHasLocalStorage) {
      window.localStorage.setItem(
        Config.StorageKeys.BOOTLEG_CHANNELS,
        JSON.stringify(this.state.bootleg_channels),
      );
    }
    this.renderFanChannelWindow();
  }

  toggleAllBootlegChannels(enable) {
    for (const ch in this.state.bootleg_channels) {
      this.state.bootleg_channels[ch] = enable;
    }
    if (Config.browserHasLocalStorage) {
      window.localStorage.setItem(
        Config.StorageKeys.BOOTLEG_CHANNELS,
        JSON.stringify(this.state.bootleg_channels),
      );
    }
    this.renderFanChannelWindow();
  }

  updateCheckboxes() {
    const s = this.state;
    const set = (sel, val) =>
      (document.querySelector(sel).textContent = val ? "☑" : "☐");
    set("li#autoplay > a > span.checkbox", s.isAutoplay);
    set("li#allowrepeats > a > span.checkbox", s.allowRepeats);
    set("li#skipkfad > a > span.checkbox", s.isSkipKFAD);
    set("li#nowiki > a > span.checkbox", s.isNoWiki);
    set("li#siiva > a > span.checkbox", s.channels.siiva);
    set("li#ttgd > a > span.checkbox", s.channels.ttgd);
    set("li#vavr > a > span.checkbox", s.channels.vavr);
    set("li#bootleg > a > span.checkbox", s.channels.bootleg);
  }

  updateWatchPercentages() {
    const s = this.state;
    const total =
      s.siiva_vids.length +
      s.ttgd_vids.length +
      s.vavr_vids.length +
      s.bootleg_vids.length;
    const unwatched =
      s.unwatched.siiva.length +
      s.unwatched.ttgd.length +
      s.unwatched.vavr.length +
      s.unwatched.bootleg.length;

    const pct = (num, den) =>
      den ? (100 * (1 - num / den)).toFixed(2) : "0.00";

    document.querySelector("li#channels > a.percentcomplete").text =
      `(${pct(unwatched, total)}% watched)`;
    document.querySelector("li#siiva > a.percentcomplete").text =
      `(${pct(s.unwatched.siiva.length, s.siiva_vids.length)}% watched)`;
    document.querySelector("li#ttgd > a.percentcomplete").text =
      `(${pct(s.unwatched.ttgd.length, s.ttgd_vids.length)}% watched)`;
    document.querySelector("li#vavr > a.percentcomplete").text =
      `(${pct(s.unwatched.vavr.length, s.vavr_vids.length)}% watched)`;
    document.querySelector("li#bootleg > a.percentcomplete").text =
      `(${pct(s.unwatched.bootleg.length, s.bootleg_vids.length)}% watched)`;
  }

  skipDurationClicked() {
    this.state.skipDurationIndex =
      (this.state.skipDurationIndex + 1) % Config.Durations.length;
    const setting = Config.Durations[this.state.skipDurationIndex];
    document.querySelector("li#skipduration > a > span.checkbox").textContent =
      setting[0];
    this.state.durationOfVidToSkip = setting[1];
  }

  yearFilterClicked() {
    this.state.yearFilterIndex =
      (this.state.yearFilterIndex + 1) % this.yearFilterOptions.length;
    document.querySelector("li#yearfilter > a > span.checkbox").textContent =
      this.yearFilterOptions[this.state.yearFilterIndex];
    this.state.yearFilterSelected = parseInt(
      this.yearFilterOptions[this.state.yearFilterIndex],
    );
  }

  sortClicked() {
    this.state.sortIndex = (this.state.sortIndex + 1) % this.sortOptions.length;
    if (this.state.sortIndex < 3) {
      this.state.allowRepeatLock = false;
    } else {
      this.state.allowRepeatLock = true;
      this.state.allowRepeats = false;
      this.updateCheckboxes();
    }
    this.state.sortOption = this.sortOptions[this.state.sortIndex][0];
    document.querySelector("li#sort > a > span.sortoption").textContent =
      this.state.sortOption;
  }

  skipKFADClicked() {
    this.state.isSkipKFAD = !this.state.isSkipKFAD;
    this.updateCheckboxes();
    if (this.state.isCurrentVidKFAD && this.state.isSkipKFAD) {
      this.newVid(true);
    }
  }

  noWikiClicked() {
    this.state.isNoWiki = !this.state.isNoWiki;
    this.updateCheckboxes();
  }

  loadTwitterPreference() {
    if (
      Config.browserHasLocalStorage &&
      window.localStorage.getItem(Config.StorageKeys.SHOW_TWITTER_TIMESTAMP) &&
      parseInt(
        window.localStorage.getItem(Config.StorageKeys.SHOW_TWITTER_TIMESTAMP),
      ) > Date.now()
    ) {
      this.hideTwitter(false);
    } else {
      document.querySelector("h3#twitter").style.display = "";
    }
  }

  hideTwitter(perma) {
    document.querySelector("h3#twitter").style.display = "none";
    if (Config.browserHasLocalStorage) {
      window.localStorage.setItem(
        Config.StorageKeys.SHOW_TWITTER_TIMESTAMP,
        perma ? Number.MAX_SAFE_INTEGER : Date.now() + 80000000,
      );
    }
  }

  initTheme() {
    const themeSwitch = (forceDark) => {
      const darkBtn = document.querySelector("li#dark > a");
      if (forceDark) {
        document.body.style.background = "black";
        document.body.style.color = "white";
        document.cookie = "theme=dark; SameSite=Strict";
        if (darkBtn) darkBtn.textContent = "LIGHT";
      } else {
        document.body.style.background = "white";
        document.body.style.color = "black";
        document.cookie = "theme=light; SameSite=Strict";
        if (darkBtn) darkBtn.textContent = "DARK";
      }
    };

    const isWhite = () => document.body.style.background.includes("white");
    document.querySelector("li#dark > a").onclick = () =>
      themeSwitch(isWhite());

    // Initial check
    const cookieDark = !document.cookie
      .split(";")
      .some((i) => i.includes("theme=light"));
    themeSwitch(cookieDark);
  }

  copyRipLink() {
    const link = "https://www.youtube.com/watch?v=" + this.state.currentVidId;
    this.copyToClipboard(link);
    this.tooltip("rip link copied!");
    document.querySelector("li#copy > a").textContent = "COPIED.......";
    setTimeout(
      () =>
        (document.querySelector("li#copy > a").textContent = "COPY RIP LINK"),
      1000,
    );
  }

  copyDiscordPlaylist() {
    const ids = this.getVidIds(500).join(",");
    let url = "https://www.youtube.com/watch_videos?video_ids=" + ids;
    url = url.substring(0, Math.min(url.length, 2000));
    url = url.substring(0, url.lastIndexOf(","));
    this.copyToClipboard(url);
    this.tooltip("playlist command copied!");
    document.querySelector("li#copyplaylist > a").textContent =
      "COPIED...........";
    setTimeout(
      () =>
        (document.querySelector("li#copyplaylist > a").textContent =
          "GENERATE PLAYLIST"),
      1000,
    );
  }

  copyToClipboard(text) {
    const input = document.createElement("textarea");
    input.innerHTML = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  getVidsForChannel(channel) {
    if (channel === "siiva") return this.state.siiva_vids;
    if (channel === "ttgd") return this.state.ttgd_vids;
    if (channel === "vavr") return this.state.vavr_vids;
    if (channel === "bootleg") return this.state.bootleg_vids;
    return [];
  }

  channelProgressClicked(channel = null) {
    const pasteArea = document.querySelector("#pastearea");
    const overwrite = document.querySelector("#overwrite");
    const ta = document.querySelector("#pastearea > textarea");
    const label = document.querySelector("#pastearea > h4");

    const visible = pasteArea.style.visibility === "visible";

    let shouldShow = !visible;
    if (visible && this.currentExportChannel !== channel) {
      shouldShow = true;
    }
    this.currentExportChannel = channel;

    if (!shouldShow) {
      pasteArea.style.visibility = "hidden";
      return;
    }

    let idsToExport = [];
    let labelText = "Watch progress string:";

    if (!channel) {
      idsToExport = this.state.watchedVidIds;
      labelText = "All Channels watch progress string:";
    } else {
      const channelVids = this.getVidsForChannel(channel);
      const channelVidIds = new Set(channelVids.map((v) => v[0]));
      idsToExport = this.state.watchedVidIds.filter((id) =>
        channelVidIds.has(id),
      );

      const channelNames = {
        siiva: "SiIvaGunner",
        ttgd: "TTGD",
        vavr: "VAVR",
        bootleg: "Fan Channel",
      };
      labelText = `${channelNames[channel]} watch progress string:`;
    }

    overwrite.textContent = "OVERWRITE?";
    label.textContent = labelText;
    ta.value = btoa(idsToExport.join(","));
    pasteArea.style.visibility = "visible";
    ta.select();
  }

  overWriteClicked() {
    const btn = document.querySelector("#overwrite");
    const txt = btn.textContent;

    if (txt === "OVERWRITE?") btn.textContent = "ARE YOU SURE?";
    else if (txt === "ARE YOU SURE?") btn.textContent = "REALLY REALLY SURE?";
    else if (txt === "REALLY REALLY SURE?") {
      const ta = document.querySelector("#pastearea > textarea");
      if (!ta.value) {
        if (!this.currentExportChannel) {
          this.state.watchedVidIds = [];
          btn.textContent = "WATCH HISTORY CLEARED";
        } else {
          const channelVids = this.getVidsForChannel(this.currentExportChannel);
          const channelVidIds = new Set(channelVids.map((v) => v[0]));
          this.state.watchedVidIds = this.state.watchedVidIds.filter(
            (id) => !channelVidIds.has(id),
          );
          btn.textContent = "CHANNEL HISTORY CLEARED";
        }
      } else {
        btn.textContent = "PROCESSING...";
        let ids = atob(ta.value).split(",");
        // filter garbage
        ids = ids.filter((id) => {
          if (/^(Unknown|)$/.test(id)) return false;
          return /^([a-zA-Z0-9_-]{11})$/.test(id);
        });

        if (!this.currentExportChannel) {
          this.state.watchedVidIds = ids;
        } else {
          const channelVids = this.getVidsForChannel(this.currentExportChannel);
          const channelVidIds = new Set(channelVids.map((v) => v[0]));

          // Remove existing progress for this channel
          this.state.watchedVidIds = this.state.watchedVidIds.filter(
            (id) => !channelVidIds.has(id),
          );

          // Add new progress, strictly filtering for this channel to avoid pollution
          const validIds = ids.filter((id) => channelVidIds.has(id));
          this.state.watchedVidIds = this.state.watchedVidIds.concat(validIds);
        }

        window.localStorage.setItem(
          Config.StorageKeys.WATCHED_VID_IDS,
          JSON.stringify(this.state.watchedVidIds),
        );
      }
      setTimeout(() => {
        this.initUnwatched();
        let loadedCount;
        let messageSuffix;
        if (!this.currentExportChannel) {
          loadedCount = this.state.watchedVidIds.length;
          messageSuffix = "WATCHED VIDS...";
        } else {
          const channelVids = this.getVidsForChannel(this.currentExportChannel);
          const channelVidIds = new Set(channelVids.map((v) => v[0]));
          loadedCount = this.state.watchedVidIds.filter((id) =>
            channelVidIds.has(id),
          ).length;
          const channelNames = {
            siiva: "SiIvaGunner",
            ttgd: "TimmyTurnersGrandDad",
            vavr: "VvvvvaVvvvvvr",
            bootleg: "Fan Channel",
          };
          const channelDisplayName = channelNames[this.currentExportChannel];
          messageSuffix = `${channelDisplayName.toUpperCase()} WATCHED VIDS...`;
        }
        btn.textContent = `LOADED ${loadedCount} ${messageSuffix}`;
      }, 0);
    } else {
      btn.textContent = "OVERWRITE?";
    }
  }

  onSpaceBarPressed() {
    if (!this.player) return;
    const state = this.player.getPlayerState();
    if (state == YT.PlayerState.ENDED && !this.state.isAutoplay) {
      this.newVid(true);
    } else if (
      state == YT.PlayerState.PLAYING ||
      state == YT.PlayerState.BUFFERING
    ) {
      this.player.pauseVideo();
    } else if (
      state == YT.PlayerState.PAUSED ||
      state == YT.PlayerState.CUED ||
      state == YT.PlayerState.UNSTARTED
    ) {
      this.player.playVideo();
    }
  }

  clearTimeOver() {
    document.querySelector("#timeover").textContent = "";
  }
  setTimeOver() {
    document.querySelector("#timeover").textContent = Math.floor(
      Date.now() / 1000 -
        this.player.getCurrentTime() +
        this.player.getDuration(),
    );
  }

  autoWikiPopup() {
    const link = this.wikiLinkFromTitle(
      this.state.currentVidTitle,
      this.state.currentChannel,
    );
    const target = link || "https://www.siivagunner.wiki/wiki/SiIvaGunner_Wiki";
    this.autoWikiWindow = window.open(target, "Auto Updating Wiki Popup", [
      "resizable",
      "scrollbars",
      "status",
    ]);
  }
}

// Initialize
const app = new RandomRipPlayer();
app.init();

// YouTube API Callback
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = async () => {
  const container = document.querySelector("div.embedcontainer");
  const vidId = await app.firstVidPromise;
  app.state.currentVidId = vidId; // Set initial ID

  app.player = new YT.Player("player", {
    height: container.offsetHeight,
    width: container.offsetWidth,
    videoId: vidId,
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
      onReady: (e) => app.onPlayerReady(e),
      onStateChange: (e) => app.onPlayerStateChange(e),
      onError: (e) => app.onError(e),
    },
  });
};

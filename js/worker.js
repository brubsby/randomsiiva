const ISO8601DurationRegex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;

function parseISO8601DurationToSeconds(iso8601Duration) {
    var matches = iso8601Duration.match(ISO8601DurationRegex);
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

function processSheetsJSON(json) {
    const filter = (row) => !["Private", "Deleted"].includes(row[3]);
    const map = (row) => [
      row[0],
      row[1].replaceAll(/\s{2,}/g, " "),
      row[2] == "Documented" ? true : row[2] == "Undocumented" ? false : null,
      Date.parse(row[4].replace(/\s+/, " ")),
      parseISO8601DurationToSeconds(row[5]),
      parseInt(row[7]),
      parseInt(row[8]),
      parseInt(row[9]),
      parseInt(row[10]),
    ];
    return json.valueRanges.map((range) =>
      range.values.filter(filter).map(map),
    );
}

function processBootlegSheetsJSON(json) {
    const filter = (row) =>
      !["Private", "Deleted"].includes(row[3]) &&
      row[5] != null &&
      row[1] != null;
    const map = (row, channelName) => [
      row[0],
      row[1].replaceAll(/\s{2,}/g, " "),
      false,
      Date.parse(row[4].replace(/\s+/, " ")),
      parseISO8601DurationToSeconds(row[5]),
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

self.onmessage = function(e) {
  const { type, data, id } = e.data;
  try {
    let result;
    if (type === 'processSheetsJSON') {
      result = processSheetsJSON(data);
    } else if (type === 'processBootlegSheetsJSON') {
      result = processBootlegSheetsJSON(data);
    }
    self.postMessage({ id, result, success: true });
  } catch (error) {
    self.postMessage({ id, error: error.message, success: false });
  }
};

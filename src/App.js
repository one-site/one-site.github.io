import m from "mithril";
import get from "lodash-es/get";
import groupBy from "lodash-es/groupBy";
import mapValues from "lodash-es/mapValues";
import "fomantic-ui-css/semantic.css";

import "m-dot-nav";
import Grouped from "./Grouped";

import {format, parseISO, startOfMonth} from "date-fns";

function nest(seq, keys) {
  if (!keys.length) return seq;
  const first = keys[0];
  const rest = keys.slice(1);
  return mapValues(groupBy(seq, first), (value) => nest(value, rest));
}

// Stable slug for track IDs (used to backfill trackId when old JSON has track string)
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

let allEvents = [];
let requestOptions = {background: true};

const isLocal =
  location.hostname === "localhost" || location.hostname.startsWith("192.168.");

const dataBaseURL = isLocal
  ? `http://${location.hostname}:4000/data`
  : "https://one-site.github.io/data";

let nestedData = {};
let tracksById = {};

function normalizeEvent(ev) {
  // Backfill trackId if missing (supports old JSONs)
  const trackId = ev.trackId || (ev.track ? slugify(ev.track) : null);

  // Resolve track metadata if possible
  const trackMeta = (trackId && tracksById[trackId]) || null;

  // Display track name preference:
  // 1) trackMeta.name
  // 2) ev.track
  // 3) trackId
  const track =
    (trackMeta && trackMeta.name) ||
    ev.track ||
    (trackId ? trackId : "TBA");

  // Location preference:
  // 1) ev.location (if event-level)
  // 2) trackMeta.location
  const location = ev.location || (trackMeta && trackMeta.location) || undefined;

  return Object.assign({}, ev, {
    trackId,
    track,
    location,
    trackMeta,
  });
}

Promise.all([
  // 1) Tracks master
  m.request(`${dataBaseURL}/data/tracks.json`, requestOptions).catch(() => null),

  // 2) Series schedules
  Promise.all([
    m.request(`${dataBaseURL}/data/ertm.json`, requestOptions),
    m.request(`${dataBaseURL}/data/mrs.json`, requestOptions),
    m.request(`${dataBaseURL}/data/mvshofs.json`, requestOptions),
    m.request(`${dataBaseURL}/data/nwmt.json`, requestOptions),
    m.request(`${dataBaseURL}/data/nyirp.json`, requestOptions),
    m.request(`${dataBaseURL}/data/roc-sm.json`, requestOptions),
    m.request(`${dataBaseURL}/data/opnm-st.json`, requestOptions),

    m.request(`${dataBaseURL}/data/opnm.json`, requestOptions).then((it) =>
      it.map((race) => Object.assign(race, {series: "OPNM"}))
    ),

    m.request(`${dataBaseURL}/data/roc.json`, requestOptions).then((it) =>
      it.map((race) => Object.assign(race, {series: "ROC"}))
    ),

    m.request(`${dataBaseURL}/data/smart.json`, requestOptions),
    m.request(`${dataBaseURL}/data/ttom.json`, requestOptions)
  ]),
]).then(([tracksPayload, seriesPayload]) => {
  // tracksPayload can be:
  //  - { tracks: [...] } (recommended)
  //  - [...]            (if you prefer a bare array)
  const tracksList = Array.isArray(tracksPayload)
    ? tracksPayload
    : get(tracksPayload, "tracks", []);

  tracksById = Object.fromEntries(
    (tracksList || [])
      .filter((t) => t && t.id)
      .map((t) => [t.id, t])
  );

  allEvents = (seriesPayload || []).flatMap((series) => series || []);

  // Normalize + parse date + add id
  allEvents = allEvents
    .map((row, i) => {
      const r = normalizeEvent(row);
      r.date = parseISO(r.date);
      r.id = i;
      return r;
    })
    .filter((it) => it.date >= parseISO("2026-01-01"))
    .sort((r1, r2) => r1.date - r2.date);

  nestedData = nest(
    allEvents.map((it) => {
      it.m = format(startOfMonth(it.date), "yyyy-MM-dd");
      it.dt = format(it.date, "dd-MMM-yyyy");
      return it;
    }),
    ["m", "dt"]
  );

  m.redraw();
});

m.mount(document.body, {
  view: () => {
    return m(Grouped, {nestedData, tracksById});
  },
});
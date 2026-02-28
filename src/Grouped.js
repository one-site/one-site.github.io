import m from "mithril";
import b from "bss";
import {format, parseISO} from "date-fns";

const Grouped = () => {
  let body = b({
    height: "100%",
    width: "100%",
  }).class;

  let grid = b({
    display: "grid",
    "grid-template-columns": "1fr 1fr 1fr 1fr",
    "overflow-y": "auto",
    height: "100%",
  }).class;

  let span_mnth = b({
    "margin-left": "0.25em",
  });

  let span_dt = b({
    "margin-left": "0.5em",
  });

  document.body.classList.add(body);

  let rowsCount = 1;
  let currentMonth = new Date().getMonth();

  const TrackCell = {
    view: ({attrs}) => {
      const {ev, tracksById} = attrs || {};
      if (!ev) return m("div", "—");

      const meta =
        ev.trackMeta || (ev.trackId && tracksById && tracksById[ev.trackId]) || null;

      const name = (meta && meta.name) || ev.track || ev.trackId || "TBA";
      const location = ev.location || (meta && meta.location) || null;

      const website = meta && meta.website;
      const maps = meta && meta.maps;

      return m("div", {
        style: "display:flex; align-items:flex-start; gap:10px;"
      }, [
        // LEFT: name + location (wraps)
        m("div", {style: "flex:1; min-width:0;"}, [
          website
            ? m("a", {
              href: website,
              target: "_blank",
              rel: "noopener",
              style: "font-weight:600; overflow-wrap:anywhere;"
            }, name)
            : m("span", {style: "overflow-wrap:anywhere;"}, name),

          // location
          //   ? m("div", {style: "opacity:0.7; font-size:0.85em; margin-top:2px;"}, location)
          //   : null
        ]),

        // RIGHT: map icon (never wraps)
        maps
          ? m("a.ui.mini.icon.button", {
            href: maps,
            target: "_blank",
            rel: "noopener",
            "aria-label": `Open map for ${name}`,
            title: "Open map",
            style: "flex:0 0 auto; padding:0.35em 0.45em;"
          }, m("i.map.marker.alternate.icon"))
          : null
      ]);
    }
  };

  return {
    view: ({attrs: {nestedData, tracksById}}) => {
      return m(
        `div.${grid}`,
        Object.keys(nestedData).map((it) => {
          const theMonth = parseISO(it).getMonth();

          const _area1 = b({
            "background-color": m.cls({
              lightgrey: !(theMonth === currentMonth),
              palegreen: theMonth === currentMonth,
            }),
            "grid-area": `${rowsCount}/1/${rowsCount + 1}/-1`,
            position: "sticky",
            top: 0,
            left: 0,
          });

          rowsCount++;

          const days = Object.keys(nestedData[it]).flatMap((day) => {
            const values = nestedData[it][day];

            return values.map((ev, i) => {
              const _area2 = b({
                "font-size": "0.85em",
                "grid-row": `${rowsCount}/${rowsCount + 1}`,
              });

              rowsCount++;

              return [
                !(i > 0) &&
                m(
                  `div.${_area2}`,
                  {style: "grid-column:1/2"},
                  m(`span.${span_dt}`, format(ev.date, "EEE, do"))
                ),
                m(`div.${_area2}`, {style: "grid-column:2/3"}, ev.series),
                m(
                  `div.${_area2}`,
                  {style: "grid-column:3/5"},
                  m(TrackCell, {ev, tracksById})
                ),
              ]
            });
          });

          return [m(`div.${_area1}`, m(`span.${span_mnth}`, format(parseISO(it), "MMMM YYY")))].concat(
            days
          );
        })
      );
    },
  };
};

export default Grouped;
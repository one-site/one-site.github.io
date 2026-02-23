import m from "mithril";
import get from 'lodash-es/get'
import groupBy from 'lodash-es/groupBy'
import mapValues from 'lodash-es/mapValues'
import "fomantic-ui-css/semantic.css";

import "m-dot-nav";
import Grouped from "./Grouped";

import {format, parseISO, startOfMonth, differenceInCalendarDays} from 'date-fns'

function nest(seq, keys) {
  if (!keys.length) {
    return seq;
  }
  var first = keys[0];

  //.count = first.count === undefined ? 1 : first.count++
  var rest = keys.slice(1);
  return mapValues(groupBy(seq, first), function (value) {
    return nest(value, rest)
  });
};

let allEvents = []
let requestOptions = {background: true}
let dataBaseURL = 'https://one-site.github.io'
let nestedData = {}

Promise.all([
    m.request(`${dataBaseURL}/data/ertm.json`, requestOptions),
    m.request(`${dataBaseURL}/data/mrs.json`, requestOptions),
    m.request(`${dataBaseURL}/data/mvshofs.json`, requestOptions),
    m.request(`${dataBaseURL}/data/nwmt.json`, requestOptions),
    m.request(`${dataBaseURL}/data/nyirp.json`, requestOptions),
    m.request(`${dataBaseURL}/data/roc-sm.json`, requestOptions),
    m.request(`${dataBaseURL}/data/opnm-st.json`, requestOptions),
    m.request(`${dataBaseURL}/data/opnm.json`, requestOptions)
      .then(it => it.map(race => Object.assign(race, {series: 'OPNM'}))),
    m.request(`${dataBaseURL}/data/roc.json`, requestOptions)
      .then(it => it.map(race => Object.assign(race, {series: 'ROC'}))),
    m.request(`${dataBaseURL}/data/smart.json`, requestOptions),
    m.request(`${dataBaseURL}/data/ttom.json`, requestOptions)
      .then(it => it.map(race => Object.assign(race, {series: 'TTOM'}))),
  ]
)
  .then(it => {
      allEvents = it.flatMap(series => series)
      allEvents.reduce((agg, row, i) => {
        row.date = parseISO(row.date)
        row.id = i
        return agg
      }, allEvents)

      allEvents = allEvents
        .filter(it => it.date >= parseISO('2026-01-01'))
        .sort((r1, r2) => r1.date - r2.date)

      nestedData = nest(allEvents.map(it => {
        it.m = format(startOfMonth(it.date), 'yyyy-MM-dd')
        it.dt = format(it.date, 'dd-MMM-yyyy')
        return it
      }), ['m', 'dt'])

      m.redraw()
    }
  )

m.mount(document.body, {
    view: () => {
      return m(Grouped, {nestedData: nestedData})
    }
  }
)

// window.DEBUG = {
//   m: m
// }

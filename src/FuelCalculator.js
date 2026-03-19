import m from "mithril";
import "fomantic-ui-css/semantic.css";

const FuelCalculator = () => {

  return {
    view: () => {
      return m('div', 'fuel ...')
    }
  }
}
const GALLON_LBS = 6.1

const FuelCell = (init) => {
  let me = {
    heightPerGallon: () => me.height / me.gallons,
    gallons: init.gallons,
    height: init.height,
    values: new Array(init.height).fill(0).reduce((accum, it, i, src) => {
      let val = src.length - i - 1
      let steps = [3, 2, 1, 0].map(it => it / 4)
      steps.forEach((it2, i2) => {
        accum.push({index: val, label: val + it2})
      })
      //accum[i] = {index: val, label: i, steps: steps}
      return accum
    }, [{index: init.height, label: init.height, steps: []}])
  }

  return me
}

let fuelCell = FuelCell({gallons: 22, height: 13})
//p(fuelCell)

let start = 2
let end = 6
let inches = end - start
let gallons = inches / fuelCell.heightPerGallon()
let lbs = gallons * GALLON_LBS
let startLabel = fuelCell.values[start * 4].label
let endLabel = fuelCell.values[end * 4].label
let startLbs = (startLabel / fuelCell.heightPerGallon()) * GALLON_LBS
let endLbs = (endLabel / fuelCell.heightPerGallon()) * GALLON_LBS

const onchange = (data) => {
  console.log('onchange: ', data)
  inches = data
  gallons = inches / fuelCell.heightPerGallon()
  lbs = gallons * GALLON_LBS

  let startIndex = $(sliderDom).slider('get thumbValue', 'first')
  let endIndex = $(sliderDom).slider('get thumbValue', 'second')

  startLabel = fuelCell.values[startIndex * 4].label
  endLabel = fuelCell.values[endIndex * 4].label

  startLbs = (startLabel / fuelCell.heightPerGallon()) * 6.25
  endLbs = (endLabel / fuelCell.heightPerGallon()) * 6.25

  m.redraw()
}

let sliderDom

const Slider = () => {
  return {
    view: () => {
      return m('div.ui.vertical.labeled.range.slider')
    },
    oncreate: ({dom}) => {
      sliderDom = dom
      $(dom).slider({
        onChange: onchange,
        min: 0,
        max: 13, //fuelCell.values.length,
        start: start,
        end: end,
        step: .25,
        smooth: true,
        showLabelTicks: true,
        interpretLabel: function (value) {
          //console.log(value)
          //debugger
          let {label = ''} = fuelCell.values[value]
          //console.log(fuelCell.values[value], label)
          //return value
          return label + ' ';
        }
      })
    }
  }

}

const App = () => {
  return {
    view: () => {
      return [
        m(Slider),
        m('div', {
          style: 'display: flex;flex-direction: column;width: 100%;justify-content: center'
        }, [

          m('div.statistics-section', [
            m('div.ui.statistics', {
              style: 'display: flex; width: 100%;'
            }, [
              m('div.ui.tiny.statistic', {
                style: 'margin-left: auto;'
              }, [
                m('div.value', startLabel + '"'),
                m('div.label', 'start'),
              ]),
              m('div.ui.tiny.statistic', {
                style: 'margin-right: auto'
              }, [
                m('div.value', endLabel + '"'),
                m('div.label', 'end'),
              ])
            ]),
          ]),

          m('div.ui.divider'),

          m('div.statistics-section', [
            m('div.ui.statistics', {
              style: 'display: flex; width: 100%;'
            }, [
              m('div.ui.statistic', {
                style: 'margin-left: auto;'
              }, [
                m('div.value', inches),
                m('div.label', 'inches'),
              ]),
              m('div.ui.statistic', {
                style: 'margin-right: auto;'
              }, [
                m('div.value', gallons.toFixed(2)),
                m('div.label', 'gallons')
              ])

            ]),
          ]),

          m('div.ui.divider'),

          m('div.statistics-section', [
            m('div.ui.statistics', {
              style: 'display: flex; width: 100%;'
            }, [
              m('div.ui.tiny.statistic', {
                style: 'margin-left: auto;'
              }, [
                //m('div.value', +(Math.round(startLbs + "e+2") + "e-2")),
                m('div.value', Math.round(startLbs)),
                m('div.label', 'start lbs'),
              ]),
              m('div.ui.tiny.statistic', [
                m('div.value', Math.round(endLbs)),
                m('div.label', 'end lbs'),
              ]),

              m('div.ui.tiny.statistic', {
                style: 'margin-right: auto;'
              }, [
                m('div.value', Math.round(lbs)),
                m('div.label', 'lbs')
              ])
            ]),
          ]),

          /*          m('div.statistics-section', [
                      //m('div.ui.statistics', [
                      m('div.ui.tiny.statistic', [
                        m('div.value', startLabel + '"'),
                        m('div.label', 'start'),
                      ]),
                      m('div.ui.tiny.statistic', [
                        m('div.value', endLabel + '"'),
                        m('div.label', 'end'),
                      ]),

                      m('div.ui.statistic', [
                        m('div.value', inches),
                        m('div.label', 'inches'),
                      ]),
                      m('div.ui.statistic', [
                        m('div.value', gallons.toFixed(2)),
                        m('div.label', 'gallons')
                      ])

                    ]),

                    m('div.ui.divider'),

                    m('div.statistics-section', [

                      //m('div.ui.statistics', [
                      m('div.ui.tiny.statistic', [
                        //m('div.value', +(Math.round(startLbs + "e+2") + "e-2")),
                        m('div.value', Math.round(startLbs)),
                        m('div.label', 'start lbs'),
                      ]),
                      m('div.ui.tiny.statistic', [
                        m('div.value', Math.round(endLbs)),
                        m('div.label', 'end lbs'),
                      ]),

                      m('div.ui.tiny.statistic', [
                        m('div.value', Math.round(lbs)),
                        m('div.label', 'lbs')
                      ])
                      //])


                    ])*/
        ])

      ]
    }
  }
}

m.mount(document.body, App)
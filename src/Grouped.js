import m from 'mithril';
import b from 'bss';
import {format, parseISO} from "date-fns";

function mtfunc(obj, count = 0) {
  let levelCount = count
  if (Array.isArray(obj)) return obj.length

  Object.values(obj).forEach(it => {
      let ret = mtfunc(it)
      levelCount += ret
    }
  )
  return levelCount
}

const Grouped = () => {

  let body = b({
    height: '100%',
    width: '100%',
  }).class

  let grid = b({
    'display': 'grid',
    'grid-template-columns': '1fr 1fr 1fr 1fr',
    'overflow-y': 'auto',
    height: '100%'
  }).class

  let span_mnth = b({
    'margin-left': '0.25em'
  })

  let span_dt = b({
    'margin-left': '0.5em'
  })

  let _4cols = b({
    'grid-column': '1 / -1',
    'background-color': 'lightgrey',
    //position: 'sticky',
    //top:0,
    //left:0
  })

  document.body.classList.add(body)

  let rowsCount = 1

  return {

    view: ({attrs: {nestedData}}) => {
      // console.log('Grouped::view', nestedData)
      return m(`div.${grid}`, Object.keys(nestedData)
        .map((it, row) => {

          let _area1 = b({
            'background-color': 'lightgrey',
            'grid-area': `${rowsCount}/1/${rowsCount + 1}/-1`,
            position: 'sticky',
            top: 0,
            left: 0
          })

          rowsCount++

          let days = Object.keys(nestedData[it]).flatMap(day => {
            let values = nestedData[it][day]
            // console.log('day', day, values)
            // console.log(`${rowsCount}/1/${rowsCount + 1}/-1`)

            return values.map((_day, i) => {
              // console.log('mtfunc', mtfunc(values))
              let _area2 = b({
                'font-size': '0.85em',
                'grid-row': `${rowsCount}/${rowsCount + 1}`
              })

              rowsCount++

              return [
                !(i > 0) && m(`div.${_area2}`, {style: 'grid-column:1/2'}, m(`span.${span_dt}`, format(_day.date, 'EEE, do'))),
                m(`div.${_area2}`, {style: 'grid-column:2/3'}, _day.series),
                m(`div.${_area2}`, {style: 'grid-column:3/5'}, _day.track),
                //m(`div.${_area2}`, {style:'grid-column:4/5'}, 'x')
              ]

            })
          })

          return [
            m(`div.${_area1}`, m(`span.${span_mnth}`, format(parseISO(it), 'MMMM YYY')))
          ].concat(days)

        })
      )
    }


  }
}

export default Grouped;
import moment from "moment/moment";
import {DATE_FORMAT} from './constants'

export const generateTestData = (now, weeks, series) => {
  // const now = moment()
  const result = []
  let entries = 0
  for (let i = 0; i < weeks * 7; i++) {
    let d = moment(now).subtract(i, 'days')
    // console.log('ttttt day=', d.day() + ' ; ' + d.format(DATE_FORMAT))
    if (d.day() > 0 && d.day() < 6) {
      entries++
      const values = [d.format(DATE_FORMAT)]
      series.forEach(o => {
        let min = 115, max = 120
        if (entries % 100 == 0) {
          min = 100
          max = 130
        }
        let v = getRandomValue(min, max)

        //TODO remove
        /*if (entries > 10 && entries < 20) {
          v = null
        }*/

        values.push(v)
      })
      result.push(values)
    }
  }
  return result.reverse()
}

const getRandomValue = (min, max) => {
  const n = Math.random() * (max - min) + min
  return parseFloat(n.toFixed(2))
}


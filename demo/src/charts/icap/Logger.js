import moment from 'moment'

export class Logger {

  enabled = true

  constructor (name, showTime = false) {
    this.name = name
    this.showTime = showTime
  }

  _lg = console.log

  log = (str, msg) => {
    if (this.enabled) {
      let res = this.name
      if (this.showTime) {
        res += ` ${moment().format('HH:mm:ss:SSS')}`
      }
      if (!msg) {
        this._lg(res, str)
      } else {
        this._lg(res + ' ' + str, msg)
      }
    }
  }


}


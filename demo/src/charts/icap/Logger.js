import moment from 'moment'

const Leves = {
  LOG: 'LOG',
  ERR: 'ERR'
}

export class Logger {

  enabled = true

  constructor (name, showTime = false) {
    this.name = name
    this.showTime = showTime
  }

  log = (str, msg) => {
    this._doLog(Leves.LOG, str, msg)
  }

  err = (str, msg) => {
    this._doLog(Leves.ERR, str, msg)
  }

  _doLog = (level, str, msg) => {
    let f
    switch (level) {
      case Leves.LOG: f = console.log
        break
      case Leves.ERR: f = console.error
        break
      default: f = console.log
    }

    if (this.enabled) {
      let res = this.name
      if (this.showTime) {
        res += ` ${moment().format('HH:mm:ss:SSS')}`
      }
      if (!msg) {
        f(res, str)
      } else {
        f(res + ' ' + str, msg)
      }
    }

  }


}


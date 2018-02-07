import React from 'react';
import IcapChart from './IcapChart'
import {Periods, DATE_FORMAT} from './constants'
import {generateTestData} from './test-data'
import moment from "moment/moment";
import IcapChartControllers from "./IcapChartControllers";
import {Logger} from "./Logger";

const delay = (time) => (result) => new Promise(resolve => setTimeout(() => resolve(result), time))
const logger = new Logger('IcapDemo', false)
const _now = moment('2018-02-06', DATE_FORMAT)
// const _now = moment()

class ChartService {

  constructor() {
    this._rawData = generateTestData(moment(_now), 3 * 12 * 4, ['EUR 4Y 4Y'])
    logger.log('ChartService rawdata=', this._rawData)
  }

  getRawDataFromPeriods = (start, end) => {
    const startD = moment(start, DATE_FORMAT)
    const endD = moment(end, DATE_FORMAT)

    const result = this._rawData.filter(o => {
      const d = moment(o[0], DATE_FORMAT)
      return d.isSameOrAfter(startD) && d.isSameOrBefore(endD)
    })

    return Promise.resolve(result).then(delay(1000))
  }

}

export default class Icap extends React.Component {

  now = moment(_now)

  chartService = new ChartService()
  rawData = []
  searchedStartEdgeDate
  minEdge
  currentRawData = []

  constructor(props) {
    super(props)
    this.init()
    this.state = this.getInitialState()
  }

  updateState = (searchStartD, searchEndD, period) => {
    Object.assign(period, {start: searchStartD, end: searchEndD})
    this.currentRawData = this.getRawDataFromPeriods(searchStartD, searchEndD)
    const chartData = this.mapRawDataToChartData()
    this.setState({...this.state, period: period, loading: false, chartData, searched: false})
  }

  init = () => {
    const endD = moment(this.now)
    const searchStartD = moment(endD).subtract(1, 'years')
    this.chartService.getRawDataFromPeriods(searchStartD.format(DATE_FORMAT), endD.format(DATE_FORMAT))
      .then(data => {
        this.rawData = data
        this.searchedStartEdgeDate = searchStartD
        const startD = moment(endD).subtract(3, 'months')
        this.updateState(startD, endD, {type: Periods._10D})
      });

  }

  getInitialState = () => {
    return {
      period: {type: Periods._10D},
      loading: true,
      chartData: this.mapRawDataToChartData(),
      searchStartD: moment(),
      searchEndD: moment()
    }
  }

  getRawDataFromPeriods = (startD, endD) => {
    return this.rawData.filter(o => {
      const d = moment(o[0], DATE_FORMAT)
      return d.isSameOrAfter(startD) && d.isSameOrBefore(endD)
    })
  }

  mapRawDataToChartData = () => {
    const categoryData = []
    const series = new Map()
    series.set('EUR 4Y 4Y', [])

    // logger.log('mapRawDataToChartData =', this.currentRawData)

    this.currentRawData.forEach((o) => {
      categoryData.push(o[0])
      series.get('EUR 4Y 4Y').push(o[1])
    })

    return {
      categoryData,
      series
    }
  }

  _prependRowData = (data) => {
    logger.log('_prependRowData rawData=', this.rawData.concat([]))
    logger.log('_prependRowData data=', data)
    const firstDateFromRawData = moment(this.rawData[0][0], DATE_FORMAT)
    const lastDateFromFetchedData = moment(data[data.length - 1][0], DATE_FORMAT)
    let dataToPrepend = data
    if (firstDateFromRawData.isSameOrBefore(lastDateFromFetchedData)) {
      const firstDateFromFetchedData = moment(data[0][0], DATE_FORMAT)
      if (firstDateFromRawData.isSameOrBefore(firstDateFromFetchedData)) {
        return
      }

      for (let i = data.length - 2; i > 0; i--) {
        if (firstDateFromRawData.isAfter(moment(data[i][0], DATE_FORMAT))) {
          dataToPrepend = data.slice(0, i + 1)
          break;
        }
      }
    }
    logger.log('_prependRowData dataToPrepend=', dataToPrepend)
    Array.prototype.unshift.apply(this.rawData, dataToPrepend)
  }

  _getPeriodDifArgs = (period, sgn) => {
    switch (period.type) {
      case Periods._10D: return [sgn * 10, 'days']
      case Periods._1M: return [sgn * 1, 'months']
      case Periods._3M: return [sgn * 3, 'months']
      case Periods._1Y: return [sgn * 1, 'years']
      case Periods.CUSTOM: {
        const diff = period.end.diff(period.start, 'days')
        return [sgn * diff, 'days']
      }
    }
  }

  _getCurrentRawDataDifArgs = (period, sgn) => {
    switch (period.type) {
      case Periods._10D: return [sgn * 90, 'days']
      case Periods._1M: return [sgn * 3, 'months']
      case Periods._3M: return [sgn * 1, 'years']
      case Periods._1Y: return [sgn * 2, 'years']
      case Periods.CUSTOM: {
        const diff = period.end.diff(period.start, 'days')
        let mul = 2
        if (diff > 0 && diff <= 15) {
          mul = 9
        } else if (diff > 15 && diff <= 31) {
          mul = 6
        } else if (diff > 31 && diff <= 92) {
          mul = 4
        } else if (diff > 92 && diff <= 180) {
          mul = 3
        } else if (diff > 180 && diff <= 366) {
          mul = 2
        } else {
          mul = 1.5
        }

        return [sgn * Math.ceil(mul * diff), 'days']
      }
    }
  }

  _getRawDataSearchCriteriaArgs = (period, edge1D, sgn) => {
    const diffInDays = this._getCurrentRawDataDifArgs(period, sgn)[0]
    const etalonEdge2Date = moment(edge1D).add(sgn * diffInDays, 'days');
    let edge2Date
    const sIdx = sgn > 0 ? 0 : this.rawData.length - 1
    const lIdx = sgn > 0 ? this.rawData.length - 1 : 0
    for (let i = sIdx; i <= lIdx; i+= sgn) {
      edge2Date = moment(this.rawData[i][0], DATE_FORMAT)
      if (sgn * (edge2Date.toDate().getTime() - etalonEdge2Date.toDate().getTime()) >= 0) {
        break
      }
    }
    if (sgn * (edge2Date.toDate().getTime() - etalonEdge2Date.toDate().getTime()) < 0) {
      edge2Date = moment(this.rawData[lIdx][0], DATE_FORMAT)
    }
    const result = [edge1D, edge2Date]
    return sgn > 0 ? result : result.reverse()
  }

  changePeriod = (period) => {
    return () => {

      const endD = moment(this.now)
      const core = () => {
        const startD = moment.prototype.add.apply(moment(endD), this._getCurrentRawDataDifArgs(period, -1))
        this.updateState(startD, endD, period)
      }

      switch (period.type) {
        case Periods._3M: {
          core()
          break
        }
        case Periods._1Y: {
          const searchEndD = moment(endD).subtract(1, 'years').subtract(1, 'days')
          const searchStartD = moment(searchEndD).subtract(1, 'years')
          if (this.searchedStartEdgeDate.isSameOrBefore(searchStartD)) {
            core()
          } else {
            this.setState({...this.state, period: period, loading: true})
            this.chartService.getRawDataFromPeriods(searchStartD.format(DATE_FORMAT), searchEndD.format(DATE_FORMAT))
              .then(data => {
                this._prependRowData(data)
                this.searchedStartEdgeDate = searchStartD
                core()
              });
          }
          break
        }
        default: {
          core()
        }
      }
    }
  }

  onEdgeReached = (edgeDate, direction) => {
    const edgeDateAsDate = moment(edgeDate, DATE_FORMAT).add(1 * direction, 'days')
    const edge1DiffArgs = this._getPeriodDifArgs(this.state.period, direction)

    const edgeDate1 = moment.prototype.add.apply(moment(edgeDateAsDate), edge1DiffArgs)
    const edgeDate2 = moment.prototype.add.apply(moment(edgeDate1), this._getCurrentRawDataDifArgs(this.state.period, -direction))
    let searchCriteriaArgs = [edgeDate1, edgeDate2]
    if (direction > 0) {
      searchCriteriaArgs.reverse()
    }

    logger.log(`onEdgeReached edgeDate=${edgeDate}; edgeDate1=${edgeDate1.format(DATE_FORMAT)}; edgeDate2=${edgeDate2.format(DATE_FORMAT)}`)

    const core = () => {
      logger.log('onEdgeReached searchCriteriaArgs=', searchCriteriaArgs)
      this.currentRawData = this.getRawDataFromPeriods.apply({}, searchCriteriaArgs)
      logger.log('onEdgeReached currentRawData=', this.currentRawData)
      const chartData = this.mapRawDataToChartData()
      chartData.endIndex = chartData.categoryData.findIndex(o => o === edgeDate)
      logger.log('onEdgeReached endIndex=', chartData.endIndex)
      this.setState({...this.state, loading: false, chartData, searched: false})
    }
    const coreReachedMin = () => {
      const adjustedSearchStartDate = moment(this.minEdge, DATE_FORMAT)
      const adjustedSearchEndDate = moment.prototype.add.apply(moment(adjustedSearchStartDate), this._getCurrentRawDataDifArgs(this.state.period, 1))
      searchCriteriaArgs = [adjustedSearchStartDate, adjustedSearchEndDate]
      logger.log('onEdgeReached searchCriteriaArgs=', searchCriteriaArgs)
      this.currentRawData = this.getRawDataFromPeriods.apply({}, searchCriteriaArgs)
      logger.log('onEdgeReached currentRawData=', this.currentRawData)
      const chartData = this.mapRawDataToChartData()
      chartData.startIndex = 0
      const edge1D = moment(chartData.categoryData[0], DATE_FORMAT)
      // this.state.period.start = edge1D
      const edge2D = moment.prototype.add.apply(edge1D, this._getPeriodDifArgs(this.state.period, 1))
      for (let i = chartData.categoryData.length; i > 0; --i) {
        if (moment(chartData.categoryData[i], DATE_FORMAT).isSameOrBefore(edge2D)) {
          chartData.endIndex = i
          break
        }
      }

      const period = {type: this.state.period.type, start: edge1D, end: edge2D}
      this.setState({...this.state, loading: false, period, chartData, searched: false})
    }


    if (direction > 0 || direction < 0 &&
      (!this.minEdge && this.searchedStartEdgeDate.isSameOrBefore(edgeDate1)
        || this.minEdge && moment(this.minEdge, DATE_FORMAT).isSameOrBefore(edgeDate1)
      )) {
      core()
    } else if (direction < 0 && this.minEdge && moment(this.minEdge, DATE_FORMAT).isAfter(edgeDate1)) {
      coreReachedMin()
    } else {
      this.setState({...this.state, loading: true})
      const searchEndD = moment(this.searchedStartEdgeDate).subtract('1', 'days')
      const searchStartD = moment(searchEndD).subtract('1', 'years')
      this.chartService.getRawDataFromPeriods(searchStartD, searchEndD)
        .then(data => {
          if (data.length > 0) {
            this._prependRowData(data)
            const fetchedStartEdge = this.rawData[0][0]
            if (moment(fetchedStartEdge, DATE_FORMAT).subtract(5, 'days').isAfter(searchStartD)) {
              this.minEdge = fetchedStartEdge
            }
            this.searchedStartEdgeDate = searchStartD
            if (!this.minEdge && this.searchedStartEdgeDate.isSameOrBefore(edgeDate1)
              || this.minEdge && moment(this.minEdge, DATE_FORMAT).isSameOrBefore(edgeDate1)) {
              core()
            } else if (this.minEdge && moment(this.minEdge, DATE_FORMAT).isAfter(edgeDate1)) {
              coreReachedMin()
            }
          } else {
            this.minEdge = this.rawData[0][0]
            this.setState({...this.state, minEdge: this.minEdge, loading: false, searched: false})
          }
        });

    }

  }

  onSearch = (searchStartD, searchEndD) => {

    const maxEdgeD = moment(this.getMaxEdge(), DATE_FORMAT)
    const minEdgeD = this.minEdge ? moment(this.minEdge, DATE_FORMAT) : null

    logger.log('onSearch', {minEdgeD, maxEdgeD})

    if (searchStartD.isSameOrAfter(maxEdgeD)) {
      alert('No data found')
      return
    }

    if (minEdgeD && minEdgeD.isSameOrAfter(searchEndD)) {
      alert('No data found')
      return
    }

    if (searchEndD.isAfter(maxEdgeD)) {
      searchEndD = maxEdgeD
    }

    const period = {
      type: Periods.CUSTOM,
      start: searchStartD,
      end: searchEndD
    }

    let edgeDate2 = searchEndD
    let edgeDate1 =  moment.prototype.add.apply(moment(edgeDate2), this._getCurrentRawDataDifArgs(period, -1))
    let searchCriteriaArgs = [edgeDate1, edgeDate2]

    if (minEdgeD) {
      if (minEdgeD.isAfter(searchStartD)) {
        searchStartD = minEdgeD
      }
      if (minEdgeD.isAfter(edgeDate1)) {
        period.start = searchStartD
        searchCriteriaArgs = this._getRawDataSearchCriteriaArgs(period, period.start, 1)
        edgeDate1 = searchCriteriaArgs[0]
        edgeDate2 = searchCriteriaArgs[1]
      }
    }

    /*if (minEdgeD && minEdgeD.isSameOrAfter(searchStartD)) {
      searchStartD = minEdgeD
      // edgeDate1 = minEdgeD
      period.start = minEdgeD
      searchCriteriaArgs = this._getRawDataSearchCriteriaArgs(period, period.start, 1)
    } else {
      edgeDate1 = moment.prototype.add.apply(moment(edgeDate2), this._getCurrentRawDataDifArgs(period, -1))
      searchCriteriaArgs = [edgeDate1, edgeDate2]
    }*/

    logger.log(`onSearch edgeDate1=${edgeDate1.format(DATE_FORMAT)}; edgeDate2=${edgeDate2.format(DATE_FORMAT)}`)

    const core = () => {
      this.currentRawData = this.getRawDataFromPeriods.apply({}, searchCriteriaArgs)
      logger.log('onSearch currentRawData=', this.currentRawData)
      const chartData = this.mapRawDataToChartData()
      chartData.startIndex = chartData.categoryData.findIndex(o => moment(o, DATE_FORMAT).isSameOrAfter(period.start))
      for (let i = chartData.categoryData.length; i > 0; --i) {
        if (moment(chartData.categoryData[i], DATE_FORMAT).isSameOrBefore(period.end)) {
          chartData.endIndex = i
          break
        }
      }
      logger.log('onSearch endIndex=', chartData.endIndex)
      this.setState({...this.state, loading: false, period, chartData, searched: true, searchStartD: period.start, searchEndD: period.end})
    }

    if (this.searchedStartEdgeDate.isSameOrBefore(edgeDate1)) {
      //  getting from cache
      core()
    } else {
      //  make a new server request
      this.setState({...this.state, loading: true, period, searchStartD, searchEndD})
      this.chartService.getRawDataFromPeriods(edgeDate1.format(DATE_FORMAT), moment(this.searchedStartEdgeDate).subtract(1, 'days').format(DATE_FORMAT))
        .then(data => {
          logger.log('onSearch fetched data=', this.rawData)
          if (data.length > 0) {
            this._prependRowData(data)
            const fetchedStartEdge = this.rawData[0][0]
            // reached the min edge
            if (moment(fetchedStartEdge, DATE_FORMAT).subtract(5, 'days').isAfter(edgeDate1)) {
              this.minEdge = fetchedStartEdge
              period.start = moment(this.minEdge)
              searchCriteriaArgs = this._getRawDataSearchCriteriaArgs(period, period.start, 1)
              logger.log(`onSearch x  searchCriteriaArgs=${searchCriteriaArgs}`)
            }
            this.searchedStartEdgeDate = edgeDate1
            core()
          } else {
            this.minEdge = this.rawData[0][0]
            this.setState({...this.state, minEdge: this.minEdge, loading: false, searched: true})
          }
        });

    }


    // this.setState({...this.state, searchStartD, searchEndD, searched: true})
  }

  changeEdgePeriodControllers = (period) => {
    logger.log('changeEdgePeriodControllers ...')
    this.setState({...this.state, period, searchStartD: period.start, searchEndD: period.end})
  }

  getMaxEdge = () => {
    return this.rawData.length > 0 ? this.rawData[this.rawData.length - 1][0] : null
  }

  render() {
    return (
      <div className='examples'>
        <div className='parent'>
          <IcapChartControllers period={this.state.period}
                                searchStartD={this.state.searchStartD} searchEndD={this.state.searchEndD}
                                changePeriod={this.changePeriod} onSearch={this.onSearch}
                                searched={this.state.searched}/>

          <IcapChart onEdgeReached={this.onEdgeReached} changeEdgePeriodControllers={this.changeEdgePeriodControllers}
                     data={this.state.chartData}
                     period={this.state.period}
                     minEdge={this.minEdge}
                     maxEdge={this.getMaxEdge()}
                     loading={this.state.loading}
                     searched={this.state.searched}
                     height="600px" width="100%"/>
        </div>
      </div>
    )
  }
}

import React from 'react';
import IcapChart from './IcapChart'
import {Periods, DATE_FORMAT} from './constants'
import {generateTestData} from './test-data'
import moment from "moment/moment";
import IcapChartControllers from "./IcapChartControllers";

const delay = (time) => (result) => new Promise(resolve => setTimeout(() => resolve(result), time))

class ChartService {

  constructor() {
    this._rawData = generateTestData(moment(), 3 * 12 * 4, ['EUR 4Y 4Y'])
    console.log('ChartService rawdata=', this._rawData)
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

  // now = moment('2016-06-22', DATE_FORMAT)
  now = moment()

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
    const startDAsStr = searchStartD.format(DATE_FORMAT)
    const endDAsStr = searchEndD.format(DATE_FORMAT)
    Object.assign(period, {start: startDAsStr, end: endDAsStr})
    this.currentRawData = this.getRawDataFromPeriods(startDAsStr, endDAsStr)
    this.setState({...this.state, period: period, loading: false, chartData: this.mapRawDataToChartData()})

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
      chartData: this.mapRawDataToChartData()
    }
  }

  getRawDataFromPeriods = (start, end) => {
    const startD = moment(start, DATE_FORMAT)
    const endD = moment(end, DATE_FORMAT)

    return this.rawData.filter(o => {
      const d = moment(o[0], DATE_FORMAT)
      return d.isSameOrAfter(startD) && d.isSameOrBefore(endD)
    })
  }

  mapRawDataToChartData = () => {
    const categoryData = []
    const series = new Map()
    series.set('EUR 4Y 4Y', [])

    // console.log('mapRawDataToChartData =', this.currentRawData)

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
    console.log('_prependRowData rawData=', this.rawData.concat([]))
    console.log('_prependRowData data=', data)
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
    console.log('_prependRowData dataToPrepend=', dataToPrepend)
    Array.prototype.unshift.apply(this.rawData, dataToPrepend)
  }

  _getCurrentRawDataDifArgs = (period, sgn) => {
    switch (period.type) {
      case Periods._10D: return [sgn * 3, 'months']
      case Periods._1M: return [sgn * 3, 'months']
      case Periods._3M: return [sgn * 1, 'years']
      case Periods._1Y: return [sgn * 2, 'years']
    }
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
    let edge1DiffArgs
    switch (this.state.period.type) {
      case Periods._10D: {
        edge1DiffArgs = [direction * 10, 'days']
        break
      }
      case Periods._1M: {
        edge1DiffArgs = [direction * 1, 'months']
        break
      }
      case Periods._3M: {
        edge1DiffArgs = [direction * 3, 'months']
        break
      }
      case Periods._1Y: {
        edge1DiffArgs = [direction * 1, 'years']
        break
      }
    }

    const edgeDate1 = moment.prototype.add.apply(moment(edgeDateAsDate), edge1DiffArgs)
    const edgeDate2 = moment.prototype.add.apply(moment(edgeDate1), this._getCurrentRawDataDifArgs(this.state.period, -direction))
    let searchCriteriaArgs = [edgeDate1.format(DATE_FORMAT), edgeDate2.format(DATE_FORMAT)]
    if (direction > 0) {
      searchCriteriaArgs.reverse()
    }

    console.log(`eeeee edgeDate=${edgeDate}; edgeDate1=${edgeDate1.format(DATE_FORMAT)}; edgeDate2=${edgeDate2.format(DATE_FORMAT)}`)
    console.log('eeeee searchCriteriaArgs=', searchCriteriaArgs)

    const core = () => {
      this.currentRawData = this.getRawDataFromPeriods.apply({}, searchCriteriaArgs)
      console.log('eeeee currentRawData=', this.currentRawData)
      const chartData = this.mapRawDataToChartData()
      chartData.endIndex = chartData.categoryData.findIndex(o => o === edgeDate)
      console.log('onEdgeReached endIndex=', chartData.endIndex)
      this.setState({...this.state, loading: false, chartData})
    }


    if (direction > 0 || direction < 0 && this.searchedStartEdgeDate.isSameOrBefore(edgeDate1)) {
      core()
    } else {
      this.setState({...this.state, loading: true})
      const searchEndD = moment(this.searchedStartEdgeDate).subtract('1', 'days')
      const searchStartD = moment(searchEndD).subtract('1', 'years')
      this.chartService.getRawDataFromPeriods(searchStartD, searchEndD)
        .then(data => {
          if (data.length > 0) {
            this._prependRowData(data)
            const fetchedStartEdge = this.rawData[0][0]
            if (moment(fetchedStartEdge, DATE_FORMAT).subtract(5, 'days').isAfter(edgeDate1)) {
              this.minEdge = fetchedStartEdge
              const adjustedSearchStartDate = this.minEdge
              const adjustedSearchEndDate = moment.prototype.add.apply(moment(adjustedSearchStartDate, DATE_FORMAT), this._getCurrentRawDataDifArgs(this.state.period, 1))
              searchCriteriaArgs = [adjustedSearchStartDate, adjustedSearchEndDate]
            }
            this.searchedStartEdgeDate = searchStartD
            core()
          } else {
            this.minEdge = this.rawData[0][0]
            this.setState({...this.state, minEdge: this.minEdge, loading: false})
          }
        });

    }

  }

  onSearch = (startD, endD) => {
    alert(`search ${startD}; ${endD}`)
  }

  changeEdgePeriodControllers = (start, end) => {
    this.setState({...this.state, searchStart: start, searchEnd: end})
  }


  getMaxEdge = () => {
    return this.rawData.length > 0 ? this.rawData[this.rawData.length - 1][0] : null
  }

  render() {

    return (
      <div className='examples'>
        <div className='parent'>
          <IcapChartControllers period={this.state.period}
                                searchStart={this.state.searchStart} searchEnd={this.state.searchEnd}
                                changePeriod={this.changePeriod} onSearch={this.onSearch}/>

          <IcapChart onEdgeReached={this.onEdgeReached} changeEdgePeriodControllers={this.changeEdgePeriodControllers}
                     data={this.state.chartData}
                     period={this.state.period}
                     minEdge={this.minEdge}
                     maxEdge={this.getMaxEdge()}
                     loading={this.state.loading}
                     height="600px" width="100%"/>
        </div>
      </div>
    );
  }
}

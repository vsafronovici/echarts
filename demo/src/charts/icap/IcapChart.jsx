import React from 'react';
import ReactEcharts from '../../../../src/index';
import moment from 'moment'
import {Periods, DATE_FORMAT} from './constants'
import {throttle, debounce} from 'lodash'
import {isEqual} from 'lodash'
import {Logger} from './Logger'

const logger = new Logger('IcapChart', false)

export default class IcapChart extends React.Component {

  tmp = {}

  constructor(props) {
    super(props)
    this.state = this.getInitialState()
    this.onEvents = {
      'datazoom': this.onDatazoom
    };
  }

  getInitialState = () => {
    return {
      loading: this.props.loading,
      period: {type: Periods.CUSTOM}
    }
  }

  _percentToIndex = (percents) => {
    return Math.round(this.tmp.categories.length * percents / 100)
  }

  _getPeriodDifArgs = (sgn) => {
    switch (this.tmp.period.type) {
      case Periods._10D: return [sgn * 10, 'days']
      case Periods._1M: return [sgn * 1, 'months']
      case Periods._3M: return [sgn * 3, 'months']
      case Periods._1Y: return [sgn * 1, 'years']
      case Periods.CUSTOM: {
        // logger.log(`IcapChart _getPeriodDifArgs period=${this.tmp.period}`)
        const diff = this.tmp.period.end.diff(this.tmp.period.start, 'days')
        return [sgn * diff, 'days']
      }
    }
  }

  _getEdgeDiffIndex = () => {
    switch (this.tmp.period.type) {
      case Periods._10D: return 10
      case Periods._1M: return 30
      case Periods._3M: return 90
      case Periods._1Y: return 365
      case Periods.CUSTOM: {
        return this.tmp.period.end.diff(this.tmp.period.start, 'days')
      }
    }
  }

  _calculateEdge = (edge1Index, dir) => {
    //TODO
    const sgn = Math.sign(dir)
    const edgeDiffIndex = this._getEdgeDiffIndex()
    let maxEdge2Idx = edge1Index + sgn * edgeDiffIndex
    if (maxEdge2Idx < 0) {
      maxEdge2Idx = 0
    }
    const edg1Date = moment(this.tmp.categories[edge1Index], DATE_FORMAT)
    const edge2Date = moment.prototype.add.apply(moment(edg1Date), this._getPeriodDifArgs(sgn))

    // logger.log(`_calculateEdge sgn=${sgn}; edgeDiffIndex=${edgeDiffIndex}; edge1Index=${edge1Index}; edg1Date=${edg1Date.format(DATE_FORMAT)}; maxEdge2Idx=${maxEdge2Idx}; edge2Date=${edge2Date.format(DATE_FORMAT)}`)
    for (let i = maxEdge2Idx; sgn * (i - edge1Index) > 0; i = i - sgn) {
      const d = moment(this.tmp.categories[i], DATE_FORMAT)
      // logger.log(`_calculateEdge i=${i}; d=${d.format(DATE_FORMAT)}`)
      if (sgn * (edge2Date.toDate().getTime() - d.toDate().getTime()) >= 0) {
        return {date: edge2Date, index: i}
      }
    }
    return {date: edge2Date, index: maxEdge2Idx}
  }

  _getSeries = (series) => {
    const result = []
    series.forEach(function(value, key) {
      result.push({
        name: key,
        type: 'line',
        data: value,
        smooth: true,
        lineStyle: {
          normal: {opacity: 0.5}
        }
      })
    })
    return result
  }


  getOption = (startIndex, endIndex) => {
    return {
      animation: false,
      legend: {
        bottom: 10,
        left: 'center',
        data: ['EUR 4Y 4Y']
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: 'rgba(245, 245, 245, 0.8)',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        textStyle: {
          color: '#000'
        },
        position: function (pos, params, el, elRect, size) {
          var obj = {top: 10}
          obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30
          return obj
        }
      },
      axisPointer: {
        link: { xAxisIndex: 'all' },
        label: {
          backgroundColor: '#777'
        }
      },
      toolbox: {
        feature: {
          saveAsImage: { title: 'Save' },
          restore: { show: false },
          dataView: { show: false },
          dataZoom: { show: false },
          magicType: { show: false },
          brush: { show: false }
        }
      },
      grid: [
        {
          left: '10%',
          right: '8%',
          height: '70%'
        },
        {
          left: '10%',
          right: '8%',
          top: '50%',
          height: '16%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: this.state.categories,
          scale: true,
          boundaryGap: false,
          axisLine: {onZero: false},
          splitLine: {show: true},
          splitNumber: 10, // Does not work for type = 'category'
          min: 'dataMin',
          max: 'dataMax',
          axisPointer: {
            z: 100
          },
          axisLabel: {
            formatter: function (value, index) {
              const date = moment(value, DATE_FORMAT)
              if (index === 0) {
                return date.format('YYYY')
              }
              return date.format('MM/DD')
            }
          }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: this.state.categories,
          scale: true,
          boundaryGap: false,
          axisLine: {onZero: false},
          axisTick: {show: false},
          splitLine: {show: true},
          axisLabel: {show: false},
          splitNumber: 10,
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: false
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          orient: 'horizontal',
          zoomLock: true,
          throttle: 300,
          rangeMode: ['value', 'value'], // does NOT work !!!
          realtime: false,
          startValue: startIndex,
          endValue: endIndex
        },
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          bottom: 50,
          orient: 'horizontal',
          zoomLock: true,
          throttle: 300,
          rangeMode: ['value', 'value'], // does NOT work !!!
          realtime: false,
          startValue: startIndex,
          endValue: endIndex
        }
      ],
      series: this.state.series
    }
  }

  notifyEdgeReached = debounce(function(msg) {
    logger.log(msg)
    alert(msg)
  }, 1000, {leading: true})

  onDatazoom = (evt, echarts) => {
    const zoomedFromScrollBar = !evt.batch
    const payload = evt.batch && evt.batch.length ? evt.batch[0] : evt
    logger.log('onDatazoom xxxx payload=', payload)

    /*  if (zoomedFromScrollBar) {
    const startIndex = payload.start === 0 ? 0 : this._percentToIndex(payload.start) - 1
    const endIndex = this._percentToIndex(payload.end) - 1
      if (startIndex !== this.state.startEdge.index && endIndex === this.state.endEdge.index
        || startIndex === this.state.startEdge.index && endIndex !== this.state.endEdge.index) {

        logger.log('onDatazoom zoomedFromScrollBar ', {startIndex, endIndex})
        const startEdge = {date: moment(this.state.categories[startIndex], DATE_FORMAT), index: startIndex}
        const endEdge = {date: moment(this.state.categories[endIndex], DATE_FORMAT), index: endIndex}
        const period = {type: Periods.CUSTOM, start: startEdge.date, end: endEdge.date}
        logger.log('onDatazoom maximize zoomedFromScrollBar=', {period, startEdge, endEdge})
        this.tmp.period = period
        this.setState({...this.state, period, startEdge, endEdge, searched: false})
        return
      }
      logger.log('onDatazoom fuc* ', {startIndex, endIndex, startEdgeIdx: this.state.startEdge.index, endEdgeIdx: this.state.endEdge.index})
    } */

    const core = (endIndex,
                  startEdge = this._calculateEdge(endIndex, -1),
                  endEdge = {date: moment(this.state.categories[endIndex], DATE_FORMAT), index: endIndex}) => {

      logger.log(`onDatazoom x startIndex=${startEdge.index}; endIndex=${endEdge.index}`)
      const period = {type: this.state.period.type, start: startEdge.date, end: endEdge.date}
      this.setState({...this.state, period, startEdge, endEdge, searched: false})
    }

    if (payload.start === 0) {
      logger.log('onDatazoom start is 0=', payload.start)
      const edgeDate = this.state.categories[0]
      logger.log('onDatazoom', {minEdge: this.state.minEdge, edgeDate})
      if (this.state.minEdge && this.state.minEdge === edgeDate) {
        const startEdge = {date: moment(this.state.categories[0], DATE_FORMAT), index: 0}
        const endEdge = this._calculateEdge(startEdge.index, 1)
        core(null, startEdge, endEdge)
        this.notifyEdgeReached('There is no data backward')
      } else {
        this.props.onEdgeReached(edgeDate, -1)
      }
    } else if (payload.end === 100) {
      logger.log('onDatazoom end is 100=', payload.end)
      // const endIndex = this._percentToIndex(payload.end) - 1
      const edgeDate = this.state.categories[this.state.categories.length - 1]
      // const edgeDate = this.state.categories[this.state.categories.length - 1]
      logger.log(`onDatazoom end==100; edgeDate=${edgeDate}; this.state.maxEdge=${this.state.maxEdge}`)
      if (this.state.maxEdge && this.state.maxEdge === edgeDate) {
        const endIndex = this.state.categories.length - 1
        core(endIndex)
        this.notifyEdgeReached('There is no data forward')
      } else {
        this.props.onEdgeReached(edgeDate, 1)
      }
    } else {
      const endIndex = this._percentToIndex(payload.end) - 1
      core(endIndex)
    }
  }


  componentWillReceiveProps(nextProps) {
    // logger.log('componentWillReceiveProps this.props=', this.props)
    logger.log('componentWillReceiveProps nextProps=', nextProps)

    if (nextProps.loading) {
      this.setState({...this.state, loading: true})
    } else if (this.props.loading !== nextProps.loading
      || this.state.period.type !== nextProps.period.type
      || this.props.minEdge !== nextProps.minEdge
      || this.props.maxEdge !== nextProps.maxEdge
      || this.props.data.endIndex !== nextProps.data.endIndex
      || this.props.data.startIndex !== nextProps.data.startIndex
      || this.props.data.categoryData.length !== nextProps.data.categoryData.length
      || this.props.data.categoryData[0] !== nextProps.data.categoryData[0]) {


      const categories = nextProps.data.categoryData
      this.tmp = {period: nextProps.period, categories}

      const endIndex = nextProps.data.endIndex || nextProps.data.categoryData.length - 1
      const endEdge = {date: moment(categories[endIndex], DATE_FORMAT), index: endIndex}
      const startEdge = nextProps.data.startIndex !== undefined ? {date: moment(categories[nextProps.data.startIndex]), index: nextProps.data.startIndex}
            : this._calculateEdge(endIndex, -1)

      logger.log('componentWillReceiveProps ----- nextProps.data.startIndex=', nextProps.data.startIndex)
      logger.log('componentWillReceiveProps ----- startEdge=', startEdge)

      const newState = {
        loading: nextProps.loading,
        period: {...nextProps.period, start: startEdge.date, end: endEdge.date},
        startEdge,
        endEdge,
        minEdge: nextProps.minEdge,
        maxEdge: nextProps.maxEdge,
        searched: nextProps.searched
      }

      this.tmp.period = newState.period


      if (this.props.data.categoryData.length !== categories.length ||
                    this.props.data.categoryData[0] !== categories[0]) {
        Object.assign(newState, {
          categories,
          series: this._getSeries(nextProps.data.series)})
      }
      logger.log('componentWillReceiveProps newState=', newState)
      this.setState({...this.state, ...newState})
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    // logger.log('shouldComponentUpdate state=', this.state)
    logger.log('shouldComponentUpdate nextState=', nextState)
    return this.props.loading !== nextProps.loading
      || this.state.period.type !== nextState.period.type
      || this.props.minEdge !== nextProps.minEdge
      || this.props.maxEdge !== nextProps.maxEdge
      || this.props.data.categoryData.length !== nextProps.data.categoryData.length
      || this.props.data.categoryData[0] !== nextProps.data.categoryData[0]
      || this.state.startEdge.index !== nextState.startEdge.index
      || this.state.endEdge.index !== nextState.endEdge.index
  }

  componentWillUpdate(nextProps, nextState) {
    // do nothing
  }

  render() {
    logger.log('render() state=', this.state)
    if (this.state.loading && !this.state.categories) {
      return <div style={{padding: '150px 350px'}}>Loading chart ...</div>
    } else {
      const option = this.getOption(this.state.startEdge.index, this.state.endEdge.index)
      return (
        <ReactEcharts
          option={option}
          style={{height: this.props.height, width: this.props.width}}
          className='react_for_echarts'
          onEvents={this.onEvents}
          showLoading={this.state.loading}
        />
      )
    }
  }

  componentDidUpdate(prevProps, prevState) {
    logger.log('componentDidUpdate state=', this.state)
    if (!this.state.searched && !this.state.loading) {
      this.props.changeEdgePeriodControllers(this.state.period)
    }
  }
}

import React from 'react';
import ReactEcharts from '../../../../src/index';
import moment from 'moment'
import {Periods, DATE_FORMAT} from './constants'
// import {throttle, debounce} from 'lodash'
import {isEqual} from 'lodash'


export default class IcapChart extends React.Component {

  tmp = {}

  constructor(props) {
    super(props)
    this.state = this.getInitialState()
    this.onEvents = {
      'datazoom': this.onDatazoom
    };

    console.log('------- Constructor', this)
  }

  getInitialState = () => {
    return {
      loading: this.props.loading
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
    }
  }


  _getEdgeDiffIndex = () => {
    switch (this.tmp.period.type) {
      case Periods._10D: return 10
      case Periods._1M: return 30
      case Periods._3M: return 90
      case Periods._1Y: return 365
    }
  }


  _calculateEdge = (edge1Index, dir) => {
    const sgn = Math.sign(dir)
    const edgeDiffIndex = this._getEdgeDiffIndex()
    let maxEdge2Idx = edge1Index + sgn * edgeDiffIndex
    if (maxEdge2Idx < 0) {
      maxEdge2Idx = 0
    }
    const edg1Date = moment(this.tmp.categories[edge1Index], DATE_FORMAT)
    const edge2Date = moment.prototype.add.apply(moment(edg1Date), this._getPeriodDifArgs(sgn))

    // console.log(`_calculateEdge sgn=${sgn}; edgeDiffIndex=${edgeDiffIndex}; edge1Index=${edge1Index}; edg1Date=${edg1Date.format(DATE_FORMAT)}; maxEdge2Idx=${maxEdge2Idx}; edge2Date=${edge2Date.format(DATE_FORMAT)}`)
    for (let i = maxEdge2Idx; sgn * (i - edge1Index) > 0; i = i - sgn) {
      const d = moment(this.tmp.categories[i], DATE_FORMAT)
      // console.log(`_calculateEdge i=${i}; d=${d.format(DATE_FORMAT)}`)
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

  onDatazoom = (evt, echarts) => {
    const zoomedFromScrollBar = !evt.batch
    const payload = evt.batch && evt.batch.length ? evt.batch[0] : evt
    console.log('onDatazoom payload=', payload)
    console.log('onDatazoom zoomedFromScrollBar=', zoomedFromScrollBar)

    const core = (endIndex,
                  startEdge = this._calculateEdge(endIndex, -1),
                  endEdge = {date: moment(this.state.categories[endIndex], DATE_FORMAT), index: endIndex}) => {

      console.log(`onDatazoom x startIndex=${startEdge.index}; endIndex=${endEdge.index}`)
      this.setState({...this.state, startEdge, endEdge, searched: false})
    }

    if (payload.start === 0) {
      console.log('onDatazoom start is 0=', payload.start)
      const edgeDate = this.state.categories[0]
      if (this.state.minEdge && this.state.minEdge === edgeDate) {
        if (zoomedFromScrollBar) {
          const startEdge = {date: moment(this.state.categories[0], DATE_FORMAT), index: 0}
          const endEdge = this._calculateEdge(startEdge.index, 1)
          core(null, startEdge, endEdge)
        }
        console.log('onDatazoom no data on start edge')
        //alert('No data further')
        return
      } else {
        this.props.onEdgeReached(edgeDate, -1)
      }
    } else if (payload.end === 100) {
      console.log('onDatazoom end is 100=', payload.end)
      const edgeDate = this.state.categories[this.state.categories.length - 1]
      console.log(`onDatazoom end==100; edgeDate=${edgeDate}; this.state.maxEdge=${this.state.maxEdge}`)
      if (this.state.maxEdge && this.state.maxEdge === edgeDate) {
        if (zoomedFromScrollBar) {
          const endIndex = this.state.categories.length - 1
          core(endIndex)
        }
      } else {
        this.props.onEdgeReached(edgeDate, 1)
      }
    } else {
      const endIndex = this._percentToIndex(payload.end) - 1
      core(endIndex)
    }
  }


  componentWillReceiveProps(nextProps) {
    // console.log('componentWillReceiveProps this.props=', this.props)
    // console.log('componentWillReceiveProps nextProps=', nextProps)

    if (nextProps.loading) {
      this.setState({...this.state, loading: nextProps.loading})
    } else if (this.props.period.type !== nextProps.period.type
      || this.props.minEdge !== nextProps.minEdge
      || this.props.maxEdge !== nextProps.maxEdge
      || this.props.data.endIndex !== nextProps.data.endIndex
      || this.props.data.categoryData.length !== nextProps.data.categoryData.length
      || this.props.data.categoryData[0] !== nextProps.data.categoryData[0]) {

      console.log('componentWillReceiveProps will update state=', nextProps)

      const categories = nextProps.data.categoryData
      this.tmp = {period: nextProps.period, categories}

      const endIndex = nextProps.data.endIndex || nextProps.data.categoryData.length - 1
      const startEdge = this._calculateEdge(endIndex, -1)
      const endEdge = {date: moment(categories[endIndex], DATE_FORMAT), index: endIndex}
      // this.props.changeEdgePeriodControllers(startEdge.date.format(DATE_FORMAT), categories[endIndex])

      const newState = {
        loading: nextProps.loading,
        period: nextProps.period,
        startEdge,
        endEdge,
        minEdge: nextProps.minEdge,
        maxEdge: nextProps.maxEdge,
        searched: nextProps.searched
      }
      if (this.props.data.categoryData.length !== categories.length ||
                    this.props.data.categoryData[0] !== categories[0]) {
        Object.assign(newState, {
          categories,
          series: this._getSeries(nextProps.data.series)})
      }
      console.log('componentWillReceiveProps newState=', newState)
      this.setState({...this.state, ...newState})
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    // console.log('shouldComponentUpdate state=', this.state)
    console.log('shouldComponentUpdate nextState=', nextState)
    return this.props.loading !== nextProps.loading
      || this.props.period.type !== nextProps.period.type
      || this.props.minEdge !== nextProps.minEdge
      || this.props.maxEdge !== nextProps.maxEdge
      || this.props.data.endIndex !== nextProps.data.endIndex
      || this.props.data.categoryData.length !== nextProps.data.categoryData.length
      || this.props.data.categoryData[0] !== nextProps.data.categoryData[0]
      || !isEqual(this.state.startEdge, nextState.startEdge)
      || !isEqual(this.state.endEdge, nextState.endEdge)
  }

  componentWillUpdate(nextProps, nextState) {
    console.log('componentWillUpdate nextState=', nextState)
    if (!nextState.searched) {
      nextProps.changeEdgePeriodControllers(nextState.startEdge.date.format(DATE_FORMAT), nextState.endEdge.date.format(DATE_FORMAT))
    }
  }

  render() {
    console.log('xxx RENDER state=', this.state)

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
}

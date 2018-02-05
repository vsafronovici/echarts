import React from 'react';
import {Periods, SEARCH_CRITERIA_DATE_FORMAT as DATE_FORMAT} from './constants'
import moment from "moment/moment";
import {Logger} from "./Logger";

const logger = new Logger('IcapChartControllers', false)


export default class IcapChartControllers extends React.Component {

  periodBtnStyle = {cursor: 'pointer'}
  activeperiodBtnStyle = {...this.periodBtnStyle, backgroundColor: '#808080'}

  constructor(props) {
    super(props)
  }

  shouldComponentUpdate(nextProps, nextState) {
    logger.log('shouldComponentUpdate() nextProps=', nextProps)
    return this.props.period.type !== nextProps.period.type
    || this.props.searchStartD.toDate().getTime() !== nextProps.searchStartD.toDate().getTime()
      || this.props.searchEndD.toDate().getTime() !== nextProps.searchEndD.toDate().getTime()
  }


  componentDidUpdate(prevProps, prevState) {
    logger.log('componentDidUpdate() props=', this.props)
    this.startDateEl.value = this.props.searchStartD.format(DATE_FORMAT)
    this.endDateEl.value = this.props.searchEndD.format(DATE_FORMAT)
  }

  onSearch = () => {
    const startD = moment(this.startDateEl.value, DATE_FORMAT)
    const endD = moment(this.endDateEl.value, DATE_FORMAT)
    this.props.onSearch(startD, endD)
  }

  render() {
    logger.log('render() props=', this.props)
    return (
      <div>
        <span onClick={this.props.changePeriod({type: Periods._10D})} style={this.props.period.type === Periods._10D ? {...this.activeperiodBtnStyle} : {...this.periodBtnStyle}}>10D</span>
        <span style={{marginLeft: '10px'}}>&nbsp;</span>
        <span onClick={this.props.changePeriod({type: Periods._1M})} style={this.props.period.type === Periods._1M ? {...this.activeperiodBtnStyle} : {...this.periodBtnStyle}}>1M</span>
        <span style={{marginLeft: '10px'}}>&nbsp;</span>
        <span onClick={this.props.changePeriod({type: Periods._3M})} style={this.props.period.type === Periods._3M ? {...this.activeperiodBtnStyle} : {...this.periodBtnStyle}}>3M</span>
        <span style={{marginLeft: '10px'}}>&nbsp;</span>
        <span onClick={this.props.changePeriod({type: Periods._1Y})} style={this.props.period.type === Periods._1Y ? {...this.activeperiodBtnStyle} : {...this.periodBtnStyle}}>1Y</span>

        <span style={{marginLeft: '30px'}}>start</span>
        <input type="text" ref={el => {this.startDateEl = el}} style={{width: '120px', display: 'inline'}} />
        <span style={{marginLeft: '10px'}}>end</span>
        <input type="text" ref={el => {this.endDateEl = el}} style={{width: '120px', display: 'inline'}} />
        <button onClick={this.onSearch} style={{width: '80px', padding: '10px', marginLeft: '10px'}}>search</button>
      </div>
    )
  }


}

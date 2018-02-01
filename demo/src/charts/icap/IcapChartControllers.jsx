import React from 'react';
import {Periods} from './constants'


export default class IcapChartControllers extends React.Component {

  periodBtnStyle = {cursor: 'pointer'}
  activeperiodBtnStyle = {...this.periodBtnStyle, backgroundColor: '#808080'}

  constructor(props) {
    super(props)
  }

  onSearch = () => {
    const start = this.startDateEl.value
    const end = this.endDateEl.value
    this.props.onSearch(start, end)
  }

  render() {
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
        <input type="text" value={this.props.searchStart} ref={el => {this.startDateEl = el}}
               style={{width: '120px', display: 'inline'}} />
        <span style={{marginLeft: '10px'}}>end</span>
        <input type="text" value={this.props.searchEnd} ref={el => {this.endDateEl = el}}
               style={{width: '120px', display: 'inline'}} />
        <button onClick={this.onSearch} style={{width: '80px', padding: '10px', marginLeft: '10px'}}>search</button>
      </div>
    )
  }


}

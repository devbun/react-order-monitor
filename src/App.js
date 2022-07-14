import './App.css';
import React, { Component, useState } from 'react';

const TODAY = dateToCanadaPostString(new Date())
const PROTO_SIXTY_DAYS_AGO = new Date(new Date() - 1000 * 60 * 60 * 24 * 60)
const SIXTY_DAYS_AGO = dateToCanadaPostString(PROTO_SIXTY_DAYS_AGO)

const SEARCHURL = `https://soa-gw.canadapost.ca/vis/track/ref/summary?mailingDateTo=${TODAY}&mailingDateFrom=${SIXTY_DAYS_AGO}&referenceNumber=`
const USPSURL = "https://tools.usps.com/go/TrackConfirmAction?tRef=fullpage&tLc=2&text28777=&tLabels="
const PATTERN = /[AESIR]\d\d\d\d\d\d/g;

var list_of_orders = []

class Order {
  constructor(name, pin, status, eventtime, shipped, delivery, reference) {
    this.name = name;
    this.pin = pin;
    this.status = status;
    this.eventtime = eventtime;
    this.shipped = shipped;
    this.delivery = delivery;
    this.reference = reference;

    list_of_orders.push(this)
  }
}

function dateToCanadaPostString(date) {
  return date.toISOString().substr(0, 10);
}

function getResult(order_number) {
  try {
    let xmlHttpReq = new XMLHttpRequest();
      const LOGINURL = "?username=235a4838eb98af12&password=74ded08262ce6db05c0455" //TODO: DANGEROUS TO EXPOSE THIS
      xmlHttpReq.open("GET", SEARCHURL + order_number, false, '235a4838eb98af12', '74ded08262ce6db05c0455'); 
      xmlHttpReq.setRequestHeader('Accept', 'application/vnd.cpc.shipment-v8+xml')
      xmlHttpReq.setRequestHeader('Content-Type', 'application/vnd.cpc.shipment-v8+xml')
      xmlHttpReq.send(null);
      let result = xmlHttpReq.responseText
      let parser = new DOMParser();
      let xmlDoc = parser.parseFromString(result,"text/xml");
      console.log(xmlDoc)
      let whatparcel = xmlDoc.getElementsByTagName("pin-summary").length - 1
      let tracking_number = xmlDoc.getElementsByTagName("pin")[whatparcel].childNodes[0].nodeValue;
      let last_event = xmlDoc.getElementsByTagName("event-description")[whatparcel].childNodes[0].nodeValue;
      let event_time = xmlDoc.getElementsByTagName("event-date-time")[whatparcel].childNodes[0].nodeValue;
        event_time = event_time.slice(4, 6) + "-" + event_time.slice(6, 8);
      let shipped_date = xmlDoc.getElementsByTagName("mailed-on-date")[whatparcel].childNodes[0].nodeValue.slice(5, 10);
      let delivery_date = ""
      try {
        delivery_date = xmlDoc.getElementsByTagName("actual-delivery-date")[whatparcel].childNodes[0].nodeValue.slice(5, 10);
      }
      catch(err) {
        delivery_date = "TBD"
      }

      let reference = ''
      try {
      reference = xmlDoc.getElementsByTagName("customer-ref-2")[whatparcel].childNodes[0].nodeValue;
      }
      catch(err) {
        reference = ''
      }
      let neworder = new Order(order_number, tracking_number, last_event, event_time, shipped_date, delivery_date, reference)
  }
  catch(err) {
    let neworder = new Order(order_number, "ERROR", "Zero info generated")
  }

}

function getOrderList() {
  list_of_orders = []
  var haystack = document.getElementById("input-orders").value;
  var list_of_order_numbers = [...haystack.matchAll(PATTERN)]

  console.log('regex result' + list_of_order_numbers)

  for (let i = 0; i < list_of_order_numbers.length; i++) {
    let order_number = list_of_order_numbers[i]
    console.log("> order number " + order_number)
    getResult(order_number)
  }

  console.log(list_of_orders)
}

  class ResultLine extends React.Component {
    constructor (props) {
      super(props);
    
      this.state = {
        order: this.props.order,
      };}
      render() {
        const {name, pin, status, eventtime, shipped, delivery, reference} = this.state.order;
        const pin_url = USPSURL + this.state.order.pin

        const order_delivered = this.state.order.status.includes("delivered") ? "result-element order_delivered" : "result-element order_not_delivered";

        //todo: make it green if good
        return (
          <div key={name} className="result" >
            <div className="result-element"><input type="checkbox" name="none" id="none" /></div>
            <div className={ order_delivered}>{name}</div>
            <div className="result-element"><a href={pin_url}>{pin}</a></div>
            <div className={order_delivered}>{status}</div>
            <div className="result-element">{eventtime}</div>
            <div className="result-element">{shipped}</div>
            <div className="result-element">{delivery}</div>
            <div className="result-element">{reference}</div>

          </div>
          
        )
      }
}

function App() {
  const [count, setCount] = useState(0);
  const [,setState] = useState();

  function handleSubmit() {
    list_of_orders = []
    setState({});
    setCount(count + 1)
    getOrderList()
    setCount(count + 1)


    list_of_orders.sort(function(a, b) {
      const nameA = a.status.toUpperCase(); // ignore upper and lowercase
      const nameB = b.status.toUpperCase(); // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
    
      // names must be equal
      return 0;
    });
    console.log("list sorted")
    console.log(list_of_orders)

    setCount(count + 1)
    setState({});
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Order Monitor</h1>
        <div className="description">
          <p>Enter some text with some order numbers in it. Maybe like 10 at a time and no more than 20 per minute or Canada Post will shut us out and you gotta wait a minute.</p>
          <p>You also gotta refresh the page before entering a new batch</p>
          <p>BUG: Doesn't always get the right shipment in split orders. Should search for latest date and indicate #/3</p>
        </div>
      </header>

      <div className="input-window" id="input-window">
        <textarea name="input-orders" id="input-orders" cols="30" rows="10" defaultValue="A059712 S063758 A063982">
          
        </textarea>
        <br></br>
        <button onClick={() => handleSubmit()} >submit</button>
      </div>


      <div className="result-window" id="result-window">

      <div className="result result-header">
        <span className="result-header-item"></span>
        <span className="result-header-item">Order</span>
        <span className="result-header-item">Tracking</span>
        <span className="result-header-item">Status</span>
        <span className="result-header-item">Updated</span>
        <span className="result-header-item">Shipped</span>
        <span className="result-header-item">Delivered</span>
        <span className="result-header-item">Notes</span>
      </div>
        {/* lost, pickup, returned, delayed, delivered */}
      <div id="result-window-content">
        {list_of_orders.map((e)=>{

          return (
          <ResultLine order={e} /> 
          );
          }
        )}
      </div>

      </div>

      <div>
        <h2>Why won't this work?</h2>
        <p>open cmd.exe in C:\</p>
        <p>enter cd Program Files (x86)\Google\Chrome\Application</p>
        <p>enter chrome.exe --user-data-dir="C:/Chrome dev session" --disable-web-security</p>
        <p>Copy this page's url into that instance of Chrome</p>
        <p>You might need to enter our Canada Post info</p>
        <p>NEVER use that browser for anything else</p>
        <p>Note that tracking info only goes back 60 days</p>
      </div>
    </div>
  );
}

export default App;

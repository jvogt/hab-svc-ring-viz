import React, { Component } from "react";
import './App.css';

class App extends Component {
  // initialize our state 
  state = {
    nodes: [],
    hosts: {},
    hostnames: [],
    rawJson: {},
    intervalIsSet: false,
    showErrorIcon: false,
    showErrorState: false,
    showNoMembers: false,
    showJSON: false,
    showRawJson: false,
    testMode: false,
    testIndex: 0,
    testMax: 1,
    showServerOverride: true,
    api_uri: '/census'
  };

  _handleKeyDown = (event) => {
    if(event.keyCode === 74 ) { this.setState({showJSON: !this.state.showJSON })} //j
    if(event.keyCode === 82 ) { this.setState({showRawJson: !this.state.showRawJson })} //r
    if(event.keyCode === 83 ) { this.setState({showServerOverride: !this.state.showServerOverride })} //s
    if(event.keyCode === 84 ) { this.setState({testMode: !this.state.testMode })} //t
    if(event.keyCode === 190 ) { this.advanceTestMode() } //.
    if(event.keyCode === 188 ) { this.rewindTestMode() } //,
  }
  // when component mounts, first thing it does is fetch all existing data in our db
  // then we incorporate a polling logic so that we can easily see if our db has 
  // changed and implement those changes into our UI
  componentDidMount() {
    this.hydrateStateWithLocalStorage()
    window.addEventListener(
      "beforeunload",
      this.saveStateToLocalStorage.bind(this)
    );

    this.getCensus();
    if (!this.state.intervalIsSet) {
      let interval = setInterval(this.getCensus, 500);
      this.setState({ intervalIsSet: interval });
    }
    document.addEventListener("keydown", this._handleKeyDown);
  }

  // never let a process live forever 
  // always kill a process everytime we are done using it
  componentWillUnmount() {
    if (this.state.intervalIsSet) {
      clearInterval(this.state.intervalIsSet);
      this.setState({ intervalIsSet: null });
    }
    document.removeEventListener("keydown", this._handleKeyDown);
  }

  hydrateStateWithLocalStorage() {
    // for all items in state
    for (let key in this.state) {
      // if the key exists in localStorage
      if (localStorage.hasOwnProperty(key)) {
        // get the key's value from localStorage
        let value = localStorage.getItem(key);

        // parse the localStorage string and setState
        try {
          value = JSON.parse(value);
          this.setState({ [key]: value });
        } catch (e) {
          // handle empty string
          this.setState({ [key]: value });
        }
      }
    }
  }
  saveStateToLocalStorage() {
    // for every item in React state
    for (let key in this.state) {
      if(key=='node') {continue}
      if(key=='rawJson') {continue}
      // save to localStorage
      localStorage.setItem(key, JSON.stringify(this.state[key]));
    }
  }
  advanceTestMode = () => {
    if(this.state.testIndex < this.state.testMax) {this.setState({testIndex: this.state.testIndex + 1})}
  }

  rewindTestMode = () => {
    if(this.state.testIndex > 0) {this.setState({testIndex: this.state.testIndex - 1})}
  }

  setApiUri = (api_uri) => {
    this.setState({api_uri: api_uri})
  }

  getTestJsonFilename = () => {
    return "test/test-" + ('00' + this.state.testIndex).slice(-2) + ".json"
  }

  getCensus = () => {
    var uri = this.state.testMode ? this.getTestJsonFilename() : this.state.api_uri
    
    fetch(uri)
      .then(error => this.handleHttpErrors(error))
      .then(data => data.json())
      .then(data => this.formatCensus(data))
      .catch(error => {this.setState({ showErrorIcon: true, showErrorState: true });console.log(error);})
  };

  formatNodeStatus = (n) => {
    var status = []
    if(n.alive) { status.push('alive') }
    if(n.suspect) { status.push('suspect') }
    if(n.confirmed) { status.push('confirmed') }
    if(n.departed) { status.push('departed') }
    return status.join(', ')
  }

  formatNodes = (population) => {
    var nodes = Object.keys(population).map(function(node) {
      node = population[node]
      return {
        member_id: node.member_id,
        package: node.package,
        ip: node.sys.ip,
        hostname: node.sys.hostname,
        alive: node.alive,
        suspect: node.suspect,
        confirmed: node.confirmed,
        departed: node.departed
      }
    })
    nodes.map(n => {
      n.status = this.formatNodeStatus(n)
      n.visible = n.status.match(/departed|confirmed/) ? false : true
      return n
    })
    return nodes.sort(function(a, b){
      if(a.member_id < b.member_id) return -1;
      if(a.member_id > b.member_id) return 1;
      return 0;
    })
  }
  colors = ['blue','green','red','purple','royalblue']
  nextColorIdx = 0
  colorAssignments = {}
  getColor = (name) => {
    name=name.split(".")[0]
    if(this.colorAssignments[name]) { return this.colorAssignments[name] }
    this.colorAssignments[name] = this.colors[this.nextColorIdx]
    this.nextColorIdx = this.nextColorIdx < this.colors.length - 1 ? this.nextColorIdx + 1 : 0
  }
  formatCensus = (data) => {

    this.setState({ rawJson: data })
    
    data = Object.keys(data.census_groups).map(cg => {
      var nodes = this.formatNodes(data.census_groups[cg].population)
      nodes.map(n => n.class_group = cg)
      return {name: cg, nodes: nodes}
    });
    var nodes = []
    for (var i = 0; i < data.length; i++) { 
      nodes = nodes.concat(data[i].nodes);
    }
    var hosts = {}
    var hostnames = []
    for (var i = 0; i < nodes.length; i++) { 
      var node = nodes[i]
      if(!node.visible) { continue }
      if(!hosts[node.hostname]) {
        hosts[node.hostname] = []
        hostnames.push(node.hostname)
      }
      node.color = node.visible ? this.getColor(node.class_group) : null
      hosts[node.hostname].push(node)
    }

    hostnames.sort()
    var i = hostnames.length
    while(i--) {
      var hostname = hostnames[i]
      hosts[hostname].sort(function(a, b){
        if(a.class_group < b.class_group) return -1;
        if(a.class_group > b.class_group) return 1;
        return 0;
      })
      if(hosts[hostname].length === 0) {
        hostnames.splice(i,1)
        delete hosts[hostname]
      }
    }

    this.setState({ hosts: hosts })
    this.setState({ hostnames: hostnames })
    this.setState({ showErrorIcon: false, showErrorState: false })
    this.setState({ nodes: nodes })
  }

  handleHttpErrors = (response) => {
    if (!response.ok) {
      this.setState({ showErrorIcon: true, showErrorState: true })
      console.log(response.statusText);
    }
    return response;
  }

  renderNodes(nodes) {
    if(nodes.length === 0) { return (<NoMembers />) }
    return nodes.map(node => (<Node
      ip={node.ip}
      status={node.status}
      class_group={node.class_group}
      color={node.visible ? this.getColor(node.class_group) : null}
      version={node.package}
      visible={node.visible}
    />))
  }

  renderHosts(hostnames) {
    if(hostnames.length === 0) { return (<NoMembers />) }
    return hostnames.map(hostname => {
      if(!this.state.hosts[hostname] || this.state.hosts[hostname].length === 0) return null
      return ( <Host hostname={hostname} ip={this.state.hosts[hostname][0].ip} services={this.state.hosts[hostname]}/> )
    }
    )
  }

  render() {
    let className = 'App';
    if (this.state.showErrorState) {
      className += ' error-state';
    }
    return (
      <div className={className}>
        { this.state.showErrorIcon ? <ErrorIcon /> : null }
        { this.state.showServerOverride ? <ServerOverride setvalue={this.setApiUri}value={this.state.api_uri} /> : null }
        { /*this.renderNodes(this.state.nodes)*/ }
        { this.renderHosts(this.state.hostnames) }
        <br/>
        { this.state.showJSON ? <RawJSON json={this.state.hosts}/> : null }
        { this.state.showRawJson ? <RawJSON json={this.state.rawJson}/> : null }
      </div>
    );
  }
}

class Host extends Component {

  renderServices(hostname,services) {
    if(services.length === 0) { return (<NoMembers />) }
    return services.map(svc => (
      <Service color={svc.color} class_group={svc.class_group} version={svc.package} visible={svc.visible}/>
    ))
  }
  render() {
    if(!this.props.services || !this.props.services.length === 0) { return null }
    return (
      <div className="Host">
        <div className="hostdetails">
          <p classname="hostname">{ this.props.hostname }</p>
          <p className="ip">{ this.props.ip }</p>
        </div>
        { this.renderServices(this.props.hostname, this.props.services) }
      </div>
    )
  }
}
class Service extends Component {
  render() {
    if(!this.props.visible) { return null }
    let className = 'Service ' + this.props.color
    return (
      <div className={className}>
        <p className="classGroup">{this.props.class_group}</p>
        <p className="version">{this.props.version}</p>
      </div>
    )
  }
}


class Node extends Component {
  render() {
    if(!this.props.visible) { return null }
    let className = 'Node ' + this.props.color
    return (
      <div className={className}>
        <p className="ip">{this.props.ip}</p>
        <p className="classGroup">{this.props.class_group}</p>
        <p className="status">{this.props.status}</p>
        <p className="version">{this.props.version}</p>
      </div>
    )
  }
}

class ErrorIcon extends Component {
  render() {
    return (
      <span className="error-icon">
        ⚠
      </span>
    )
  }
}

class NoMembers extends Component {
  render() {
    return (
      <div className="NoMembers">No members in supervisor ring</div>
    )
  }
}

class ServerOverride extends Component {
  constructor(props) {
    super(props);
    this.state = {value:props.value}

    this.handleChange = this.handleChange.bind(this);
    this.keyPress = this.keyPress.bind(this);
   } 

  handleChange(e) {
    this.setState({ value: e.target.value });
  }

  keyPress(e){
    if(e.keyCode == 13){
      console.log('value', e.target.value);
      this.props.setvalue(e.target.value)
    }
  }

  render() {
    return (
      <div className="ServerOverride"><input value={this.state.value} onChange={this.handleChange} onKeyDown={this.keyPress}/></div>
    )
  }
}
class RawJSON extends Component {
  render() {
    return (
      <div className="rawjson">
        <pre>
          {JSON.stringify(this.props.json, null, 2)}
        </pre>
      </div>
      )
  }
}

export default App;

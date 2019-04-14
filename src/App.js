import React, { Component } from "react";
import './App.css';

class App extends Component {
  // initialize our state 
  state = {
    nodes: [],
    intervalIsSet: false,
    showErrorIcon: false,
    showErrorState: false,
    showNoMembers: false,
    showJSON: false
  };

  _handleKeyDown = (event) => {
    if(event.keyCode === 74 ) { this.setState({showJSON: !this.state.showJSON })}
  }
  // when component mounts, first thing it does is fetch all existing data in our db
  // then we incorporate a polling logic so that we can easily see if our db has 
  // changed and implement those changes into our UI
  componentDidMount() {
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

  getCensus = () => {
    fetch("/census")
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
        alive: node.alive,
        suspect: node.suspect,
        confirmed: node.confirmed,
        departed: node.departed
      }
    })
    nodes.map(n => {
      n.status = this.formatNodeStatus(n)
      return n
    })
    return nodes.sort(function(a, b){
      if(a.member_id < b.member_id) return -1;
      if(a.member_id > b.member_id) return 1;
      return 0;
    })
  }

  formatCensus = (data) => {
    data = Object.keys(data.census_groups).map(cg => {
      var nodes = this.formatNodes(data.census_groups[cg].population)
      nodes.map(n => n.class_group = cg)
      return {name: cg, nodes: nodes}
    });
    var nodes = []
    for (var i = 0; i < data.length; i++) { 
      nodes = nodes.concat(data[i].nodes);
    }
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
      version={node.package}
    />))
  }

  render() {
    let className = 'App';
    if (this.state.showErrorState) {
      className += ' error-state';
    }
    return (
      <div className={className}>
        { this.state.showErrorIcon ? <ErrorIcon /> : null }
        { this.renderNodes(this.state.nodes) }
        <br/>
        { this.state.showJSON ? <RawJSON json={this.state.nodes}/> : null }
      </div>
    );
  }
}

class Node extends Component {
  render() {
    return (
      <div className="Node">
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

class RawJSON extends Component {
  render() {
    return (
      <code>
        {JSON.stringify(this.props.json, null, 2)}
      </code>
      )
  }
}

export default App;
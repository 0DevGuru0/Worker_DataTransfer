const { Line } = require("clui"),
  moment = require("moment"),
  clc = require("cli-color"),
  { ui } = require("../../helpers");
///////////////////////////////////////////////////
/* Test Purpose*/
// const buckets = {
//   "Saturday, January 25th 2020, 1:19 pm": [
//     "onlineUsersList",
//     "totalUsersVerified",
//     "totalUsersList",
//     "onlineVisitorsList",
//     "pageViews",
//     "visitorsState"
//   ],
//   "Saturday, January 25th 2020, 2:19 pm": [
//     "onlineUsersList",
//     "totalUsersVerified",
//     "totalUsersList"
//   ],
//   "Saturday, January 25th 2020, 3:19 pm": [
//     "onlineVisitorsList",
//     "pageViews",
//     "visitorsState"
//   ]
// };
// const timeContainer = [
//   "Saturday, January 25th 2020, 1:19 pm",
//   "Saturday, January 25th 2010, 3:19 pm",
//   "Saturday, January 25th 2020, 2:19 pm",
//   "Saturday, January 25th 2010, 3:19 pm",
//   "Saturday, January 25th 2020, 3:19 pm"
// ];

///////////////////////////////////////////////////
class LogReport {
  constructor(props) {
    this.timeColSize = 38;
    this.bucketColSize = 20;
    this.paddingSize = 1;
    this.buckets = props.buckets;
    this.timeContainer = props.timeContainer.length
      ? props.timeContainer
      : [moment().format("dddd, MMMM Do YYYY, h:mm a")];
  }
  headers() {
    return new Line()
      .column(clc.bold("Time"), this.timeColSize, [clc.cyan])
      .column(clc.bold("TransferredBuckets"), this.bucketColSize, [clc.cyan])
      .fill()
      .contents();
  }
  splitLine() {
    let j = [];
    for (let i = 0; i < this.timeColSize; i++) {
      j.push("-");
    }
    return new Line()
      .column(j.join(""), this.timeColSize)
      .fill()
      .contents();
  }
  firstLine(f) {
    return new Line()
      .column(this.timeContainer[f], this.timeColSize)
      .padding(this.paddingSize)
      .column(
        this.buckets[this.timeContainer[f]] &&
          this.buckets[this.timeContainer[f]].length &&
          this.buckets[this.timeContainer[f]] !== "fail"
          ? this.buckets[this.timeContainer[f]][0]
          : "No Buckets",
        this.bucketColSize
      )
      .fill()
      .contents();
  }
  remainLines(j) {
    const container = [];
    for (let i = 1; i < this.buckets[this.timeContainer[j]].length; i++) {
      container.push(
        new Line()
          .padding(this.paddingSize)
          .column("", this.timeColSize)
          .column(this.buckets[this.timeContainer[j]][i], this.bucketColSize)
          .fill()
          .contents()
      );
    }
    return container.join("\n");
  }
  buildLog() {
    let content = ui.horizontalLine;
    content += "\n";
    content += ui.centralize(col.bold("Data Transfer Statistic"));
    content += "\n";
    content += this.headers();
    for (let j = 0; j < this.timeContainer.length; j++) {
      content += this.firstLine(j);
      if (
        this.buckets[this.timeContainer[j]] &&
        this.buckets[this.timeContainer[j]] !== "fail"
      )
        content += this.remainLines(j);
      if (j !== this.timeContainer.length - 1) content += this.splitLine();
    }
    return content;
  }
}

module.exports = props => new LogReport(props).buildLog();

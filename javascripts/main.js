var mapMap = function(map, f) {
  var newMap = {};
  for (var k in map) {
    newMap[k] = f(map[k]);
  }
  return newMap;
};

var unityRandomW1 = [];
var unityRandomW2 = [];

var processData = function(data) {
  for (var i in data) {
    unityRandomW1.push({
      nextSeed: parseInt(data[i][1]),
      values: data[i].slice(2).map(Number)
    });
  }
};

var processDataW2 = function(data) {
  for (var i in data) {
    unityRandomW2.push({
      nextSeed: parseInt(data[i][1]),
      values: data[i].slice(2).map(Number)
    });
  }
};

$.ajax({
  url: "./saved_data - Copy.csv",
  async: false,
  dataType: "text",
  success: function(data) {
    processData($.csv2Array(data));
  }
});

$.ajax({
  url: "./artifact_order_public - Random40.csv",
  async: false,
  dataType: "text",
  success: function(data) {
    processDataW2($.csv2Array(data));
  }
});

var MMAX = 2147483647;
var MMIN = -2147483648;
var MSEED = 161803398;

var Random = function(s) {
  var ii;
  var mj, mk;

  this.seedArray = newZeroes(56);
  mj = MSEED - Math.abs(s);
  this.seedArray[55] = mj;
  mk = 1;
  for (var i = 1; i < 55; i++) {
    ii = (21 * i) % 55;
    this.seedArray[ii] = mk;
    mk = mj - mk;
    if (mk < 0) { mk += MMAX; }
    mj = this.seedArray[ii];
  }
  for (var k = 1; k < 5; k++) {
    for (var i = 1; i < 56; i++) {
      this.seedArray[i] -= this.seedArray[1 + ((i + 30) % 55)];
      if (this.seedArray[i] < 0) { this.seedArray[i] += MMAX; }
    }
  }
  this.inext = 0;
  this.inextp = 31;

  this.next = function(minValue, maxValue) {
    if (minValue > maxValue) {
      // error, blakhskd jfhkajesh f
    }
    var range = maxValue - minValue;
    if (range <= 1) {
      return minValue;
    }
    return Math.floor(this.sample() * range) + minValue;
  };
  
    // returns double
  this.sample = function() {
    if (++this.inext >= 56) { this.inext = 1; }
    if (++this.inextp >= 56) { this.inextp = 1; }
    var num = this.seedArray[this.inext] - this.seedArray[this.inextp];
    if (num < 0) { num += MMAX; }
    this.seedArray[this.inext] = num;
    return (num * 4.6566128752457969E-10);
  };
}

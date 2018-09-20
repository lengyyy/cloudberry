/*
 * This service is for drawing tendency line chart.
 * It provides function for preprocessing chart data, and use chart.js to draw chart.
 * It is used by popup window and hash tag module now.
 */
'use strict';
angular.module('cloudberry.common', [])
  .service('chartUtil', function (cloudberry) {

    // Return difference of two arrays, the arrays must has no duplicate
    this.arrayDiff = function (newArray, oldArray) {
      var diffArray = [], difference = [];
      for (var i = 0; i < newArray.length; i++) {
        diffArray[newArray[i]] = true;
      }
      for (var j = 0; j < oldArray.length; j++) {
        if (diffArray[oldArray[j]]) {
          delete diffArray[oldArray[j]];
        } else {
          diffArray[oldArray[j]] = true;
        }
      }
      for (var key in diffArray) {
        difference.push(key);
      }
      return difference;
    };


    // Complement chart data by adding empty data point and then sort it
    this.complementData = function (chartData, hasCountMonth) {
      var zeroCountMonth = [];
      var minDate = cloudberry.parameters.timeInterval.start;
      var maxDate = cloudberry.parameters.timeInterval.end;

      // add empty data point
      for (var m = new Date(minDate.getFullYear(),minDate.getMonth()); m <= new Date(maxDate.getFullYear(),maxDate.getMonth()); m.setMonth(m.getMonth()+1)) {
        zeroCountMonth.push(new Date(m.getTime()));
      }
      zeroCountMonth = this.arrayDiff(hasCountMonth,zeroCountMonth);
      for (var j = 0; j < zeroCountMonth.length; j++) {
        chartData.push({x: new Date(zeroCountMonth[j]), y:0});
      }

      // sort the date
      chartData.sort(function(previousVal, currentVal) {
        return previousVal.x - currentVal.x;
      });
      return chartData;
    };


    // Preprocess query result to chart data could be used by chart.js
    // The `queryResult` is group by month, after prepocess it is still group by month.
    this.preProcessByMonthResult = function (queryResult) {
      var chartData = [];
      var hasCountMonth = [];
      for (var i = 0; i < queryResult.length; i++) {
        var thisMonth = new Date(queryResult[i].month.split(("-"))[0], queryResult[i].month.split(("-"))[1] - 1);
        hasCountMonth.push(thisMonth);
        chartData.push({x: thisMonth, y:queryResult[i].count});
      }
      return this.complementData(chartData, hasCountMonth);
    };


    // Preprocess query result to chart data could be used by chart.js
    // The `queryResult` is group by day, after prepocess it change to group by month.
    this.preProcessByDayResult = function (queryResult) {
      // group by year
      var groups = queryResult.reduce(function (previousVal, currentVal) {
        var yearNum = currentVal.day.split(("-"))[0];
        (previousVal[yearNum])? previousVal[yearNum].data.push(currentVal) : previousVal[yearNum] = {year: yearNum, data: [currentVal]};
        return previousVal;
      }, {});
      var resultByYear = Object.keys(groups).map(function(k) { return groups[k];});

      // sum up the result for every month
      var resultByMonth = [];
      var hasCountMonth = [];
      for (var i = 0; i < resultByYear.length; i++){
        var groups = resultByYear[i].data.reduce(function (previousVal, currentVal) {
          var monthNum = currentVal.day.split(("-"))[1];
          if (previousVal[monthNum]) {
            previousVal[monthNum].y += currentVal.count;
          } else {
            var thisMonth = new Date(resultByYear[i].year,monthNum-1);
            previousVal[monthNum] = { y: currentVal.count, x: thisMonth};
            hasCountMonth.push(thisMonth);
          }
          return previousVal;
        }, {});
        var resultByMonthOneYear = Object.keys(groups).map(function(key){ return groups[key]; });
        resultByMonth = resultByMonth.concat(resultByMonthOneYear);
      }
      return this.complementData(resultByMonth, hasCountMonth);
    };


    // Configure the chart: whether show the lable/grid or not in chart.
    this.chartConfig = function (displayLable, displayGrid) {
      return {
        type: "line",
        data:{
          datasets:[{
            lineTension: 0,
            data:chartData,
            borderColor:"#3e95cd",
            borderWidth: 0.8,
            pointRadius: 1.5
          }]
        },
        options: {
          legend: {
            display: false
          },
          scales: {
            xAxes: [{
              type: "time",
              time: {
                unit:"month"
              },
              scaleLabel: {
                display: displayLable,
                labelString: "Date"
              },
              gridLines:{
                display: displayGrid
              }
            }],
            yAxes: [{
              scaleLabel: {
                display: displayLable,
                labelString: "Count"
              },
              ticks: {
                beginAtZero: true,
                suggestedMax: 4
              },
              gridLines:{
                display: displayGrid
              }
            }]
          }
        }
      };
    };


    //draw tendency chart using chart.js
    this.drawChart = function(chartData, chartElementId, chartConfig) {
      if (chartData.length !== 0 && document.getElementById(chartElementId)) {
        var ctx = document.getElementById(chartElementId).getContext("2d");
        var myChart = new Chart(ctx, chartConfig);
      }
    };




  });

	// Function to parse attributes from the source URL
	function getQueryVariable(variable) {
		var query = window.location.search.substring(1);
		var vars = query.split("&");
		for (var i=0;i<vars.length;i++) {
			var pair = vars[i].split("=");
			if(pair[0] == variable){return pair[1];}
		}
		return(false);
	}
	// Function to mean component data to parent while preserving timestamps
	function getMeanValues(interfaceList, metricListName, metricName) {
	// convert the interfacelist to a 3d array of samples and then flatten it to a 2d array
	var utilInSamples = interfaceList.map(function(interface) {
		return interface[metricListName];
	}).reduce(function(a, b) {
		return a.concat(b);
	});
	
	return d3.nest()
	.key(function(d) {return d.date;})
	.sortKeys(d3.ascending)
	.rollup(function(d){return d3.mean(d, function(g) {return g[metricName];});})
	.entries(utilInSamples)
	.map(function(entry) {return [new Date(entry.key), entry.values]});
}
// Function to aggregate component data to parent while preserving timestamps
function getSumValues(interfaceList, metricListName, metricName) {
	// convert the interfacelist to a 3d array of samples and then flatten it to a 2d array
	var utilInSamples = interfaceList.map(function(interface) {
		return interface[metricListName];
	}).reduce(function(a, b) {
		return a.concat(b);
	});
	
	return d3.nest()
	.key(function(d) {return d.date;})
	.sortKeys(d3.ascending)
	.rollup(function(d){return d3.sum(d, function(g) {return g[metricName];});})
	.entries(utilInSamples)
	.map(function(entry) {return [new Date(entry.key), entry.values]});
}
// Function to load JSON data from target data source
function loadJSON(dataSource)  {

	var http_request = new XMLHttpRequest();
	try {
		// Opera 8.0+, Firefox, Chrome, Safari
		http_request = new XMLHttpRequest();
	} catch (e){
		// Internet Explorer Browsers
		try{
			http_request = new ActiveXObject("Msxml2.XMLHTTP");
		}catch (e) {
			try{
				http_request = new ActiveXObject("Microsoft.XMLHTTP");
			}catch (e){
				// Something went wrong
				alert("Your browser broke!");
				return false;
			}
		}
	}
	http_request.onreadystatechange  = function() {
		if (http_request.readyState != 4  ) return;
		// Javascript function JSON.parse to parse JSON data
		jsonObj = JSON.parse(http_request.responseText);
 	}
 	var start = (new Date).getTime();
 	//console.log("Started:" + start);
 	http_request.open("GET", dataSource, false);
 	http_request.send();
 	var end = (new Date).getTime();
 	var runTime = (end - start) / 1000;
 	//console.log ("Completed:" + end);
 	console.log ("Total tx time:" + runTime + " seconds");
 	return jsonObj;
}
    function apiToD3 (dataSource) {
        var dataObject = [] // The final results set
        d3.json(dataSource, function (error, data) {
            var allItems = data.d.results;
            for (var itemIndex = 0; itemIndex < allItems.length; itemIndex++) { // Iterate the outer loop for each interface
                if (dataObject[itemIndex] === null || dataObject[itemIndex] === undefined) {
                    dataObject[itemIndex] = {}
                }
                var currentItem = allItems[itemIndex]
                for (var itemAttribute in currentItem) { // for each key in the outer loop
                    if (itemAttribute == "__metadata") {
                        continue
                    } // Skip any metadata entries
                    if (itemAttribute.indexOf("mfs") >= 0) { // If we enter a metric family we need to go deeper
                        var metricTimeValues = [] // Array to hold each metric and it's values for the given metric family
                        for (var j = 0; j < currentItem[itemAttribute].results.length; j++) { // Iterate the total number of data points for the metric family
                            var datapoint = currentItem[itemAttribute].results[j]
                            for (var metric in datapoint) { // For each data point within the metric family
                                if (metric == "__metadata") {
                                    continue
                                } // Skip any metadata entries
                                if (dataObject[itemIndex][metric] === null || dataObject[itemIndex][metric] === undefined) {
                                    dataObject[itemIndex][metric] = []
                                }
                                if (metric == "Timestamp") {
                                    dataObject[itemIndex][metric].push(datapoint[metric])
                                }
                                else {
                                    // If this is a new metric, define it
                                    if (metricTimeValues[metric] === null || metricTimeValues[metric] === undefined) {
                                        metricTimeValues[metric] = []
                                    }
                                    // Build an array of all of the ts,values for each metric
                                    metricTimeValues[metric].push([new Date(dataObject[itemIndex]["Timestamp"][j] * 1000), Number(datapoint[metric])])
                                }
                            } // no more data points
                        } //finished with the specific metric family
                        // Now iterate through the metrics found and build out the structure
                        for (var metric in metricTimeValues) {
                            if (dataObject[itemIndex][itemAttribute] === null || dataObject[itemIndex][itemAttribute] === undefined) {
                                dataObject[itemIndex][itemAttribute] = []
                            }
                            dataObject[itemIndex][itemAttribute].push({
                                key: metric,
                                values: metricTimeValues[metric]
                            })
                        }
                    }
                    else {
                        dataObject[itemIndex][itemAttribute] = currentItem[itemAttribute]
                    }
                } // Next interface
            }
        })
        return dataObject;
    }
    function graphIT_line(myDiv, dataSet) {

        nv.addGraph(function () {
            var chart = nv.models.lineChart()
                .useInteractiveGuideline(true)
                .x(function (d) {
                    return d[0]
                })
                .y(function (d) {
                    return d[1]
                })
                .color(d3.scale.category10().range())
                .transitionDuration(300)
                .clipVoronoi(true)
               // .forceY([0,100])
                .margin({top: 50, right: 50, bottom: 80, left: 80});

            chart.xAxis.tickFormat(function (d) {
                return d3.time.format('%m/%d %I:%M %p')(new Date(d))
            });
            //
            chart.xAxis.rotateLabels(-45);
            chart.yAxis.tickFormat(d3.format(',.2f'));
            chart.color(['#747c96', '#d47385', '#89a676', '#c8b453'])
            chart.xScale(d3.time.scale()); // Evenly scale the time values to align with data points
            d3.select(myDiv).datum(dataSet).call(chart);

            //Rebuild the chart when the window reloaded
            nv.utils.windowResize(chart.update);
            // Log the new window state
            chart.dispatch.on('stateChange', function (e) {
                nv.log('New State:', JSON.stringify(e));
            });
            // return the chart to the function to get loaed
            return chart;
        })
    }

var actualCode = '(' + function() { // Each time the an ajax query is completed, run this again
    //Instead of $, use jQuery since we're injecting it into the page
    jQuery(document).ajaxComplete(function() { 
		//console.log("Ajax reloaded!");
		var evt = document.createEvent('Event'); //WORKS
		evt.initEvent('ajaxReloadEvent', true, false); //WORKS
		// fire the event
		document.dispatchEvent(evt); //WORKS
    })
} + ')();';
var script = document.createElement('script');
script.textContent = actualCode;
(document.head||document.documentElement).appendChild(script);
script.parentNode.removeChild(script);



// Above this line is the code for injecting an event listener into the page to run when the ajax is reloaded
// Next we add the event listener in the content script to carry out everything on the event call
var strDIV = '<div style="display: inline-block; padding: 2px; border: 1px solid black; border-radius: 5px; background-color: #e0e0e0;">';
var strSTYLE = '<style>#RMPTABLE { margin: 2px; } #RMPTABLE td { margin:2px; padding:0px; height: auto; } #RMPTABLE td:first-child { text-align: right; padding-right: 5px; }</style>';
var strSTART = '<tr><td>';
var strMID = '</td><td>';
var strEND = '</td></tr>';
/*WORKS */
document.addEventListener('ajaxReloadEvent', function() {
	$("div[id^=\"u234_\"]").each( function(){
		if ($(this).text().indexOf("--") > -1) return; // Check to see if the name is '---', meaning no professor
		if ($(this).attr('rmp') == 'done') return; // Check to see if we've already inserted the RMP for the professor
		getInfo(this, function(info, tag) { // Call getInfo, and pass the tag we're getting the info for along with a function to insert the information
											// getInfo will call the function and pass it the information, along with the tag it will insert it after
			//console.log("Inserting Info!");
			if (info == 'notfound') { // If we can't find the professor, insert the not found box and return
				$(tag).after(strDIV + 'Teacher\'s Ratings Not Found</div>');
				//console.log("Inserted not found!");
				$(tag).attr('rmp','done'); // Tag the element as done so we don't do it again
				return;
			}
			/* Basic display, I'd like to make this nicer..
			 * Inserts this div after the professor's name
			 */
			$(tag).after(strDIV + strSTYLE
				+ 'Name: ' + info['name'] + '<br/>'
				+ 'Overall Rating: ' + info['overallRating'] + ' with ' + info['numRatings'] + ' total ratings<br/>'
				+ '<table id="RMPTABLE" style="padding:2px">'
				+ strSTART + 'Helpfulness:' + strMID + info['helpRating'] + strEND
				+ strSTART + 'Clarity:' + strMID + info['clarityRating'] + strEND
				+ strSTART + 'Easiness:' + strMID + info['easyRating'] + strEND
				+ '</table>'
				+ '<a href="' + info['url'] + '" target="_blank">Link To Results</a>'
				+ '<div class="RMPDISCLAIMER" style="float:right;cursor:default;border:1px solid black;display:inline-block;padding:1px;margin:0px;border-radius:2px;font-size:12px">?</div><span style="font-style:italic;font-size:12px; display:none"><br/>Disclaimer:<br/>These rating do not necessarily reflect<br/> an accurate sample of the class<br /> and should not used as a measure<br />of decision between classes.<br /> This rating are not affiliated with<br />the University of Washington.</span>'
				+ '</div>');
			//console.log("Inserted professor!");
			$(tag).attr('rmp','done'); // Tag the element as done so we don't do it again
		});
	});
	$(".RMPDISCLAIMER").click( function() {
		$(this).next().toggle();
	});
});

//*** getInfo method ***
//It would be nice if I could put getInfo in another js file, but it wasn't working so for now it's here
//***                    ***
// GET URL BASE: http://search.mtvnservices.com/typeahead/suggest/?q=STEARNS+AND+schoolid_s%3A1530&siteName=rmp&fl=pk_id+teacherfirstname_t+teacherlastname_t+total_number_of_ratings_i+averageratingscore_rf+schoolid_s+averageclarityscore_rf+averagehelpfulscore_rf+averageeasyscore_rf
var professorDB = {};

function getInfo(tag, callback) { //getInfo no longer returns anything, it just executes
	var name = $(tag).text().trim();
	//console.log("insertinfo called");
	var tname = name.replace(",", "").toUpperCase(); // Assuming that the name is LAST, FIRST [...]
	var lname = tname.split(" ")[0];				 // and I'm only gonna use LAST and FIRST, ignoring [...]
	var fname = tname.split(" ")[1];
	var getURL = "http://search.mtvnservices.com/typeahead/suggest/?q="
		+ fname + "+" + lname
		+ "+AND+schoolid_s%3A1530&siteName=rmp&fl=pk_id+teacherfullname_s+total_number_of_ratings_i+averageratingscore_rf+schoolid_s+averageclarityscore_rf+averagehelpfulscore_rf+averageeasyscore_rf";
	// This gives us the url to send a request to.
	
	// Lets check if we've already searched for this professor before, and if we have lets save ourselves a call to RMP
	if ((lname + fname) in professorDB) {
		callback(dict, tag);
		return;
	}
	
	// Now lets send a GET request...
	chrome.runtime.sendMessage({ // This sends a message that gets picked up by the background script (background.js)
		method: 'GET',
		action: 'xhttp',
		url: getURL, 
		data: ''
	}, function(responseText) { // <---- Executes whatever is in this function, responseText can be used with JSON.parse(responseText) to get a JSON object with everything. 
			/*Callback function to deal with the response*/
			var res = JSON.parse(responseText).response;
			if (res.docs.length==0) {
				//console.log("NO PROF FOUND!");
				callback('notfound', tag); // If the teacher isn't found, return 'notfound' with the tag so it can handle that
				return;
			}
			//console.log(res);
			// If it did find the professor, put all the information into a nice format for the callback to use
			var dict = {};
			dict["name"] = res.docs[0].teacherfullname_s;
			dict["overallRating"] = res.docs[0].averageratingscore_rf;
			dict["numRatings"] = res.docs[0].total_number_of_ratings_i;
			dict["helpRating"] = res.docs[0].averagehelpfulscore_rf;
			dict["clarityRating"] = res.docs[0].averageclarityscore_rf;
			dict["easyRating"] = res.docs[0].averageeasyscore_rf;
			dict["url"] = 'http://www.ratemyprofessors.com/ShowRatings.jsp?tid='+ res.docs[0].pk_id;
			// Now lets add it to our database of professors before invoking the callback, so we don't need to send a GET again
			professorDB[(lname + fname)] = dict;
			callback(dict, tag);
			return;
	});

	return null;
}

calls = [];

function get_active_calls()
{
	var cors_api_url = 'https://cors-anywhere.herokuapp.com/';
	var target_site = 'http://eservices.ci.richmond.va.us/applications/publicsafety/activecalls//Home/ActiveCalls';
	fetch(cors_api_url + target_site, {mode: 'cors'})
		.then(res => res.text())
		.then(html => parse_response(new DOMParser().parseFromString(html, "text/html")));
}

function parse_response(response)
{
	for (let call of response.getElementsByTagName('tbody')[0].getElementsByTagName('tr')) calls.push(parse_call(call.innerText.split('\n')));
	for (let call of calls) get_geo(call);
}

function parse_call(call)
{
	return {
		time: call[1].trim(),
		agency: call[2].trim(),
		dispatch_area: call[3].trim(),
		unit: call[4].trim(),
		type: call[5].trim(),
		location: call[6].trim(),
		status: call[7].trim()
	}
}

function get_geo(data)
{
	var addr = data.location.split(' ').join('+') + ',RICHMOND+VA';
	fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + addr + '&key=AIzaSyB8_2x3EdP6gSHflt18vt-C0DamzFj2K00').then(res => res.json()).then(json => parse_geo(json, data));
}

function parse_geo(geo, data)
{
	make_marker({lat: geo.results[0].geometry.location.lat, lng: geo.results[0].geometry.location.lng}, data);
}

function make_marker(latlng, data)
{
	var marker = L.marker(latlng).addTo(mymap).on('click', () => make_popup(latlng, data));
}

function make_popup(latlng, data)
{
	var popup = L.popup();
	popup.setLatLng(latlng);
	popup.setContent(data.type);
	popup.openOn(mymap);
}

get_active_calls();
var mymap = L.map('mapid').setView([37.533333, -77.466667], 13);
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.satellite',
    accessToken: 'pk.eyJ1IjoiMDEwMTAxMTEiLCJhIjoiY2p3djYzenMyMDZkZjRhbGZyaXc5ZzBnNyJ9.O7MfptxKf1r_nZDCdm2OuQ'
}).addTo(mymap);

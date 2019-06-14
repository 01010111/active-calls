calls = [];
markers = [];

function get_active_calls()
{
	remove_markers();
	var cors_api_url = 'https://cors-anywhere.herokuapp.com/';
	var target_site = 'http://eservices.ci.richmond.va.us/applications/publicsafety/activecalls//Home/ActiveCalls';
	fetch(cors_api_url + target_site, {mode: 'cors'})
		.then(res => res.text())
		.then(html => parse_response(new DOMParser().parseFromString(html, "text/html")));
	setTimeout(() => get_active_calls(), 60 * 60 * 1000);
}

function remove_markers()
{
	while (markers.length > 0) mymap.removeLayer(markers.pop());
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
	fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + addr + '&key=AIzaSyB8_2x3EdP6gSHflt18vt-C0DamzFj2K00')
		.then(res => res.json())
		.then(json => parse_geo(json, data));
}

function parse_geo(geo, data)
{
	make_marker({lat: geo.results[0].geometry.location.lat, lng: geo.results[0].geometry.location.lng}, data);
}

function make_marker(latlng, data)
{
	var marker = L.marker(latlng, {
		icon: get_icon(data.agency),
		riseOnHover: true
	}).addTo(mymap).on('click', () => make_popup(latlng, data));
	markers.push(marker);
}

function get_icon(agency)
{
	switch (agency)
	{
		case 'RPD': return police_icon;
		case 'RFD': return fire_icon;
		default: return police_icon;
	}
}

function make_popup(latlng, data)
{
	var popup = L.popup({
		closeButton: false,
		closeOnClick: true,
		maxWidth: 600
	});
	popup.setLatLng(latlng);
	popup.setContent(get_content(data));
	popup.openOn(mymap);
}

function get_content(data)
{
	var out = '';
	out += data.agency;
	out += ' ' + data.dispatch_area + '<br/><font color="#ff004d">---</font><br/>';
	out += data.type += '<br/>';
	out += data.location += '<br/>';
	out += data.status += '<br/>';
	out += '<font color="#ff004d">' + data.time + '</font>';
	return out;
}

var police_icon = L.icon({
    iconUrl: 'police.svg',
    iconSize: [48, 48],
    iconAnchor: [24, 48]
});

var fire_icon = L.icon({
    iconUrl: 'fire.svg',
    iconSize: [48, 48],
    iconAnchor: [24, 48]
});

var mymap = L.map('map', { zoomControl:false }).setView([37.533333, -77.466667], 13);
L.tileLayer('http://a.tile.stamen.com/toner/{z}/{x}/{y}.png').addTo(mymap);
get_active_calls();

setTimeout(() => {
	document.getElementById('title').classList.add('zero_opacity')
}, 4000);
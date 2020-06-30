trace = console.log;
calls = [];
markers = [];
circles = [];
const params = new URLSearchParams(window.location.href.split('?')[1]);
lat = params.get('lat');
lng = params.get('lng');
do_alert = params.get('alert');
refresh = parseFloat(params.get('refresh'));
if (isNaN(refresh)) refresh = 60;
miles = parseFloat(params.get('miles'));
if (isNaN(miles)) miles = 1;

function get_active_calls()
{
	trace('***\nRefreshing\n' + new Date().toTimeString() + '\n***');
	remove_markers();
	if (lat && lng) make_marker({ lat: lat, lng: lng }, {
		agency: 'HOME'
	});
	fetch('https://cors-anywhere.herokuapp.com/https://apps.richmondgov.com/applications/activecalls/Home/ActiveCalls')
		.then(res => res.text())
		.then(html => parse_response(new DOMParser().parseFromString(html, 'text/html')));
	setTimeout(() => {
		get_active_calls();
	}, refresh * 60 * 1000);
}

function remove_markers()
{
	calls = [];
	while (markers.length > 0) mymap.removeLayer(markers.pop());
	while (circles.length > 0) mymap.removeLayer(circles.pop());
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
	if (geo.status != 'OK') return;
	make_marker({lat: geo.results[0].geometry.location.lat, lng: geo.results[0].geometry.location.lng}, data);
}

function make_marker(latlng, data)
{
	var is_home = data.agency == 'HOME';
	var close = !is_home &&  check_home_distance(latlng, data);
	var marker = L.marker(latlng, {
		icon: get_icon(data.agency),
		riseOnHover: true
	});
	if (!is_home) marker.bindPopup(get_content(data), {
		closeButton: false,
		closeOnClick: true,
		maxWidth: 600
	});
	marker.addTo(mymap);
	markers.push(marker);
	if (is_home) {
		var circle = L.circle([latlng.lat, latlng.lng], {
			fillOpacity: 0,
			radius: 1609.34 * miles,
			color: '#000000',
			dashArray: '4',
			weight: 2
		}).addTo(mymap);
		circles.push(circle);
	}
	else {
		var circle = close ? 
			L.circle([latlng.lat, latlng.lng], {
				fillColor: '#ff004d',
				fillOpacity: 0.25,
				radius: 1609.34 * miles,
				color: '#ff004d',
				dashArray: '4',
				weight: 1
			}).addTo(mymap):
			L.circle([latlng.lat, latlng.lng], {
				fillColor: '#ff004d',
				fillOpacity: 0.1,
				radius: 1609.34 * miles,
				stroke: false
			}).addTo(mymap);
		circles.push(circle);
	}
}

function check_home_distance(latlng, data)
{
	if (lat == undefined || lng == undefined || data.agency == 'HOME') return false;
	var out = distance({ x: latlng.lat, y: latlng.lng }, { x: parseFloat(lat), y: parseFloat(lng) }) < (0.0145 * miles);
	if (out) proximity_alert(data);
	return out;
}

function proximity_alert(data)
{
	var msg = '';
	msg += data.agency.split('<br/>')[0];
	msg += ' ALERT\n---\n';
	msg += data.type.split('<br/>')[0] += '\n';
	msg += data.location.split('<br/>')[0] += '\n';
	msg += data.status.split('<br/>')[0] += '\n';
	msg += data.time.split('<br/>')[0];
	trace(msg);
	if (do_alert == 'true') alert(msg);
}

function distance(p1, p2)
{
	return Math.sqrt( Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) );
}

function get_icon(agency)
{
	switch (agency)
	{
		case 'RPD': return police_icon;
		case 'RFD': return fire_icon;
		case 'HOME': return home_icon;
		default: return police_icon;
	}
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

var home_icon = L.icon({
	iconUrl: 'home.svg',
	iconSize: [24, 24],
	iconAnchor: [12, 24],
	fillColor: '#ff004d'
});

var mymap = L.map('map', { zoomControl:false }).setView([37.533333, -77.466667], 13);
L.tileLayer('http://a.tile.stamen.com/toner/{z}/{x}/{y}.png').addTo(mymap);
get_active_calls();

setTimeout(() => {
	document.getElementById('title').classList.add('zero_opacity')
}, 4000);
calls = [];
markers = [];
circles = [];
alerts = [];
trace = console.log;

function get_active_calls()
{
	remove_markers();
	fetch('https://cors-anywhere.herokuapp.com/https://apps.richmondgov.com/applications/activecalls/Home/ActiveCalls')
		.then(res => res.text())
		.then(html => parse_response(new DOMParser().parseFromString(html, 'text/html')));
	setTimeout(() => {
		get_active_calls();
	}, 60 * 60 * 1000);
}

function remove_markers()
{
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
	var marker = L.marker(latlng, {
		icon: get_icon(data.agency),
		riseOnHover: true
	}).bindPopup(get_content(data), {
		closeButton: false,
		closeOnClick: true,
		maxWidth: 600
	}).addTo(mymap);
	var circle = L.circle([latlng.lat, latlng.lng], {
		fillColor: '#ff004d',
		fillOpacity: 0.05,
		radius: 2000,
		stroke: false
	}).addTo(mymap);
	markers.push(marker);
	circles.push(circle);
	check_home_distance(latlng, data);
}

function check_home_distance(latlng, data)
{
	var d = distance({ x: latlng.lat, y: latlng.lng }, { x: 37.577321, y: -77.415282 });
	if (d < 0.01) send_text(data);
}

function send_text(data)
{
	var msg = '';
	msg += data.agency;
	msg += ' ALERT\n---\n';
	msg += data.type += '\n';
	msg += data.location += '\n';
	msg += data.status += '\n';
	msg += data.time;
	if (alerts.indexOf(msg) != -1) return;
	if (window.location.href.indexOf('me') == -1) return;
	alerts.push(msg);
	console.log('email: ', msg);
	Email.send({
		Host : "smtp.elasticemail.com",
		Username : "b.ultra.dnb@gmail.com",
		Password : "d2a5019f-e677-40ac-b9f9-183e8a214d58",
		To : '8044774864@vtext.com',
		From : "b.ultra.dnb@gmail.com",
		Subject : "",
		Body : msg
	});
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

var mymap = L.map('map', { zoomControl:false }).setView([37.533333, -77.466667], 13);
L.tileLayer('http://a.tile.stamen.com/toner/{z}/{x}/{y}.png').addTo(mymap);
get_active_calls();

setTimeout(() => {
	document.getElementById('title').classList.add('zero_opacity')
}, 4000);
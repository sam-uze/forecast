/* Wind & Wetter Beispiel */

// Innsbruck
let ibk = {
    lat: 47.267222,
    lng: 11.392778
};

// Karte initialisieren
let map = L.map("map").setView([ibk.lat, ibk.lng], 5);

// thematische Layer
let overlays = {
    forecast: L.featureGroup().addTo(map),
    wind: L.featureGroup().addTo(map)
}

// Layer Control
let layerControl = L.control.layers({
    "Openstreetmap": L.tileLayer.provider("OpenStreetMap.Mapnik"),
    "Esri WorldTopoMap": L.tileLayer.provider("Esri.WorldTopoMap"),
    "Esri WorldImagery": L.tileLayer.provider("Esri.WorldImagery").addTo(map)
}, {
    "Wettervorhersage MET Norway": overlays.forecast,
    "ECMWF Windvorhersage": overlays.wind,
}).addTo(map);

// Maßstab
L.control.scale({
    imperial: false,
}).addTo(map);

async function addWindLayer() {

    let urlwind = "https://geographie.uibk.ac.at/data/ecmwf/data/wind-10u-10v-europe.json";
    let response = await fetch(urlwind);
    let jsondata = await response.json();
    

    let velocityLayer = L.velocityLayer({
    displayValues: true,
    displayOptions: {
        // label prefix
        velocityType: "Global Wind",

        // leaflet control position
        position: "bottomleft",

        // no data at cursor
        emptyString: "No velocity data",

        // see explanation below
        angleConvention: "bearingCW",

        // display cardinal direction alongside degrees
        showCardinal: false,

        // one of: ['ms', 'k/h', 'mph', 'kt']
        speedUnit: "ms",

        // direction label prefix
        directionString: "Direction",

        // speed label prefix
        speedString: "Speed",
    },
    data: jsondata, // see demo/*.json, or wind-js-server for example data service

    // OPTIONAL
    minVelocity: 0, // used to align color scale
    maxVelocity: 10, // used to align color scale
    velocityScale: 0.005, // modifier for particle animations, arbitrarily defaults to 0.005
    colorScale: [], // define your own array of hex/rgb colors
    onAdd: null, // callback function
    onRemove: null, // callback function
    opacity: 0.97, // layer opacity, default 0.97

    // optional pane to add the layer, will be created if doesn't exist
    // leaflet v1+ only (falls back to overlayPane for < v1)
    paneName: "overlayPane",
    });
    overlays.wind.addLayer(velocityLayer);
}
addWindLayer();

//Orte über OpenStreetmap Reverse Geocoding bestimmt
async function getPlaceName(url) {
    let response = await fetch(url);
    let jsondata = await response.json();
    //console.log(jsondata);
    return jsondata.display_name;
}

// Wettervorhersage MET Norway
async function showForecast(latlng) {
    //console.log("Popup erzeugt bei", latlng);
    let url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latlng.lat}&lon=${latlng.lng}`;
    let osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&zoom=15&format=jsonv2`;
    let placeName = await getPlaceName(osmUrl);

    //console.log(url);
    let response = await fetch(url);
    let jsondata = await response.json();
    //console.log(jsondata);

    //Popup erstellen
    
    let details = jsondata.properties.timeseries[0].data.instant.details;
    let timestamp = new Date(jsondata.properties.meta.updated_at);
    let markup =`
        <h3>Wettervorhersage für ${timestamp.toLocaleString()}</h3>
        <small>Ort: ${placeName}</small>
        <ul>
            <li>Luftdruck (hPa): ${details.air_pressure_at_sea_level}</li>
            <li>Lufttemperatur (C°): ${details.air_temperature}</li>
            <li>Bewölkungsgrad (%): ${details.cloud_area_fraction}</li>
            <li>Luftfeuchtigkeit (%): ${details.relative_humidity}</li>
            <li>Windrichtung (°): ${details.wind_from_direction}</li>
            <li>Windgeschwindigkeit (km/h): ${details.wind_speed}</li>
        </ul>
        `;
  
    //Wettericons für die nächsten 24 Stunden in 3 Stunden Schritten
    for (let i = 0; i <= 24; i+=3) {
        let symbol = jsondata.properties.timeseries[i].data.next_1_hours.summary.symbol_code;
        let time = new Date(jsondata.properties.timeseries[i].time);
        markup += `<img src="icons/${symbol}.svg" style="width:32px" title="${time.toLocaleString()}">`;
    }

    //Links zu den Json-Daten
    markup += `
    <p>
        <a href="${url}" target="forecast">Daten downloaden</a> |
        <a href="${osmUrl}" target="forecast">OSM Details zum Ort</a>
    </p>
    `;   

    L.popup([
        latlng.lat, latlng.lng
    ], {
        content: markup,
    }).openOn(overlays.forecast);
}


// auf Kartenklick reagieren
map.on("click", function (evt) {
    showForecast(evt.latlng);
});

// KLick auf Innsbruck simulieren
map.fire("click", {
    latlng: {
        lat: ibk.lat,
        lng: ibk.lng
    }
});
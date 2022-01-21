//Please use your default key from mapbox

console.log(deck)
const { MapboxLayer, H3HexagonLayer, HeatmapLayer, HexagonLayer, DeckGL } = deck;
const { scaleThreshold } = d3 - scale;
mapboxgl.accessToken = 'pk.eyJ1IjoibXJpbmFsc2hhcm1hIiwiYSI6ImNreTJ6YjdidjBxZmIzMGxsYzhjdm9rb2kifQ.N0fWE4F8NTMXiwUBcWYsVw';

navigator.geolocation.getCurrentPosition(successLocation, errorLocation, { enableHighAccuracy: true })
let max, min;

let chart_type = "heat_map"
let pitch = 0;
let pos = null;
let file = 'public/2017_before.csv'
let map = null
function successLocation(position) {
    console.log(position)
    pos = position;
    setupmap([position.coords.longitude, position.coords.latitude], 3.4)
}

function errorLocation() {

}

function changeYear(value) {
    let suffix = file.split("/")[1].substring(5)
    file = 'public/' + value + '_' + suffix
    console.log(file)
    const center = map.getCenter();
    const zoom = map.getZoom();
    setupmap(center, zoom)
}

function changeView(value) {
    chart_type = value == 'heat' ? 'heat_map' : 'h3hex'
    pitch = value == 'heat' ? 0 : 40.5
    const center = map.getCenter();
    const zoom = map.getZoom();
    setupmap(center, zoom)
}

function setData(value) {
    let prefix = file.split("/")[1].substring(0, 4)
    file = 'public/' + prefix + '_' + value + '.csv'
    console.log(file)
    const center = map.getCenter();
    const zoom = map.getZoom();
    setupmap(center, zoom)
}


function selectYear(value) {
    console.log(value)
}

function makeBucket(max, min) {
    var arr = [];
    var step = (max - min) / 6;
    for (var i = 0; i < 7; i++) {
        arr.push(min + (step * i));
    }
    bucket = arr;
    console.log(bucket)
    return arr;
}


function sendBucket(val) {
    let res
    if (val > bucket[0] && val < bucket[1]) {
        res = 1;
    }
    else if (val > bucket[1] && val < bucket[2]) {
        res = 2;
    }
    else if (val > bucket[2] && val < bucket[3]) {
        res = 3;
    }
    else if (val > bucket[3] && val < bucket[4]) {
        res = 4;
    }
    else if (val > bucket[4] && val < bucket[5]) {
        res = 5;
    }
    else {
        res = 6;
    }
    return res
}


function mapLoad(data, data_hex, bucket, center, zoom) {
    map = new mapboxgl.Map({
        container: document.body,
        style: 'mapbox://styles/mapbox/dark-v10', // style URL,
        center: center,
        zoom: zoom,
        mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
        controller: true,
        pitch: pitch
    });
    const COLOR_RANGE = [
        [1, 152, 189],
        [73, 227, 206],
        [216, 254, 181],
        [254, 237, 177],
        [254, 173, 84],
        [209, 55, 78]
    ];

    map.on('load', () => {
        const firstLabelLayerId = map.getStyle().layers.find(layer => layer.type === 'symbol').id;

        map.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'type': 'fill-extrusion',
            'minzoom': 10,
            'paint': {
                'fill-extrusion-color': '#aaa',

                // use an 'interpolate' expression to add a smooth transition effect to the
                // buildings as the user zooms in
                'fill-extrusion-height': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "height"]
                ],
                'fill-extrusion-base': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "min_height"]
                ],
                'fill-extrusion-opacity': .6
            }
        }, firstLabelLayerId);

        if (chart_type == 'heat_map') {
            intensity = 1,
                threshold = 0.03,
                radiusPixels = 20,
                // console.log(bucket[0],bucket[6])
                // console.log(data_hex)

                map.addLayer(new MapboxLayer({
                    data,
                    id: 'heatmp-layer',
                    type: HeatmapLayer,
                    colorRange: COLOR_RANGE,
                    aggregation: 'MEAN',
                    pickable: true,
                    getPosition: d => [d[0], d[1]],
                    getWeight: d => d[2],
                    radiusPixels,
                    intensity,
                    threshold,
                    getTooltip: ({ object }) => object && object.message
                }))
            // data_hex='https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/sf.h3cells.json',
        } else {
            const colorScaleFunction = d3.scaleThreshold()
                .domain(bucket)
                .range([
                    [65, 182, 196],
                    [254, 178, 76],
                    [253, 141, 60],
                    [252, 78, 42],
                    [227, 26, 28],
                    [189, 0, 38],
                ]);

            map.addLayer(new MapboxLayer({
                id: 'h3-hexagon-layer',
                data: data_hex,
                type: H3HexagonLayer,
                elevationScale: 1000,
                extruded: true,
                filled: true,
                highPrecision: true,
                getElevation: d => d.count,
                getFillColor: d => colorScaleFunction(d.count),
                getHexagon: d => d.hex,
                wireframe: false,
                pickable: true,
            }))
        }

    });
    const nav = new mapboxgl.NavigationControl();
    map.addControl(nav);
}
function setupmap(center, zoom) {
    let data = null;
    let data_hex = null;
    let bucket = [];
    d3.csv(file).then(response => {
        let val_arr = response.map(d => Number(d.value))
        bucket = makeBucket(Math.max(...val_arr), Math.min(...val_arr))
        data = response.map(d => [Number(d.longitude), Number(d.latitude), Number(d.value), sendBucket(Number(d.value))]);
        // console.log(data);
        console.log(data)
        data_hex = response.map(d => {
            return {
                hex: h3.geoToH3(Number(d.latitude), Number(d.longitude), 4),
                count: Number(d.value)
            }
        })
        console.log(data_hex)
        mapLoad(data, data_hex, bucket, center, zoom);
    });

}

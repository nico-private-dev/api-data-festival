/**
 * Configuration de l'application
 */
const CONFIG = {
    // Configuration de l'API
    api: {
        baseUrl: 'https://data.culture.gouv.fr/api/records/1.0/search/',
        dataset: 'festivals-global-festivals-_-pl',
        defaultParams: {
            rows: 100,
            refine: {
                discipline_dominante: 'Musique'
            }
        }
    },
    
    // Configuration de la carte Leaflet
    map: {
        center: [46.227638, 2.213749], // Centre exact de la France métropolitaine
        zoom: 6,
        maxZoom: 19, // Augmentation du zoom maximum
        minZoom: 2,  // Réduction du zoom minimum pour permettre de dézoomer davantage
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    
    // Configuration des marqueurs
    markers: {
        defaultIcon: {
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        },
        cluster: {
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true
        }
    }
};

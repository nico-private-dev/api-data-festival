/**
 * Module de gestion de la carte Leaflet
 */
class FestivalsMap {
    constructor(config) {
        this.config = config;
        this.mapConfig = config.map || {}; // Configuration de la carte
        this.markersConfig = config.markers || {}; // Configuration des marqueurs
        this.map = null;
        this.markers = [];
        this.markerClusterGroup = null;
        this.festivals = [];
    }

    /**
     * Initialise la carte Leaflet
     * @param {String} elementId - ID de l'élément HTML qui contiendra la carte
     */
    initMap(elementId) {
        // Vérifier si l'élément existe
        const mapElement = document.getElementById(elementId);
        if (!mapElement) {
            console.error(`Élément avec l'ID '${elementId}' non trouvé dans le DOM`);
            return;
        }
        
        // Valeurs par défaut si la configuration est incomplète
        const center = this.mapConfig.center || [46.227638, 2.213749]; // Centre de la France
        const zoom = this.mapConfig.zoom || 6;
        const maxZoom = this.mapConfig.maxZoom || 19;
        const minZoom = this.mapConfig.minZoom || 2;
        const tileUrl = this.mapConfig.tileLayer || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const attribution = this.mapConfig.attribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        
        // Création de la carte avec des options supplémentaires
        try {
            this.map = L.map(elementId, {
                center: center,
                zoom: zoom,
                maxZoom: maxZoom,
                minZoom: minZoom,
                zoomControl: false, // Désactivation du contrôle de zoom par défaut pour le remplacer
                doubleClickZoom: true, // Activation du zoom par double-clic
                scrollWheelZoom: true, // Activation du zoom par molette
                dragging: true, // Activation du déplacement de la carte
                tap: true // Activation du tap sur mobile
            });

            // Ajout du fond de carte
            L.tileLayer(tileUrl, {
                attribution: attribution,
                maxZoom: maxZoom,
                minZoom: minZoom
            }).addTo(this.map);

            // Ajout du contrôle de zoom à une position spécifique
            L.control.zoom({
                position: 'topright',
                zoomInTitle: 'Zoomer',
                zoomOutTitle: 'Dézoomer'
            }).addTo(this.map);

            // Initialisation du groupe de clusters de marqueurs avec des options par défaut si nécessaire
            const clusterOptions = this.markersConfig.cluster || {
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: true,
                zoomToBoundsOnClick: true
            };
            
            this.markerClusterGroup = L.markerClusterGroup(clusterOptions);
            this.map.addLayer(this.markerClusterGroup);

            // Ajout d'un contrôle d'échelle
            L.control.scale({
                imperial: false,
                metric: true,
                position: 'bottomright'
            }).addTo(this.map);

            // Vérification que la carte est bien centrée sur la France
            this.map.whenReady(() => {
                console.log("Carte initialisée avec le centre:", this.map.getCenter());
                console.log("Niveau de zoom actuel:", this.map.getZoom());
            });

            console.log(`Carte initialisée avec succès dans l'élément '${elementId}'`);
        } catch (error) {
            console.error("Erreur lors de l'initialisation de la carte:", error);
        }
    }

    /**
     * Crée un marqueur pour un festival
     * @param {Object} festival - Données du festival
     * @returns {Object} Marqueur Leaflet
     */
    createMarker(festival) {
        let latLng = null;
        
        // Vérification des coordonnées dans le champ ACF geolocalisation
        if (festival.geolocalisation && 
            typeof festival.geolocalisation === 'object' && 
            festival.geolocalisation.lat && 
            festival.geolocalisation.lng) {
            latLng = [festival.geolocalisation.lat, festival.geolocalisation.lng];
            console.log("Coordonnées trouvées dans ACF geolocalisation:", latLng);
        } 
        // Aucune coordonnée valide trouvée
        else {
            console.warn('Festival sans coordonnées valides:', festival);
            return null;
        }
        
        // Vérification que les coordonnées sont dans une plage raisonnable pour la France
        if (!this.isValidFrenchCoordinate(latLng[0], latLng[1])) {
            console.warn('Festival avec coordonnées hors de France:', latLng);
            return null;
        }
        
        // Création de l'icône
        let icon;
        try {
            // Vérifier si la configuration des icônes est disponible
            if (this.markersConfig && this.markersConfig.defaultIcon && this.markersConfig.defaultIcon.iconUrl) {
                icon = L.icon(this.markersConfig.defaultIcon);
                console.log("Icône créée avec succès:", this.markersConfig.defaultIcon);
            } else {
                // Utiliser une icône par défaut si la configuration n'est pas disponible
                console.warn("Configuration d'icône non disponible, utilisation de l'icône par défaut");
                icon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
            }
        } catch (error) {
            console.error("Erreur lors de la création de l'icône:", error);
            // Utiliser l'icône par défaut de Leaflet en cas d'erreur
            icon = new L.Icon.Default();
        }
        
        // Création du marqueur
        const marker = L.marker(latLng, { icon });
        
        // Ajout des données du festival au marqueur
        marker.festivalData = festival;
        
        // Création du contenu de la popup
        const popupContent = this.createPopupContent(festival);
        marker.bindPopup(popupContent);
        
        return marker;
    }

    /**
     * Vérifie si les coordonnées sont dans une plage raisonnable pour la France métropolitaine
     * @param {Number} lat - Latitude
     * @param {Number} lng - Longitude
     * @returns {Boolean} - true si les coordonnées sont valides
     */
    isValidFrenchCoordinate(lat, lng) {
        // Limites approximatives de la France métropolitaine
        const minLat = 41.0;
        const maxLat = 51.5;
        const minLng = -5.5;
        const maxLng = 10.0;
        
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    }

    /**
     * Crée le contenu HTML de la popup pour un festival
     * @param {Object} festival - Données du festival
     * @returns {String} Contenu HTML de la popup
     */
    createPopupContent(festival) {
        let content = `<div class="festival-popup">
            <h3 class="festival-popup-title">${festival.title || 'Festival sans nom'}</h3>`;
            
        // Ajout des informations supplémentaires dans une section info
        content += `<div class="festival-popup-info">`;
        
        if (festival.commune) {
            content += `<div class="info-item">
                <i class="info-icon location-icon"></i>
                <span>${festival.commune}</span>
            </div>`;
        }
        
        if (festival.departement && festival.region) {
            content += `<div class="info-item">
                <i class="info-icon region-icon"></i>
                <span>${festival.departement}, ${festival.region}</span>
            </div>`;
        }
        
        if (festival.adresse_complete) {
            content += `<div class="info-item">
                <i class="info-icon address-icon"></i>
                <span>${festival.adresse_complete}</span>
            </div>`;
        }
        
        if (festival.sous_categorie_musique) {
            content += `<div class="info-item">
                <i class="info-icon music-icon"></i>
                <span>${festival.sous_categorie_musique}</span>
            </div>`;
        }
        
        if (festival.periode_principale) {
            content += `<div class="info-item">
                <i class="info-icon calendar-icon"></i>
                <span>${festival.periode_principale}</span>
            </div>`;
        }
        
        content += `</div>`;
        
        // Ajout du bouton de détails
        content += `<div class="festival-popup-footer">
            <a href="${festival.permalink}" class="popup-details-btn">Voir détails</a>
        </div>`;
        
        content += `</div>`;
        
        return content;
    }

    /**
     * Affiche les festivals sur la carte
     * @param {Array} festivals - Liste des festivals à afficher
     */
    displayFestivals(festivals) {
        // Sauvegarde des festivals
        this.festivals = festivals;
        
        // Suppression des marqueurs existants
        this.clearMarkers();
        
        // Création des nouveaux marqueurs
        const markers = festivals
            .map(festival => this.createMarker(festival))
            .filter(marker => marker !== null);
        
        // Ajout des marqueurs au groupe de clusters
        this.markerClusterGroup.addLayers(markers);
        this.markers = markers;
        
        // Ajustement de la vue pour voir tous les marqueurs, mais seulement si on a des marqueurs valides
        if (markers.length > 0) {
            try {
                // Création d'un groupe de marqueurs pour calculer les limites
                const group = L.featureGroup(markers);
                const bounds = group.getBounds();
                
                // Vérification que les limites sont raisonnables pour la France
                const franceBounds = L.latLngBounds(
                    L.latLng(41.0, -5.5),  // Sud-Ouest de la France
                    L.latLng(51.5, 10.0)   // Nord-Est de la France
                );
                
                // Si les limites sont trop grandes ou hors de France, on utilise les limites de la France
                if (!franceBounds.contains(bounds) || bounds.getSouthWest().distanceTo(bounds.getNorthEast()) > 1500000) {
                    console.warn('Limites des marqueurs hors de France ou trop grandes, utilisation des limites par défaut');
                    this.map.setView(this.mapConfig.center, this.mapConfig.zoom);
                } else {
                    // Sinon on utilise les limites des marqueurs
                    this.map.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 10 // Limitation du zoom automatique pour éviter un zoom trop important
                    });
                }
            } catch (error) {
                console.error('Erreur lors de l\'ajustement de la vue:', error);
                this.map.setView(this.mapConfig.center, this.mapConfig.zoom);
            }
        } else {
            // Si aucun marqueur, on revient à la vue par défaut de la France
            this.map.setView(this.mapConfig.center, this.mapConfig.zoom);
        }
        
        return markers;
    }

    /**
     * Supprime tous les marqueurs de la carte
     */
    clearMarkers() {
        if (this.markerClusterGroup) {
            this.markerClusterGroup.clearLayers();
        }
        this.markers = [];
    }

    /**
     * Filtre les festivals affichés sur la carte
     * @param {Function} filterFn - Fonction de filtrage
     */
    filterFestivals(filterFn) {
        const filteredFestivals = this.festivals.filter(filterFn);
        this.displayFestivals(filteredFestivals);
        return filteredFestivals;
    }
}

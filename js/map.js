/**
 * Module de gestion de la carte Leaflet
 */
class FestivalsMap {
    constructor(config) {
        this.config = config;
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
        // Création de la carte avec des options supplémentaires
        this.map = L.map(elementId, {
            center: this.config.map.center,
            zoom: this.config.map.zoom,
            maxZoom: this.config.map.maxZoom,
            minZoom: this.config.map.minZoom,
            zoomControl: false, // Désactivation du contrôle de zoom par défaut pour le remplacer
            doubleClickZoom: true, // Activation du zoom par double-clic
            scrollWheelZoom: true, // Activation du zoom par molette
            dragging: true, // Activation du déplacement de la carte
            tap: true // Activation du tap sur mobile
        });

        // Ajout du fond de carte
        L.tileLayer(this.config.map.tileLayer, {
            attribution: this.config.map.attribution,
            maxZoom: this.config.map.maxZoom,
            minZoom: this.config.map.minZoom
        }).addTo(this.map);

        // Ajout du contrôle de zoom à une position spécifique
        L.control.zoom({
            position: 'topright',
            zoomInTitle: 'Zoomer',
            zoomOutTitle: 'Dézoomer'
        }).addTo(this.map);

        // Initialisation du groupe de clusters de marqueurs
        this.markerClusterGroup = L.markerClusterGroup(this.config.markers.cluster);
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

        return this.map;
    }

    /**
     * Crée un marqueur pour un festival
     * @param {Object} festival - Données du festival
     * @returns {Object} Marqueur Leaflet
     */
    createMarker(festival) {
        // Vérification des coordonnées
        if (!festival.geometry || !festival.geometry.coordinates) {
            console.warn('Festival sans coordonnées:', festival);
            return null;
        }

        const coords = festival.geometry.coordinates;
        // Les coordonnées dans l'API sont inversées (longitude, latitude)
        const latLng = [coords[1], coords[0]];
        
        // Création de l'icône
        const icon = L.icon(this.config.markers.defaultIcon);
        
        // Création du marqueur
        const marker = L.marker(latLng, { icon });
        
        // Ajout des données du festival au marqueur
        marker.festivalData = festival;
        
        // Création du contenu de la popup
        const popupContent = this.createPopupContent(festival);
        marker.bindPopup(popupContent);
        
        // Ajout d'un événement au clic sur le marqueur
        marker.on('click', (e) => {
            this.onMarkerClick(e.target.festivalData);
        });
        
        return marker;
    }

    /**
     * Crée le contenu HTML de la popup pour un festival
     * @param {Object} festival - Données du festival
     * @returns {String} Contenu HTML de la popup
     */
    createPopupContent(festival) {
        const fields = festival.fields;
        
        let content = `<div class="festival-popup">
            <h3>${fields.nom_du_festival || 'Festival sans nom'}</h3>`;
            
        if (fields.commune_principale_de_deroulement) {
            content += `<p><strong>Lieu:</strong> ${fields.commune_principale_de_deroulement}</p>`;
        }
        
        if (fields.departement_principal_de_deroulement) {
            content += `<p><strong>Département:</strong> ${fields.departement_principal_de_deroulement}</p>`;
        }
        
        if (fields.periode_principale_de_deroulement_du_festival) {
            content += `<p><strong>Période:</strong> ${fields.periode_principale_de_deroulement_du_festival}</p>`;
        }
        
        content += `<button class="popup-details-btn" onclick="showFestivalDetails('${festival.recordid}')">Voir détails</button>
        </div>`;
        
        return content;
    }

    /**
     * Gère le clic sur un marqueur
     * @param {Object} festival - Données du festival
     */
    onMarkerClick(festival) {
        // Cette fonction peut être remplacée par une fonction personnalisée
        console.log('Festival cliqué:', festival);
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
        
        // Ajustement de la vue pour voir tous les marqueurs
        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            this.map.fitBounds(group.getBounds(), {
                padding: [50, 50],
                maxZoom: 10 // Limitation du zoom automatique pour éviter un zoom trop important
            });
        } else {
            // Si aucun marqueur, on revient à la vue par défaut de la France
            this.map.setView(this.config.map.center, this.config.map.zoom);
        }
        
        return markers;
    }

    /**
     * Supprime tous les marqueurs de la carte
     */
    clearMarkers() {
        this.markerClusterGroup.clearLayers();
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

    /**
     * Centre la carte sur un festival spécifique
     * @param {String} festivalId - ID du festival
     */
    focusOnFestival(festivalId) {
        const festival = this.festivals.find(f => f.recordid === festivalId);
        
        if (festival && festival.geometry && festival.geometry.coordinates) {
            const coords = festival.geometry.coordinates;
            this.map.setView([coords[1], coords[0]], 13);
            
            // Recherche du marqueur correspondant
            const marker = this.markers.find(m => m.festivalData.recordid === festivalId);
            if (marker) {
                marker.openPopup();
            }
        }
    }
}

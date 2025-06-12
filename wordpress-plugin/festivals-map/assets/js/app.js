/**
 * Application principale pour la carte des festivals
 */
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si l'objet CONFIG est disponible
    if (typeof CONFIG === 'undefined') {
        console.error("L'objet CONFIG n'est pas défini. Vérifiez que le fichier config.js est bien chargé avant app.js.");
        return;
    }
    
    console.log("Configuration chargée:", CONFIG);
    
    // Initialisation des composants
    const api = new FestivalsAPI(CONFIG);
    const map = new FestivalsMap(CONFIG);
    
    // Variables globales
    let allFestivals = [];
    let filteredFestivals = [];
    
    // Éléments DOM
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const regionFilter = document.getElementById('region-filter');
    const departementFilter = document.getElementById('departement-filter');
    const genreFilter = document.getElementById('genre-filter');
    const periodFilter = document.getElementById('period-filter');
    const festivalsContainer = document.getElementById('festivals-container');
    const festivalDetails = document.getElementById('festival-details');
    const festivalDetailsContent = document.getElementById('festival-details-content');
    const closeDetailsButton = document.getElementById('close-details');
    const loadingIndicator = document.getElementById('loading-indicator');
    const loadingCount = document.getElementById('loading-count');
    
    // Vérification de l'existence du conteneur de carte
    const mapContainer = document.getElementById('festivals-map');
    if (!mapContainer) {
        console.error("Conteneur de carte 'festivals-map' non trouvé dans le DOM");
    } else {
        console.log("Conteneur de carte trouvé:", mapContainer);
        
        // Initialisation de la carte
        map.initMap('festivals-map');
        
        // Fonction pour afficher l'indicateur de chargement
        function showLoading(message = 'Chargement des festivals en cours...') {
            loadingIndicator.style.display = 'flex';
            document.querySelector('.loading-text').textContent = message;
            loadingCount.textContent = '';
        }
        
        // Fonction pour masquer l'indicateur de chargement
        function hideLoading() {
            loadingIndicator.style.display = 'none';
        }
        
        // Fonction pour mettre à jour le compteur de chargement
        function updateLoadingCount(count, total) {
            loadingCount.textContent = `${count} sur ${total} festivals chargés`;
        }
        
        // Fonction pour charger les festivals
        async function loadFestivals() {
            try {
                // Affichage de l'indicateur de chargement
                showLoading();
                
                // Affichage d'un message de chargement dans la liste
                if (festivalsContainer) {
                    festivalsContainer.innerHTML = '<p>Chargement des festivals...</p>';
                }
                
                console.log("Début de l'appel API...");
                
                // Récupération des festivals depuis l'API
                const startTime = Date.now();
                const data = await api.getFestivals({ rows: 8000 });
                const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
                
                console.log("Réponse API reçue:", data);
                console.log("Nombre de festivals reçus:", data.records ? data.records.length : 0);
                
                if (!data.records || data.records.length === 0) {
                    console.error("Aucun festival reçu de l'API");
                    if (festivalsContainer) {
                        festivalsContainer.innerHTML = '<p>Aucun festival trouvé. Vérifiez la connexion à l\'API.</p>';
                    }
                    hideLoading();
                    return;
                }
                
                allFestivals = data.records;
                filteredFestivals = allFestivals;
                
                // Vérification des coordonnées des festivals
                const festivalsWithCoords = allFestivals.filter(festival => 
                    festival.fields.coordonnees_geo && 
                    Array.isArray(festival.fields.coordonnees_geo) && 
                    festival.fields.coordonnees_geo.length === 2
                );
                
                console.log(`${festivalsWithCoords.length} festivals sur ${allFestivals.length} ont des coordonnées valides`);
                
                // Mise à jour du message de chargement
                updateLoadingCount(allFestivals.length, allFestivals.length);
                showLoading(`Affichage de ${allFestivals.length} festivals sur la carte...`);
                
                // Affichage des festivals sur la carte
                map.displayFestivals(allFestivals);
                
                // Affichage des festivals dans la liste
                if (festivalsContainer) {
                    displayFestivalsList(allFestivals);
                }
                
                // Remplissage des filtres
                populateFilters(allFestivals);
                
                console.log(`${allFestivals.length} festivals chargés en ${loadTime} secondes`);
                
                // Masquage de l'indicateur de chargement
                hideLoading();
            } catch (error) {
                console.error('Erreur lors du chargement des festivals:', error);
                if (festivalsContainer) {
                    festivalsContainer.innerHTML = '<p>Erreur lors du chargement des festivals. Veuillez réessayer.</p>';
                }
                hideLoading();
            }
        }
        
        // Fonction pour afficher la liste des festivals
        function displayFestivalsList(festivals) {
            if (festivals.length === 0) {
                festivalsContainer.innerHTML = '<p>Aucun festival trouvé.</p>';
                return;
            }
            
            festivalsContainer.innerHTML = '';
            
            festivals.forEach(festival => {
                const fields = festival.fields;
                const card = document.createElement('div');
                card.className = 'festival-card';
                card.dataset.id = festival.recordid;
                
                card.innerHTML = `
                    <h3>${fields.nom_du_festival || 'Festival sans nom'}</h3>
                    <p><strong>Lieu:</strong> ${fields.commune_principale_de_deroulement || 'Non spécifié'}</p>
                    <p><strong>Département:</strong> ${fields.departement_principal_de_deroulement || 'Non spécifié'}</p>
                    <p><strong>Période:</strong> ${fields.periode_principale_de_deroulement_du_festival || 'Non spécifiée'}</p>
                `;
                
                card.addEventListener('click', () => {
                    showFestivalDetails(festival.recordid);
                });
                
                festivalsContainer.appendChild(card);
            });
        }
        
        // Fonction pour remplir les filtres avec les valeurs disponibles
        function populateFilters(festivals) {
            // Extraction des valeurs uniques pour chaque filtre
            const regions = api.extractUniqueValues(festivals, 'region_principale_de_deroulement');
            const departements = api.extractUniqueValues(festivals, 'departement_principal_de_deroulement');
            const genres = api.extractUniqueValues(festivals, 'sous_categorie_musique');
            
            // Remplissage du filtre de région
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                regionFilter.appendChild(option);
            });
            
            // Remplissage du filtre de département
            departements.forEach(departement => {
                const option = document.createElement('option');
                option.value = departement;
                option.textContent = departement;
                departementFilter.appendChild(option);
            });
            
            // Remplissage du filtre de genre
            genres.forEach(genre => {
                if (genre) {
                    const option = document.createElement('option');
                    option.value = genre;
                    option.textContent = genre;
                    genreFilter.appendChild(option);
                }
            });
        }
        
        // Fonction pour appliquer les filtres
        function applyFilters() {
            // Affichage de l'indicateur de chargement
            showLoading('Application des filtres...');
            
            const searchTerm = searchInput.value.toLowerCase().trim();
            const region = regionFilter.value;
            const departement = departementFilter.value;
            const genre = genreFilter.value;
            const period = periodFilter.value;
            
            filteredFestivals = allFestivals.filter(festival => {
                const fields = festival.fields;
                
                // Filtre par terme de recherche
                const matchesSearch = !searchTerm || 
                    (fields.nom_du_festival && fields.nom_du_festival.toLowerCase().includes(searchTerm)) ||
                    (fields.commune_principale_de_deroulement && fields.commune_principale_de_deroulement.toLowerCase().includes(searchTerm));
                
                // Filtre par région
                const matchesRegion = !region || 
                    (fields.region_principale_de_deroulement === region);
                
                // Filtre par département
                const matchesDepartement = !departement || 
                    (fields.departement_principal_de_deroulement === departement);
                
                // Filtre par genre
                const matchesGenre = !genre || 
                    (fields.sous_categorie_musique && fields.sous_categorie_musique.includes(genre));
                
                // Filtre par période
                const matchesPeriod = !period || 
                    (fields.periode_principale_de_deroulement_du_festival === period);
                
                return matchesSearch && matchesRegion && matchesDepartement && matchesGenre && matchesPeriod;
            });
            
            // Mise à jour de la carte et de la liste
            map.displayFestivals(filteredFestivals);
            displayFestivalsList(filteredFestivals);
            
            // Masquage de l'indicateur de chargement
            hideLoading();
        }
        
        // Fonction pour afficher les détails d'un festival
        window.showFestivalDetails = function(festivalId) {
            const festival = allFestivals.find(f => f.recordid === festivalId);
            
            if (!festival) {
                console.error('Festival non trouvé:', festivalId);
                return;
            }
            
            const fields = festival.fields;
            
            // Construction du contenu HTML des détails
            let content = `<h2>${fields.nom_du_festival || 'Festival sans nom'}</h2>`;
            
            // Informations de base
            content += `<div class="detail-group"><strong>Lieu:</strong> ${fields.commune_principale_de_deroulement || 'Non spécifié'}</div>`;
            content += `<div class="detail-group"><strong>Département:</strong> ${fields.departement_principal_de_deroulement || 'Non spécifié'}</div>`;
            content += `<div class="detail-group"><strong>Région:</strong> ${fields.region_principale_de_deroulement || 'Non spécifiée'}</div>`;
            content += `<div class="detail-group"><strong>Période:</strong> ${fields.periode_principale_de_deroulement_du_festival || 'Non spécifiée'}</div>`;
            
            // Informations supplémentaires
            if (fields.annee_de_creation_du_festival) {
                content += `<div class="detail-group"><strong>Année de création:</strong> ${fields.annee_de_creation_du_festival}</div>`;
            }
            
            if (fields.sous_categorie_musique) {
                content += `<div class="detail-group"><strong>Genre musical:</strong> ${fields.sous_categorie_musique}</div>`;
            }
            
            if (fields.site_internet_du_festival) {
                let website = fields.site_internet_du_festival;
                if (!website.startsWith('http')) {
                    website = 'https://' + website;
                }
                content += `<div class="detail-group"><strong>Site web:</strong> <a href="${website}" target="_blank">${fields.site_internet_du_festival}</a></div>`;
            }
            
            if (fields.adresse_e_mail) {
                content += `<div class="detail-group"><strong>Email:</strong> <a href="mailto:${fields.adresse_e_mail}">${fields.adresse_e_mail}</a></div>`;
            }
            
            // Bouton pour centrer la carte sur le festival
            content += `<button class="focus-on-map-btn" onclick="focusOnFestival('${festivalId}')">Voir sur la carte</button>`;
            
            // Affichage des détails
            festivalDetailsContent.innerHTML = content;
            festivalDetails.classList.add('active');
            
            // Ajout d'un overlay pour le fond
            const overlay = document.createElement('div');
            overlay.className = 'overlay active';
            document.body.appendChild(overlay);
            
            // Fermeture des détails lors du clic sur l'overlay
            overlay.addEventListener('click', closeDetails);
        };
        
        // Fonction pour centrer la carte sur un festival
        window.focusOnFestival = function(festivalId) {
            map.focusOnFestival(festivalId);
            closeDetails();
        };
        
        // Fonction pour fermer les détails d'un festival
        function closeDetails() {
            festivalDetails.classList.remove('active');
            
            // Suppression de l'overlay
            const overlay = document.querySelector('.overlay');
            if (overlay) {
                overlay.remove();
            }
        }
        
        // Fonction pour rechercher un festival spécifique par nom
        window.searchFestival = function(name) {
            searchInput.value = name;
            applyFilters();
        };
        
        // Événements
        searchButton.addEventListener('click', applyFilters);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
        
        regionFilter.addEventListener('change', applyFilters);
        departementFilter.addEventListener('change', applyFilters);
        genreFilter.addEventListener('change', applyFilters);
        periodFilter.addEventListener('change', applyFilters);
        
        closeDetailsButton.addEventListener('click', closeDetails);
        
        // Chargement initial des festivals
        loadFestivals();
    }
});

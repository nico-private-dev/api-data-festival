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
    const villeFilter = document.getElementById('ville-filter');
    const genreFilter = document.getElementById('genre-filter');
    const periodFilter = document.getElementById('period-filter');
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
                
                console.log("Début de l'appel API...");
                
                // Récupération des festivals depuis l'API WordPress
                const startTime = Date.now();
                const data = await api.getFestivals();
                const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
                
                console.log("Réponse API reçue:", data);
                console.log("Nombre de festivals reçus:", data.records ? data.records.length : 0);
                
                if (!data.records || data.records.length === 0) {
                    console.error("Aucun festival reçu de l'API");
                    hideLoading();
                    return;
                }
                
                allFestivals = data.records;
                filteredFestivals = allFestivals;
                
                // Vérification des coordonnées des festivals
                const festivalsWithCoords = allFestivals.filter(festival => 
                    festival.geolocalisation && 
                    typeof festival.geolocalisation === 'object' && 
                    festival.geolocalisation.lat && 
                    festival.geolocalisation.lng
                );
                
                console.log(`${festivalsWithCoords.length} festivals sur ${allFestivals.length} ont des coordonnées valides`);
                
                // Mise à jour du message de chargement
                updateLoadingCount(allFestivals.length, allFestivals.length);
                showLoading(`Affichage de ${allFestivals.length} festivals sur la carte...`);
                
                // Affichage des festivals sur la carte
                map.displayFestivals(allFestivals);
                
                // Remplissage des filtres
                populateFilters(allFestivals);
                
                console.log(`${allFestivals.length} festivals chargés en ${loadTime} secondes`);
                
                // Masquage de l'indicateur de chargement
                hideLoading();
            } catch (error) {
                console.error('Erreur lors du chargement des festivals:', error);
                hideLoading();
            }
        }
        
        // Fonction pour remplir les filtres avec les valeurs disponibles
        function populateFilters(festivals) {
            // Extraction des valeurs uniques pour chaque filtre en utilisant les bons champs ACF
            const regions = api.extractUniqueValues(festivals, 'region');
            const departements = api.extractUniqueValues(festivals, 'departement');
            const villes = api.extractUniqueValues(festivals, 'commune');
            const genresMusicaux = api.extractUniqueValues(festivals, 'sous_categorie_musique');
            const periodes = api.extractUniqueValues(festivals, 'periode_principale');
            
            console.log("Valeurs de région trouvées:", regions);
            console.log("Valeurs de département trouvées:", departements);
            console.log("Valeurs de ville trouvées:", villes);
            console.log("Valeurs de genre musical trouvées:", genresMusicaux);
            console.log("Valeurs de période trouvées:", periodes);
            
            // Remplissage du filtre de région
            regions.forEach(region => {
                if (region) {
                    const option = document.createElement('option');
                    option.value = region;
                    option.textContent = region;
                    regionFilter.appendChild(option);
                }
            });
            
            // Remplissage du filtre de département
            departements.forEach(departement => {
                if (departement) {
                    const option = document.createElement('option');
                    option.value = departement;
                    option.textContent = departement;
                    departementFilter.appendChild(option);
                }
            });
            
            // Remplissage du filtre de ville
            villes.forEach(ville => {
                if (ville) {
                    const option = document.createElement('option');
                    option.value = ville;
                    option.textContent = ville;
                    villeFilter.appendChild(option);
                }
            });
            
            // Remplissage du filtre de genre musical
            genresMusicaux.forEach(genre => {
                if (genre) {
                    const option = document.createElement('option');
                    option.value = genre;
                    option.textContent = genre;
                    genreFilter.appendChild(option);
                }
            });
            
            // Remplissage du filtre de période
            // On garde les options statiques définies dans le HTML pour les périodes
            // mais on ajoute aussi les valeurs dynamiques si elles sont différentes
            const existingPeriodes = Array.from(periodFilter.options).map(opt => opt.value);
            
            periodes.forEach(periode => {
                if (periode && !existingPeriodes.includes(periode)) {
                    const option = document.createElement('option');
                    option.value = periode;
                    option.textContent = periode;
                    periodFilter.appendChild(option);
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
            const ville = villeFilter.value;
            const genre = genreFilter.value;
            const periode = periodFilter.value;
            
            filteredFestivals = allFestivals.filter(festival => {
                // Filtre par terme de recherche
                const matchesSearch = !searchTerm || 
                    (festival.title && festival.title.toLowerCase().includes(searchTerm)) ||
                    (festival.commune && festival.commune.toLowerCase().includes(searchTerm));
                
                // Filtre par région
                const matchesRegion = !region || 
                    (festival.region === region);
                
                // Filtre par département
                const matchesDepartement = !departement || 
                    (festival.departement === departement);
                
                // Filtre par ville
                const matchesVille = !ville || 
                    (festival.commune === ville);
                
                // Filtre par genre musical
                const matchesGenre = !genre || 
                    (festival.sous_categorie_musique === genre);
                
                // Filtre par période
                const matchesPeriode = !periode || 
                    (festival.periode_principale === periode);
                
                return matchesSearch && matchesRegion && matchesDepartement && matchesVille && matchesGenre && matchesPeriode;
            });
            
            console.log(`Filtres appliqués: ${filteredFestivals.length} festivals correspondent aux critères`);
            
            // Mise à jour de la carte
            map.displayFestivals(filteredFestivals);
            
            // Masquage de l'indicateur de chargement
            hideLoading();
        }
        
        // Événements
        searchButton.addEventListener('click', applyFilters);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
        
        regionFilter.addEventListener('change', applyFilters);
        departementFilter.addEventListener('change', applyFilters);
        villeFilter.addEventListener('change', applyFilters);
        genreFilter.addEventListener('change', applyFilters);
        periodFilter.addEventListener('change', applyFilters);
        
        // Chargement initial des festivals
        loadFestivals();
    }
});

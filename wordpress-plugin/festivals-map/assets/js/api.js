/**
 * Module de gestion des appels à l'API WordPress pour les festivals
 */
class FestivalsAPI {
    constructor(config) {
        this.config = config;
        
        // Débogage - Vérifier que les variables sont définies
        console.log("Initialisation de FestivalsAPI");
        console.log("festivals_map_vars défini:", typeof festivals_map_vars !== 'undefined');
        if (typeof festivals_map_vars !== 'undefined') {
            console.log("ajaxurl:", festivals_map_vars.ajaxurl);
            console.log("nonce:", festivals_map_vars.nonce);
        }
    }

    /**
     * Récupère les festivals depuis WordPress (CPT festivals)
     * @param {Object} params - Paramètres pour la requête
     * @returns {Promise} Promise contenant les données des festivals
     */
    async getFestivals(params = {}) {
        try {
            // Vérifier si nous sommes dans WordPress (variable festivals_map_vars définie)
            if (typeof festivals_map_vars === 'undefined') {
                console.error("Variable festivals_map_vars non définie. Ce script doit être exécuté dans WordPress.");
                return { records: [] };
            }

            console.log("Récupération des festivals depuis WordPress (CPT)");
            
            // Créer l'URL pour récupérer les festivals depuis WordPress
            const proxyUrl = `${festivals_map_vars.ajaxurl}?action=get_festivals_data&nonce=${festivals_map_vars.nonce}`;
            console.log("URL de l'API:", proxyUrl);
            
            // Ajout des paramètres de filtrage si nécessaires
            const searchParams = new URLSearchParams();
            
            if (params.query) {
                searchParams.append('search', params.query);
            }
            
            if (params.filters) {
                Object.entries(params.filters).forEach(([key, value]) => {
                    if (value) {
                        searchParams.append(key, value);
                    }
                });
            }
            
            // Ajout des paramètres à l'URL
            const finalUrl = searchParams.toString() 
                ? `${proxyUrl}&${searchParams.toString()}` 
                : proxyUrl;
            
            console.log("URL finale de l'API:", finalUrl);
            
            const response = await fetch(finalUrl);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("Réponse brute de l'API:", result);
            
            if (result.success) {
                // Transformation des données pour qu'elles soient compatibles avec le format attendu
                return {
                    nhits: result.data.length,
                    records: result.data
                };
            } else {
                throw new Error('Erreur dans la réponse: ' + (result.message || 'Erreur inconnue'));
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des festivals:', error);
            throw error;
        }
    }

    /**
     * Récupère tous les festivals
     * @param {Object} params - Paramètres pour la requête
     * @returns {Promise} Promise contenant tous les festivals
     */
    async getAllFestivals(params = {}) {
        // Avec le CPT, nous n'avons pas besoin de pagination car WordPress gère déjà cela
        return this.getFestivals(params);
    }

    /**
     * Extrait les valeurs uniques pour un champ donné
     * @param {Array} records - Liste des enregistrements de festivals
     * @param {String} fieldName - Nom du champ à extraire
     * @returns {Array} Liste des valeurs uniques
     */
    extractUniqueValues(records, fieldName) {
        const values = records
            .map(record => record[fieldName])
            .filter(value => value !== undefined && value !== null && value !== '');
        
        return [...new Set(values)].sort();
    }
}

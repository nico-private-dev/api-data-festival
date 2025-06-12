/**
 * Module de gestion des appels à l'API des festivals
 */
class FestivalsAPI {
    constructor(config) {
        this.baseUrl = config.api.baseUrl;
        this.dataset = config.api.dataset;
        this.defaultParams = config.api.defaultParams;
    }

    /**
     * Construit l'URL de l'API avec les paramètres
     * @param {Object} params - Paramètres additionnels pour la requête
     * @returns {String} URL complète pour la requête API
     */
    buildUrl(params = {}) {
        // URL de base avec le dataset
        let url = `${this.baseUrl}?dataset=${this.dataset}`;
        
        // Ajout du nombre de résultats
        if (params.rows || this.defaultParams.rows) {
            url += `&rows=${params.rows || this.defaultParams.rows}`;
        }
        
        // Ajout du paramètre de départ (pour la pagination)
        if (params.start) {
            url += `&start=${params.start}`;
        }
        
        // Ajout des filtres de discipline dominante
        if (this.defaultParams.refine && this.defaultParams.refine.discipline_dominante) {
            url += `&refine.discipline_dominante=${encodeURIComponent(this.defaultParams.refine.discipline_dominante)}`;
        }
        
        // Ajout des filtres supplémentaires
        if (params.filters) {
            Object.entries(params.filters).forEach(([key, value]) => {
                if (value) {
                    url += `&refine.${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                }
            });
        }
        
        // Ajout d'un terme de recherche
        if (params.query) {
            url += `&q=${encodeURIComponent(params.query)}`;
        }
        
        return url;
    }

    /**
     * Récupère les festivals depuis l'API
     * @param {Object} params - Paramètres pour la requête
     * @returns {Promise} Promise contenant les données des festivals
     */
    async getFestivals(params = {}) {
        try {
            const url = this.buildUrl(params);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erreur lors de la récupération des festivals:', error);
            throw error;
        }
    }

    /**
     * Récupère tous les festivals avec pagination
     * @param {Object} params - Paramètres pour la requête
     * @returns {Promise} Promise contenant tous les festivals
     */
    async getAllFestivals(params = {}) {
        try {
            // Première requête pour obtenir le nombre total de festivals
            const initialData = await this.getFestivals({ ...params, rows: 1 });
            const totalCount = initialData.nhits;
            const rowsPerRequest = params.rows || this.defaultParams.rows || 100;
            const requests = [];
            
            // Calcul du nombre de requêtes nécessaires
            const requestCount = Math.ceil(totalCount / rowsPerRequest);
            
            // Création des requêtes pour chaque page
            for (let i = 0; i < requestCount; i++) {
                const start = i * rowsPerRequest;
                requests.push(this.getFestivals({ ...params, start, rows: rowsPerRequest }));
            }
            
            // Exécution de toutes les requêtes en parallèle
            const results = await Promise.all(requests);
            
            // Fusion des résultats
            const allRecords = results.flatMap(result => result.records || []);
            
            return {
                nhits: totalCount,
                records: allRecords
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de tous les festivals:', error);
            throw error;
        }
    }

    /**
     * Extrait les valeurs uniques pour un champ donné
     * @param {Array} records - Liste des enregistrements de festivals
     * @param {String} fieldName - Nom du champ à extraire
     * @returns {Array} Liste des valeurs uniques
     */
    extractUniqueValues(records, fieldName) {
        const values = records
            .map(record => record.fields && record.fields[fieldName])
            .filter(value => value !== undefined && value !== null);
        
        return [...new Set(values)].sort();
    }
}

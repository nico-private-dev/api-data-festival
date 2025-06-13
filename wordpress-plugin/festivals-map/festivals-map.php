<?php
/**
 * Plugin Name: Carte des Festivals de Musique
 * Plugin URI: https://votre-site.com/plugins/festivals-map
 * Description: Intègre une carte interactive des festivals de musique en France sur votre site WordPress.
 * Version: 1.0.0
 * Author: Nicolas F
 * Author URI: https://votre-site.com
 * Text Domain: festivals-map
 * Domain Path: /languages
 */

// Si ce fichier est appelé directement, on sort
if (!defined('ABSPATH')) {
    exit;
}

// Définition des constantes
define('FESTIVALS_MAP_VERSION', '1.0.0');
define('FESTIVALS_MAP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('FESTIVALS_MAP_PLUGIN_URL', plugin_dir_url(__FILE__));

// Inclusion des fichiers nécessaires
require_once FESTIVALS_MAP_PLUGIN_DIR . 'includes/post-types.php';

/**
 * Classe principale du plugin
 */
class FestivalsMap {
    /**
     * Instance unique de la classe
     */
    private static $instance = null;

    /**
     * Constructeur
     */
    private function __construct() {
        // Enregistrement des hooks
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('festivals_map', array($this, 'map_shortcode'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
    }

    /**
     * Singleton pattern
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Initialisation du plugin
     */
    public function init() {
        load_plugin_textdomain('festivals-map', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Ajout du point de terminaison pour le proxy API
        add_action('wp_ajax_festivals_map_proxy', array($this, 'api_proxy'));
        add_action('wp_ajax_nopriv_festivals_map_proxy', array($this, 'api_proxy'));
        
        // Ajout du point de terminaison pour récupérer les données des festivals (CPT)
        add_action('wp_ajax_get_festivals_data', array($this, 'get_festivals_data'));
        add_action('wp_ajax_nopriv_get_festivals_data', array($this, 'get_festivals_data'));
    }
    
    /**
     * Proxy pour les appels API
     */
    public function api_proxy() {
        // Vérification de sécurité
        check_ajax_referer('festivals_map_nonce', 'nonce');
        
        // Récupération de l'URL à appeler
        $url = isset($_GET['url']) ? esc_url_raw($_GET['url']) : '';
        
        if (empty($url)) {
            wp_send_json_error('URL manquante');
            return;
        }
        
        // Appel à l'API externe
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body);
        
        wp_send_json_success($data);
    }

    /**
     * Récupère les données des festivals (CPT) pour la carte
     */
    public function get_festivals_data() {
        // Vérification de sécurité
        check_ajax_referer('festivals_map_nonce', 'nonce');
        
        // Débogage: vérifier si le CPT 'festival' existe
        $post_types = get_post_types(array(), 'names');
        error_log('Types de posts disponibles: ' . print_r($post_types, true));
        
        // Si le CPT 'festival' n'existe pas, créons un festival de test
        if (!in_array('festival', $post_types)) {
            error_log('Le CPT festival n\'existe pas encore. Essayons de le créer manuellement.');
            
            // Forcer l'enregistrement du CPT
            if (function_exists('festivals_map_register_post_types')) {
                festivals_map_register_post_types();
                error_log('CPT festival enregistré manuellement.');
            }
        }
        
        // Vérifier s'il y a des festivals
        $count_posts = wp_count_posts('festival');
        error_log('Nombre total de posts du type festival avant requête: ' . print_r($count_posts, true));
        
        // Si aucun festival n'existe, créons-en un pour le test
        if (isset($count_posts->publish) && $count_posts->publish == 0) {
            error_log('Aucun festival publié trouvé. Création d\'un festival de test.');
            
            // Créer un festival de test
            $festival_test_id = wp_insert_post(array(
                'post_title'    => 'Festival de Test',
                'post_content'  => 'Ceci est un festival de test créé automatiquement.',
                'post_status'   => 'publish',
                'post_type'     => 'festival',
            ));
            
            if (!is_wp_error($festival_test_id)) {
                error_log('Festival de test créé avec ID: ' . $festival_test_id);
                
                // Ajouter les champs ACF
                if (function_exists('update_field')) {
                    update_field('geolocalisation', array('lat' => 48.856614, 'lng' => 2.3522219), $festival_test_id);
                    update_field('adresse_postale', '1 Place de l\'Hôtel de Ville, 75004 Paris', $festival_test_id);
                    update_field('commune', 'Paris', $festival_test_id);
                    error_log('Champs ACF ajoutés au festival de test.');
                } else {
                    error_log('La fonction update_field n\'existe pas. ACF n\'est peut-être pas activé.');
                }
            } else {
                error_log('Erreur lors de la création du festival de test: ' . $festival_test_id->get_error_message());
            }
        }
        
        $args = array(
            'post_type'      => 'festival',
            'post_status'    => 'publish',
            'posts_per_page' => -1, // Récupérer tous les festivals
        );
        
        // Ajout de la recherche si spécifiée
        if (!empty($_GET['search'])) {
            $args['s'] = sanitize_text_field($_GET['search']);
        }
        
        // Ajout des filtres ACF si nécessaire
        $meta_query = array();
        
        // Exemple: filtre par commune
        if (!empty($_GET['commune'])) {
            $meta_query[] = array(
                'key'     => 'commune',
                'value'   => sanitize_text_field($_GET['commune']),
                'compare' => '='
            );
        }
        
        // Ajout de la meta_query si des filtres ont été définis
        if (!empty($meta_query)) {
            $args['meta_query'] = $meta_query;
        }
        
        // Débogage: afficher les arguments de la requête
        error_log('Arguments de la requête WP_Query: ' . print_r($args, true));
        
        // Exécution de la requête
        $query = new WP_Query($args);
        
        // Débogage: afficher le nombre de posts trouvés
        error_log('Nombre de festivals trouvés: ' . $query->post_count);
        error_log('Requête SQL: ' . $query->request);
        
        // Débogage: vérifier si le CPT 'festival' a des posts
        $count_posts = wp_count_posts('festival');
        error_log('Nombre total de posts du type festival après requête: ' . print_r($count_posts, true));
        
        $festivals = array();
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                
                // Récupération des champs ACF avec les noms exacts
                $geolocalisation = get_field('geolocalisation', $post_id);
                $adresse_postale = get_field('adresse_postale', $post_id);
                $commune = get_field('commune', $post_id);
                
                // Débogage: afficher les valeurs des champs ACF
                error_log('Festival ID: ' . $post_id);
                error_log('Titre: ' . get_the_title());
                error_log('Geolocalisation brute: ' . print_r($geolocalisation, true));
                error_log('Adresse: ' . $adresse_postale);
                error_log('Commune: ' . $commune);
                
                // Traitement du champ geolocalisation pour assurer le bon format
                $geo_formatted = array();
                
                // Si c'est déjà un tableau avec lat/lng
                if (is_array($geolocalisation) && isset($geolocalisation['lat']) && isset($geolocalisation['lng'])) {
                    $geo_formatted = $geolocalisation;
                }
                // Si c'est une chaîne de caractères au format "lat, lng"
                else if (is_string($geolocalisation) && !empty($geolocalisation)) {
                    $coords = explode(',', $geolocalisation);
                    if (count($coords) >= 2) {
                        $geo_formatted = array(
                            'lat' => floatval(trim($coords[0])),
                            'lng' => floatval(trim($coords[1]))
                        );
                    }
                }
                // Si c'est un tableau numérique [lat, lng]
                else if (is_array($geolocalisation) && count($geolocalisation) >= 2 && is_numeric($geolocalisation[0]) && is_numeric($geolocalisation[1])) {
                    $geo_formatted = array(
                        'lat' => floatval($geolocalisation[0]),
                        'lng' => floatval($geolocalisation[1])
                    );
                }
                
                error_log('Geolocalisation formatée: ' . print_r($geo_formatted, true));
                
                // Création du tableau de données du festival
                $festival = array(
                    'id'               => $post_id,
                    'title'            => get_the_title(),
                    'permalink'        => get_permalink(),
                    'geolocalisation'  => $geo_formatted,
                    'adresse_complete' => $adresse_postale, // On conserve le nom adresse_complete pour la compatibilité avec le JS
                    'commune'          => $commune
                );
                
                $festivals[] = $festival;
            }
            
            wp_reset_postdata();
        } else {
            error_log('Aucun festival trouvé dans la requête WP_Query.');
        }
        
        // Débogage: afficher le nombre de festivals après traitement
        error_log('Nombre de festivals après traitement: ' . count($festivals));
        
        // Si aucun festival n'a été trouvé, créons un festival factice pour le test
        if (empty($festivals)) {
            error_log('Aucun festival trouvé. Création d\'un festival factice pour le test.');
            
            $festivals[] = array(
                'id'               => 0,
                'title'            => 'Festival de Test (Factice)',
                'permalink'        => '#',
                'geolocalisation'  => array('lat' => 48.856614, 'lng' => 2.3522219),
                'adresse_complete' => '1 Place de l\'Hôtel de Ville, 75004 Paris',
                'commune'          => 'Paris'
            );
        }
        
        wp_send_json_success($festivals);
    }

    /**
     * Enregistrement des scripts et styles
     */
    public function enqueue_scripts() {
        // Leaflet CSS
        wp_enqueue_style(
            'leaflet-css',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
            array(),
            '1.9.4'
        );

        // Leaflet MarkerCluster CSS
        wp_enqueue_style(
            'leaflet-markercluster-css',
            'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css',
            array(),
            '1.4.1'
        );
        wp_enqueue_style(
            'leaflet-markercluster-default-css',
            'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css',
            array(),
            '1.4.1'
        );

        // Plugin CSS
        wp_enqueue_style(
            'festivals-map-css',
            FESTIVALS_MAP_PLUGIN_URL . 'assets/css/style.css',
            array(),
            FESTIVALS_MAP_VERSION
        );

        // Leaflet JS
        wp_enqueue_script(
            'leaflet-js',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            array(),
            '1.9.4',
            true
        );

        // Leaflet MarkerCluster JS
        wp_enqueue_script(
            'leaflet-markercluster-js',
            'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js',
            array('leaflet-js'),
            '1.4.1',
            true
        );

        // Plugin JS
        wp_enqueue_script(
            'festivals-map-config',
            FESTIVALS_MAP_PLUGIN_URL . 'assets/js/config.js',
            array(),
            FESTIVALS_MAP_VERSION,
            true
        );
        wp_enqueue_script(
            'festivals-map-api',
            FESTIVALS_MAP_PLUGIN_URL . 'assets/js/api.js',
            array('festivals-map-config'),
            FESTIVALS_MAP_VERSION,
            true
        );
        wp_enqueue_script(
            'festivals-map-map',
            FESTIVALS_MAP_PLUGIN_URL . 'assets/js/map.js',
            array('leaflet-js', 'leaflet-markercluster-js', 'festivals-map-config'),
            FESTIVALS_MAP_VERSION,
            true
        );
        wp_enqueue_script(
            'festivals-map-app',
            FESTIVALS_MAP_PLUGIN_URL . 'assets/js/app.js',
            array('festivals-map-api', 'festivals-map-map'),
            FESTIVALS_MAP_VERSION,
            true
        );
        
        // Définir la variable ajaxurl pour le front-end
        wp_localize_script('festivals-map-api', 'festivals_map_vars', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('festivals_map_nonce')
        ));
    }

    /**
     * Shortcode pour afficher la carte
     */
    public function map_shortcode($atts) {
        // Extraction des attributs
        $atts = shortcode_atts(
            array(
                'height' => '500px',
                'width' => '100%',
                'show_filters' => 'true',
            ),
            $atts,
            'festivals_map'
        );

        // Passage des attributs au script JS
        wp_localize_script('festivals-map-app', 'festivalsMapOptions', array(
            'showFilters' => $atts['show_filters'] === 'true',
        ));

        // Début de la mise en mémoire tampon
        ob_start();

        // Indicateur de chargement
        echo '<div id="loading-indicator" class="loading-container" style="display: none;">';
        echo '<div class="loading-spinner"></div>';
        echo '<div class="loading-text">Chargement des festivals en cours...</div>';
        echo '<div class="loading-count" id="loading-count"></div>';
        echo '</div>';

        echo '<div class="festivals-map-container">';
        
        // Carte et filtres côte à côte
        echo '<div class="map-and-filters-container">';
        
        // Carte
        echo '<div class="map-container" style="height: ' . esc_attr($atts['height']) . '; width: ' . esc_attr($atts['width']) . ';">';
        echo '<div id="festivals-map" style="height: 100%; width: 100%;"></div>';
        echo '</div>';
        
        // Filtres (conditionnels)
        if ($atts['show_filters'] === 'true') {
            echo '<div class="search-filter-container">';
            echo '<div class="search-box">';
            echo '<input type="text" id="search-input" placeholder="Rechercher un festival...">';
            echo '<button id="search-button">Rechercher</button>';
            echo '</div>';
            
            echo '<div class="filters">';
            echo '<div class="filter-group">';
            echo '<label for="region-filter">Région:</label>';
            echo '<select id="region-filter">';
            echo '<option value="">Toutes les régions</option>';
            echo '</select>';
            echo '</div>';
            
            echo '<div class="filter-group">';
            echo '<label for="departement-filter">Département:</label>';
            echo '<select id="departement-filter">';
            echo '<option value="">Tous les départements</option>';
            echo '</select>';
            echo '</div>';
            
            echo '<div class="filter-group">';
            echo '<label for="genre-filter">Genre musical:</label>';
            echo '<select id="genre-filter">';
            echo '<option value="">Tous les genres</option>';
            echo '</select>';
            echo '</div>';
            
            echo '<div class="filter-group">';
            echo '<label for="period-filter">Période:</label>';
            echo '<select id="period-filter">';
            echo '<option value="">Toutes les périodes</option>';
            echo '<option value="Avant-saison (1er janvier - 20 juin)">Avant-saison (1er janvier - 20 juin)</option>';
            echo '<option value="Saison (21 juin - 5 septembre)">Saison (21 juin - 5 septembre)</option>';
            echo '<option value="Après-saison (6 septembre - 31 décembre)">Après-saison (6 septembre - 31 décembre)</option>';
            echo '</select>';
            echo '</div>';
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>'; // Fin du conteneur map-and-filters
        
        echo '</div>'; // Fin du conteneur principal

        // Récupération du contenu mis en mémoire tampon
        return ob_get_clean();
    }

    /**
     * Ajout du menu d'administration
     */
    public function add_admin_menu() {
        add_menu_page(
            __('Carte des Festivals', 'festivals-map'),
            __('Carte des Festivals', 'festivals-map'),
            'manage_options',
            'festivals-map',
            array($this, 'admin_page'),
            'dashicons-location-alt',
            30
        );
    }

    /**
     * Page d'administration
     */
    public function admin_page() {
        require_once FESTIVALS_MAP_PLUGIN_DIR . 'admin/admin-page.php';
    }
}

// Initialisation du plugin
function festivals_map_init() {
    return FestivalsMap::get_instance();
}

// Démarrage du plugin
festivals_map_init();

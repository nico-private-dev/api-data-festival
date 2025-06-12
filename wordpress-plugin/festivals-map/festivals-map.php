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
        
        // Ajout du nonce pour la sécurité des appels AJAX
        wp_localize_script('festivals-map-api', 'festivals_map_nonce', wp_create_nonce('festivals_map_nonce'));
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
                'max_festivals' => '8000',
                'show_filters' => 'true',
                'show_list' => 'true',
            ),
            $atts,
            'festivals_map'
        );

        // Passage des attributs au script JS
        wp_localize_script('festivals-map-app', 'festivalsMapOptions', array(
            'maxFestivals' => intval($atts['max_festivals']),
            'showFilters' => $atts['show_filters'] === 'true',
            'showList' => $atts['show_list'] === 'true',
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
        
        // Carte
        echo '<div class="map-container" style="height: ' . esc_attr($atts['height']) . '; width: ' . esc_attr($atts['width']) . ';">';
        echo '<div id="festivals-map" style="height: 100%; width: 100%;"></div>';
        echo '</div>';
        
        // Liste des festivals (conditionnelle)
        if ($atts['show_list'] === 'true') {
            echo '<div class="festival-list">';
            echo '<h2>Liste des festivals</h2>';
            echo '<div id="festivals-container"></div>';
            echo '</div>';
        }
        
        // Détails du festival
        echo '<div class="festival-details" id="festival-details">';
        echo '<button class="close-button" id="close-details">×</button>';
        echo '<div id="festival-details-content"></div>';
        echo '</div>';
        
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

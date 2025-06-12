<?php
// Si ce fichier est appelé directement, on sort
if (!defined('ABSPATH')) {
    exit;
}

// Récupération des options
$options = get_option('festivals_map_options', array(
    'max_festivals' => 8000,
    'default_height' => '500px',
    'default_width' => '100%',
    'show_filters' => true,
    'show_list' => true,
));

// Traitement du formulaire
if (isset($_POST['festivals_map_save_options']) && check_admin_referer('festivals_map_options')) {
    $options['max_festivals'] = intval($_POST['max_festivals']);
    $options['default_height'] = sanitize_text_field($_POST['default_height']);
    $options['default_width'] = sanitize_text_field($_POST['default_width']);
    $options['show_filters'] = isset($_POST['show_filters']);
    $options['show_list'] = isset($_POST['show_list']);
    
    update_option('festivals_map_options', $options);
    echo '<div class="notice notice-success is-dismissible"><p>' . __('Options enregistrées avec succès.', 'festivals-map') . '</p></div>';
}
?>

<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <div class="festivals-map-admin-container">
        <div class="festivals-map-admin-main">
            <div class="festivals-map-admin-card">
                <h2><?php _e('Configuration de la carte', 'festivals-map'); ?></h2>
                
                <form method="post" action="">
                    <?php wp_nonce_field('festivals_map_options'); ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="max_festivals"><?php _e('Nombre maximum de festivals', 'festivals-map'); ?></label>
                            </th>
                            <td>
                                <input type="number" id="max_festivals" name="max_festivals" value="<?php echo esc_attr($options['max_festivals']); ?>" min="100" max="10000" step="100" />
                                <p class="description"><?php _e('Nombre maximum de festivals à charger depuis l\'API (entre 100 et 10000).', 'festivals-map'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <label for="default_height"><?php _e('Hauteur par défaut', 'festivals-map'); ?></label>
                            </th>
                            <td>
                                <input type="text" id="default_height" name="default_height" value="<?php echo esc_attr($options['default_height']); ?>" />
                                <p class="description"><?php _e('Hauteur par défaut de la carte (ex: 500px, 70vh).', 'festivals-map'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <label for="default_width"><?php _e('Largeur par défaut', 'festivals-map'); ?></label>
                            </th>
                            <td>
                                <input type="text" id="default_width" name="default_width" value="<?php echo esc_attr($options['default_width']); ?>" />
                                <p class="description"><?php _e('Largeur par défaut de la carte (ex: 100%, 800px).', 'festivals-map'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <?php _e('Afficher les filtres', 'festivals-map'); ?>
                            </th>
                            <td>
                                <label for="show_filters">
                                    <input type="checkbox" id="show_filters" name="show_filters" <?php checked($options['show_filters']); ?> />
                                    <?php _e('Afficher les filtres de recherche par défaut', 'festivals-map'); ?>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <?php _e('Afficher la liste', 'festivals-map'); ?>
                            </th>
                            <td>
                                <label for="show_list">
                                    <input type="checkbox" id="show_list" name="show_list" <?php checked($options['show_list']); ?> />
                                    <?php _e('Afficher la liste des festivals par défaut', 'festivals-map'); ?>
                                </label>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <input type="submit" name="festivals_map_save_options" class="button button-primary" value="<?php _e('Enregistrer les modifications', 'festivals-map'); ?>" />
                    </p>
                </form>
            </div>
            
            <div class="festivals-map-admin-card">
                <h2><?php _e('Utilisation', 'festivals-map'); ?></h2>
                <p><?php _e('Pour afficher la carte des festivals sur votre site, utilisez le shortcode suivant :', 'festivals-map'); ?></p>
                <code>[festivals_map]</code>
                
                <h3><?php _e('Options du shortcode', 'festivals-map'); ?></h3>
                <ul>
                    <li><code>height</code> - <?php _e('Hauteur de la carte (ex: 500px, 70vh)', 'festivals-map'); ?></li>
                    <li><code>width</code> - <?php _e('Largeur de la carte (ex: 100%, 800px)', 'festivals-map'); ?></li>
                    <li><code>max_festivals</code> - <?php _e('Nombre maximum de festivals à charger', 'festivals-map'); ?></li>
                    <li><code>show_filters</code> - <?php _e('Afficher les filtres (true/false)', 'festivals-map'); ?></li>
                    <li><code>show_list</code> - <?php _e('Afficher la liste des festivals (true/false)', 'festivals-map'); ?></li>
                </ul>
                
                <h3><?php _e('Exemple', 'festivals-map'); ?></h3>
                <code>[festivals_map height="600px" width="100%" max_festivals="5000" show_filters="true" show_list="false"]</code>
            </div>
        </div>
        
        <div class="festivals-map-admin-sidebar">
            <div class="festivals-map-admin-card">
                <h3><?php _e('À propos', 'festivals-map'); ?></h3>
                <p><?php _e('Ce plugin affiche une carte interactive des festivals de musique en France, basée sur les données ouvertes du Ministère de la Culture.', 'festivals-map'); ?></p>
                <p><?php _e('Version', 'festivals-map'); ?>: <?php echo FESTIVALS_MAP_VERSION; ?></p>
            </div>
            
            <div class="festivals-map-admin-card">
                <h3><?php _e('Besoin d\'aide ?', 'festivals-map'); ?></h3>
                <p><?php _e('Si vous avez des questions ou rencontrez des problèmes avec ce plugin, n\'hésitez pas à nous contacter.', 'festivals-map'); ?></p>
                <a href="mailto:support@votre-site.com" class="button"><?php _e('Contacter le support', 'festivals-map'); ?></a>
            </div>
        </div>
    </div>
</div>

<style>
.festivals-map-admin-container {
    display: flex;
    flex-wrap: wrap;
    margin-top: 20px;
}

.festivals-map-admin-main {
    flex: 1;
    min-width: 600px;
    margin-right: 20px;
}

.festivals-map-admin-sidebar {
    width: 300px;
}

.festivals-map-admin-card {
    background: #fff;
    border: 1px solid #ccd0d4;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.04);
    margin-bottom: 20px;
    padding: 15px;
}

.festivals-map-admin-card h2 {
    margin-top: 0;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
}

@media screen and (max-width: 960px) {
    .festivals-map-admin-container {
        flex-direction: column;
    }
    
    .festivals-map-admin-main {
        margin-right: 0;
        min-width: auto;
    }
    
    .festivals-map-admin-sidebar {
        width: 100%;
    }
}
</style>

<?php
/**
 * Enregistrement des Custom Post Types
 *
 * @package FestivalsMap
 */

// Si ce fichier est appelé directement, on sort
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enregistre le Custom Post Type 'festival'
 */
function festivals_map_register_post_types() {
    $labels = array(
        'name'               => _x('Festivals', 'nom général', 'festivals-map'),
        'singular_name'      => _x('Festival', 'nom singulier', 'festivals-map'),
        'menu_name'          => __('Festivals', 'festivals-map'),
        'name_admin_bar'     => __('Festival', 'festivals-map'),
        'add_new'            => __('Ajouter', 'festivals-map'),
        'add_new_item'       => __('Ajouter un festival', 'festivals-map'),
        'new_item'           => __('Nouveau festival', 'festivals-map'),
        'edit_item'          => __('Modifier le festival', 'festivals-map'),
        'view_item'          => __('Voir le festival', 'festivals-map'),
        'all_items'          => __('Tous les festivals', 'festivals-map'),
        'search_items'       => __('Rechercher des festivals', 'festivals-map'),
        'parent_item_colon'  => __('Festival parent:', 'festivals-map'),
        'not_found'          => __('Aucun festival trouvé.', 'festivals-map'),
        'not_found_in_trash' => __('Aucun festival trouvé dans la corbeille.', 'festivals-map')
    );

    $args = array(
        'labels'             => $labels,
        'description'        => __('Festivals de musique en France', 'festivals-map'),
        'public'             => true,
        'publicly_queryable' => true,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'query_var'          => true,
        'rewrite'            => array('slug' => 'festival'),
        'capability_type'    => 'post',
        'has_archive'        => true,
        'hierarchical'       => false,
        'menu_position'      => 5,
        'menu_icon'          => 'dashicons-tickets-alt',
        'supports'           => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
        'show_in_rest'       => true, // Activer l'éditeur Gutenberg
    );

    register_post_type('festival', $args);
}
add_action('init', 'festivals_map_register_post_types');
